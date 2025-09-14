// Utilities for storing guest chats and messages in localStorage
// These functions are safe to call on the client only.

import type { Chat } from '@/lib/db/schema';
import type { ChatMessage } from '@/lib/types';

const CHATS_KEY = 'guest:chats';
const MESSAGES_KEY_PREFIX = 'guest:messages:';

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getGuestChats(): Array<Chat> {
  if (typeof window === 'undefined') return [] as any;
  return safeParse<Array<Chat>>(localStorage.getItem(CHATS_KEY), []);
}

function notify() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('guest-storage-updated'));
}

export function upsertGuestChat(chat: Chat) {
  if (typeof window === 'undefined') return;
  const existing = getGuestChats();
  const without = existing.filter((c) => c.id !== chat.id);
  localStorage.setItem(CHATS_KEY, JSON.stringify([chat, ...without]));
  notify();
}

export function removeGuestChat(chatId: string) {
  if (typeof window === 'undefined') return;
  const existing = getGuestChats();
  localStorage.setItem(
    CHATS_KEY,
    JSON.stringify(existing.filter((c) => c.id !== chatId)),
  );
  localStorage.removeItem(MESSAGES_KEY_PREFIX + chatId);
  notify();
}

export function getGuestMessages(chatId: string): Array<ChatMessage> {
  if (typeof window === 'undefined') return [];
  return safeParse<Array<ChatMessage>>(
    localStorage.getItem(MESSAGES_KEY_PREFIX + chatId),
    [],
  );
}

export function setGuestMessages(chatId: string, messages: Array<ChatMessage>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    MESSAGES_KEY_PREFIX + chatId,
    JSON.stringify(messages ?? []),
  );
  notify();
}
