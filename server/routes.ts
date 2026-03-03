import { type Server } from "http";
import { type Express } from "express";
import { errorHandler } from "./middleware/error-handler";
import { defensesRouter } from "./routes/defenses";
import { guideRouter } from "./routes/guide";
import { gauntletRouter } from "./routes/gauntlet";
import { adminRouter, normingReadRouter } from "./routes/admin";

export async function registerRoutes(server: Server, app: Express) {
  // Domain routers
  app.use(defensesRouter);
  app.use(guideRouter);
  app.use(gauntletRouter);
  app.use(adminRouter);
  app.use(normingReadRouter);

  // Global error handler (must be after all routes)
  app.use(errorHandler);
}
