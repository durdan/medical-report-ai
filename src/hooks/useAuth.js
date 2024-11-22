'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth(requireAdmin = false) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoading = status === 'loading';
  const isAuthenticated = !!session;
  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/signin');
      } else if (requireAdmin && !isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, requireAdmin, router]);

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
    isAdmin,
    user: session?.user
  };
}
