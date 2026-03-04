/**
 * Auth is disabled for now. Returns a hardcoded dev user.
 * Re-enable BetterAuth later by restoring session query.
 */
export function useAuth() {
  return {
    user: {
      id: "dev-user-1",
      name: "Dev User",
      email: "dev@example.com",
      role: "guide",
    },
    isLoading: false,
    isAuthenticated: true,
    isGuide: true,
    isAdmin: true,
  };
}
