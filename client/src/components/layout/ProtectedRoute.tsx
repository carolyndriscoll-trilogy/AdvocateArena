import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ['/api/auth/get-session'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground font-serif">Loading...</div>
      </div>
    );
  }

  if (!user || error) {
    setLocation('/login');
    return null;
  }

  return <>{children}</>;
}
