'use client';

import { DefaultChatTransport, type LanguageModelUsage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import {
  fetcher,
  fetchWithErrorHandlers,
  generateUUID,
  getTextFromMessage,
} from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { CookieUser } from '@/lib/auth/types';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  user,
  autoResume,
  initialLastContext,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  user: CookieUser | null;
  autoResume: boolean;
  initialLastContext?: LanguageModelUsage;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');
  const [usage, setUsage] = useState<LanguageModelUsage | undefined>(
    initialLastContext,
  );
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        // Sanitize messages before sending to API: only allow text/file parts
        const sanitize = (m: ChatMessage) => ({
          id: m.id,
          role: m.role,
          parts: (m.parts || [])
            .filter(
              (p: any) =>
                (p.type === 'text' &&
                  typeof p.text === 'string' &&
                  p.text.trim().length > 0) ||
                (p.type === 'file' &&
                  p.url &&
                  (p.name || (p as any).filename) &&
                  p.mediaType),
            )
            .map((p: any) =>
              p.type === 'text'
                ? { type: 'text', text: p.text }
                : {
                    type: 'file',
                    url: p.url,
                    name: p.name ?? (p as any).filename,
                    mediaType: p.mediaType,
                  },
            ),
        });

        const last = messages.at(-1) as ChatMessage | undefined;
        const lastUser = [...messages]
          .reverse()
          .find((m: any) => m.role === 'user') as ChatMessage | undefined;
        const computedMessage = (body as any)?.message
          ? sanitize((body as any).message)
          : last && last.role === 'user'
            ? sanitize(last)
            : lastUser
              ? sanitize(lastUser)
              : undefined;

        return {
          body: {
            id,
            message: computedMessage,
            selectedChatModel: initialChatModel,
            selectedVisibilityType: visibilityType,
            // For non-authenticated users, send full prior messages to preserve context server-side
            ...(!user
              ? { previousMessages: messages.slice(0, -1).map(sanitize) }
              : {}),
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === 'data-usage') {
        setUsage(dataPart.data);
      }
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        // Check if it's a credit card error
        if (
          error.message?.includes('AI Gateway requires a valid credit card')
        ) {
          setShowCreditCardAlert(true);
        } else {
          toast({
            type: 'error',
            description: error.message,
          });
        }
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: 'user' as const,
        parts: [{ type: 'text', text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    user && messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  // Guest/unauthenticated: hydrate messages from local storage and persist on change
  useEffect(() => {
    // 在访客模式下（没有用户或用户类型为guest）从本地存储加载消息
    if (user && user.type === 'authenticated') return;
    try {
      const { getGuestMessages } = require('@/lib/guest-storage');
      const saved = getGuestMessages(id);
      if (saved && saved.length > 0) {
        setMessages(saved);
      }
    } catch {}
  }, [id, setMessages, user]);

  useEffect(() => {
    // 在访客模式下（没有用户或用户类型为guest）保存到本地存储
    console.log('💾 Save effect triggered:', {
      user,
      userType: user?.type,
      messagesLength: messages.length,
    });
    if (user && user.type === 'authenticated') {
      console.log('❌ Skipping save - authenticated user');
      return;
    }
    console.log('✅ Saving to localStorage as guest');
    try {
      const {
        setGuestMessages,
        upsertGuestChat,
      } = require('@/lib/guest-storage');
      setGuestMessages(id, messages);
      console.log('💾 Messages saved to localStorage');
      // Ensure chat summary exists based on first user message
      if (messages.length > 0) {
        const firstUser = messages.find((m) => m.role === 'user');
        const title = firstUser
          ? getTextFromMessage(firstUser).slice(0, 60) || 'New Chat'
          : 'New Chat';
        const chatData = {
          id,
          createdAt: new Date().toISOString() as any,
          title,
          userId: 'guest' as any,
          visibility: visibilityType,
          lastContext: usage as any,
        };
        console.log('💾 Upserting chat:', chatData);
        upsertGuestChat(chatData as any);
        console.log('✅ Chat upserted to localStorage');
      }
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }, [id, messages, user, usage, visibilityType]);

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader
          chatId={id}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          user={user}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
          selectedModelId={initialChatModel}
        />

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
              selectedModelId={initialChatModel}
              usage={usage}
            />
          )}
        </div>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
        selectedModelId={initialChatModel}
      />

      <AlertDialog
        open={showCreditCardAlert}
        onOpenChange={setShowCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{' '}
              {process.env.NODE_ENV === 'production' ? 'the owner' : 'you'} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  'https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card',
                  '_blank',
                );
                window.location.href = '/';
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
