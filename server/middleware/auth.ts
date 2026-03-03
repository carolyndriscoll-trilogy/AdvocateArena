import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import type { AuthContext, UserRole } from "@shared/types";

declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

function buildAuthContext(user: { id: string; role?: string | null }): AuthContext {
  const role = (user.role as UserRole) || "user";
  return {
    userId: user.id,
    role,
    isAdmin: role === "admin",
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.authContext = buildAuthContext(session.user as any);
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const authContext = buildAuthContext(session.user as any);
    if (!authContext.isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    req.authContext = authContext;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}
