import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  type LanguageModelUsage,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { createClient } from '@/lib/supabase/server';
import type { UserType } from '@/lib/auth/types';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  ensureUserRecord,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { updateChatLastContextById } from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { getLanguageModel } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    let supabase: Awaited<ReturnType<typeof createClient>> | null = null; // Supabase client may be unavailable during local development
    try {
      supabase = await createClient();
    } catch (clientError) {
      console.warn('Supabase client initialization failed in chat POST.', clientError);
    }

    let authenticatedUser: { id: string; email?: string | null } | null = null;

    if (supabase) {
      const {
        data: { user: supabaseUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.warn('Supabase getUser failed in chat POST.', authError);
      }

      if (supabaseUser) {
        authenticatedUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
        };
      }
    }

    const userType: UserType = authenticatedUser ? 'authenticated' : 'unauthenticated';

    // Guest sessions: skip all database reads/writes and rely on client context
    if (userType === 'unauthenticated') {
      const uiMessages = [...(requestBody.previousMessages ?? []), message];

      const { longitude, latitude, city, country } = geolocation(request);

      const requestHints: RequestHints = {
        longitude,
        latitude,
        city,
        country,
      };

      let finalUsage: LanguageModelUsage | undefined;
      const streamId = generateUUID();

      const isDash = selectedChatModel.startsWith('dash:');
      const activeToolsGuest: 'getWeather'[] | undefined = isDash
        ? undefined
        : selectedChatModel === 'chat-model-reasoning'
          ? undefined
          : ['getWeather'];

      const stream = createUIMessageStream({
        execute: ({ writer: dataStream }) => {
          const result = streamText({
            model: getLanguageModel(selectedChatModel),
            system: systemPrompt({ selectedChatModel, requestHints }),
            messages: convertToModelMessages(uiMessages),
            stopWhen: stepCountIs(5),
            experimental_activeTools: activeToolsGuest,
            experimental_transform: smoothStream({ chunking: 'word' }),
            ...(isDash
              ? {}
              : {
                  tools: {
                    getWeather,
                  },
                }),
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: 'stream-text',
            },
            onFinish: ({ usage }) => {
              finalUsage = usage;
              dataStream.write({ type: 'data-usage', data: usage });
            },
          });

          result.consumeStream();

          dataStream.merge(
            result.toUIMessageStream({
              sendReasoning: true,
            }),
          );
        },
        generateId: generateUUID,
        onFinish: async () => {
          // No persistence for guest in API; client persists locally
        },
        onError: () => {
          return 'Oops, an error occurred!';
        },
      });

      const streamContext = getStreamContext();

      if (streamContext) {
        return new Response(
          await streamContext.resumableStream(streamId, () =>
            stream.pipeThrough(new JsonToSseTransformStream()),
          ),
        );
      } else {
        return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
      }
    }

    if (!authenticatedUser) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    await ensureUserRecord({
      id: authenticatedUser.id,
      email: authenticatedUser.email,
    });

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    const messageCount = await getMessageCountByUserId({
      id: authenticatedUser.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const existingChat = await getChatById({ id });

    if (existingChat) {
      if (existingChat.userId !== authenticatedUser.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: authenticatedUser.id,
        title,
        visibility: selectedVisibilityType,
      });
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalUsage: LanguageModelUsage | undefined;

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            getWeather,
            createDocument: createDocument({
              dataStream,
              userId: authenticatedUser.id,
              userEmail: authenticatedUser.email,
            }),
            updateDocument: updateDocument({
              dataStream,
              userId: authenticatedUser.id,
              userEmail: authenticatedUser.email,
            }),
            requestSuggestions: requestSuggestions({
              dataStream,
              userId: authenticatedUser.id,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
          onFinish: ({ usage }) => {
            finalUsage = usage;
            dataStream.write({ type: 'data-usage', data: usage });
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalUsage,
            });
          } catch (persistError) {
            console.warn('Unable to persist last usage for chat', id, persistError);
          }
        }
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        'AI Gateway requires a valid credit card on file to service requests',
      )
    ) {
      return new ChatSDKError('bad_request:activate_gateway').toResponse();
    }

    console.error('Unhandled error in chat API:', error);
    return new ChatSDKError('offline:chat').toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

    let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
  } catch (clientError) {
    console.warn('Supabase client initialization failed in chat DELETE.', clientError);
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  if (!supabase) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn('Supabase getUser failed in chat DELETE.', error);
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  if (!user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.userId !== user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
