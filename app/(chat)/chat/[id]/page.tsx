import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { convertToUIMessages } from '@/lib/utils';
import type { CookieUser } from '@/lib/auth/types';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('chat:user');
  const user = userCookie ? (JSON.parse(userCookie.value) as CookieUser) : null;

  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  if (chat.visibility === 'private') {
    if (!user) {
      return notFound();
    }

    if (chat.userId && user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);
  const chatModelFromCookie = cookieStore.get('chat-model');

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          id={chat.id}
          initialMessages={uiMessages}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialVisibilityType={chat.visibility}
          isReadonly={user?.id !== chat.userId}
          user={user}
          autoResume={true}
          initialLastContext={chat.lastContext ?? undefined}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={uiMessages}
        initialChatModel={chatModelFromCookie.value}
        initialVisibilityType={chat.visibility}
        isReadonly={user?.id !== chat.userId}
        user={user}
        autoResume={true}
        initialLastContext={chat.lastContext ?? undefined}
      />
      <DataStreamHandler />
    </>
  );
}
