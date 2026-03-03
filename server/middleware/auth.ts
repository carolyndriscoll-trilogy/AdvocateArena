import { Request, Response, NextFunction } from "express";
import type { AuthContext, UserRole } from "@shared/types";

declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

/**
 * Auth is disabled for now. All requests get a hardcoded dev user.
 * Re-enable BetterAuth later by restoring session checks.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  req.authContext = {
    userId: "dev-user-1",
    role: "guide",
    isAdmin: true,
  };
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.authContext?.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
}
