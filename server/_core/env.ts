import { z } from "zod";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProduction = NODE_ENV === "production";
const isTest = NODE_ENV === "test";

const booleanFromEnv = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const numberFromEnv = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const csvFromEnv = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const sameSiteSchema = z.enum(["lax", "strict", "none"]);

const defaultJwtSecret = isTest
  ? "test-jwt-secret-for-vitest-only-please-do-not-use"
  : "";

export const ENV = {
  nodeEnv: NODE_ENV,
  isProduction,
  port: numberFromEnv(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  bodyLimit: process.env.BODY_LIMIT ?? "1mb",
  trustProxy: process.env.TRUST_PROXY ?? "1",
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? defaultJwtSecret,
    sessionTtlDays: numberFromEnv(process.env.SESSION_TTL_DAYS, 7),
    allowSignups: booleanFromEnv(process.env.ALLOW_SIGNUPS, !isProduction),
    allowFirstUserAdmin: booleanFromEnv(
      process.env.ALLOW_FIRST_USER_ADMIN,
      !isProduction,
    ),
    adminEmails: csvFromEnv(process.env.ADMIN_EMAILS).map((email) =>
      email.toLowerCase(),
    ),
  },
  cookie: {
    secure: booleanFromEnv(process.env.COOKIE_SECURE, isProduction),
    sameSite: sameSiteSchema.catch("lax").parse(process.env.COOKIE_SAME_SITE),
  },
  cors: {
    origins: csvFromEnv(
      process.env.CORS_ORIGINS ??
        (isProduction
          ? ""
          : "http://localhost:3000,http://127.0.0.1:3000"),
    ),
  },
  rateLimit: {
    windowMs: numberFromEnv(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: numberFromEnv(process.env.RATE_LIMIT_MAX, 300),
    authMax: numberFromEnv(process.env.AUTH_RATE_LIMIT_MAX, 20),
  },
};

export function validateRuntimeEnv() {
  const issues: string[] = [];

  if (!ENV.databaseUrl) {
    issues.push("DATABASE_URL is required");
  }

  if (!ENV.auth.jwtSecret || ENV.auth.jwtSecret.length < 32) {
    issues.push("JWT_SECRET must be at least 32 characters");
  }

  if (ENV.isProduction && ENV.cookie.sameSite === "none" && !ENV.cookie.secure) {
    issues.push("COOKIE_SECURE must be true when COOKIE_SAME_SITE=none");
  }

  if (ENV.isProduction && ENV.auth.allowFirstUserAdmin) {
    issues.push("ALLOW_FIRST_USER_ADMIN must be false in production");
  }

  if (ENV.isProduction && ENV.auth.allowSignups) {
    issues.push("ALLOW_SIGNUPS should be false for the initial production deploy");
  }

  if (issues.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${issues.join("\n- ")}`);
  }
}
