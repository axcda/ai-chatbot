import type { User } from '@supabase/supabase-js';

export type UserType = 'authenticated' | 'unauthenticated';

export interface AuthUser extends User {
  type: UserType;
}

export interface CookieUser {
  id: string;
  email?: string | null;
  type?: 'guest' | 'authenticated';
}

export function getUserType(user: User | null): UserType {
  return user ? 'authenticated' : 'unauthenticated';
}

export function toCookieUser(user: User | null): CookieUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    type: 'authenticated',
  };
}
