import { ReactNode } from 'react';

/**
 * Auth is disabled for now. Renders children directly.
 * Re-enable BetterAuth later by restoring session check + redirect.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
