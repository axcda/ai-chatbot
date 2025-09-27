import { createClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';
import { getChatsByUserId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get('limit') || '10');
  const startingAfter = searchParams.get('starting_after');
  const endingBefore = searchParams.get('ending_before');

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      'bad_request:api',
      'Only one of starting_after or ending_before can be provided.',
    ).toResponse();
  }

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
  } catch (error) {
    console.warn('Supabase client initialization failed in history API.', error);
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
    console.warn('Supabase getUser failed in history API.', error);
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  if (!user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chats = await getChatsByUserId({
    id: user.id,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
}
