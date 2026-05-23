import cors from "cors";
import type { Express, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ENV } from "./env";

function isAllowedOrigin(origin: string) {
  if (
    !ENV.isProduction &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  ) {
    return true;
  }
  if (ENV.cors.origins.length === 0) return false;
  return ENV.cors.origins.includes(origin);
}

export function registerHealthRoute(app: Express) {
  app.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "quick-quartz",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });
}

export function registerSecurityMiddleware(app: Express) {
  app.use(
    helmet({
      // The app currently loads Google Fonts and Vite-managed assets. Keep CSP
      // explicit as a follow-up once all external assets are self-hosted.
      contentSecurityPolicy: false,
      hsts: ENV.isProduction
        ? { maxAge: 15552000, includeSubDomains: true }
        : false,
    }),
  );

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin is not allowed by CORS"));
      },
    }),
  );

  app.use((req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      next();
      return;
    }

    const origin = req.headers.origin;
    if (!origin || isAllowedOrigin(origin)) {
      next();
      return;
    }

    res.status(403).json({ error: "Origin is not allowed" });
  });
}

export function registerRateLimits(app: Express) {
  const globalLimiter = rateLimit({
    windowMs: ENV.rateLimit.windowMs,
    limit: ENV.rateLimit.max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: ENV.rateLimit.windowMs,
    limit: ENV.rateLimit.authMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  app.use("/api", globalLimiter);
  app.use("/api/trpc/auth.login", authLimiter);
  app.use("/api/trpc/auth.register", authLimiter);
}

export function registerRequestLogger(app: Express) {
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      if (req.path === "/health") return;
      const log = {
        level: res.statusCode >= 500 ? "error" : "info",
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      };
      console.log(JSON.stringify(log));
    });
    next();
  });
}

export function registerErrorHandler(app: Express) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    console.error("[HTTP] Unhandled error", err);
    res.status(500).json({ error: "Internal server error" });
  });
}
