import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Session {
  session: { id: string; userId: string };
  user: User;
}

export function useAuth() {
  const { data, isLoading } = useQuery<Session | null>({
    queryKey: ['/api/auth/get-session'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    isGuide: data?.user?.role === 'guide' || data?.user?.role === 'admin',
    isAdmin: data?.user?.role === 'admin',
  };
}
