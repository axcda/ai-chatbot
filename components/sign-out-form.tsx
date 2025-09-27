'use client';

import { useAuth } from '@/contexts/auth-context';

export const SignOutForm = () => {
  const { signOut } = useAuth();

  return (
    <button
      type="button"
      className="w-full px-1 py-0.5 text-left text-red-500"
      onClick={() => signOut()}
    >
      Sign out
    </button>
  );
};
