
import { getDocumentsById, getSuggestionsByDocumentId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

async function getAuthenticatedUser() {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
  } catch (error) {
    console.warn('Supabase client initialization failed in suggestions API.', error);
    throw new ChatSDKError('unauthorized:document');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.warn('Supabase getUser failed in suggestions API.', error);
    throw new ChatSDKError('unauthorized:document');
  }

  if (!user) {
    throw new ChatSDKError('unauthorized:document');
  }

  return user;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return new ChatSDKError(
      'bad_request:api',
      'Parameter documentId is required.',
    ).toResponse();
  }

  let user: Awaited<ReturnType<typeof getAuthenticatedUser>>;
  try {
    user = await getAuthenticatedUser();
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    throw error;
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  const documents = await getDocumentsById({ id: documentId });
  const document = documents.at(-1);

  if (!document) {
    return new ChatSDKError('not_found:document').toResponse();
  }

  if (document.userId !== user.id) {
    return new ChatSDKError('forbidden:document').toResponse();
  }

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  return Response.json(suggestions, { status: 200 });
}
