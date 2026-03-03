import { Request, Response, NextFunction } from "express";

export async function requireGuide(req: Request, res: Response, next: NextFunction) {
  if (!req.authContext) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.authContext.role !== "guide" && req.authContext.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Guide access required" });
  }

  next();
}
