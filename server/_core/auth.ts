import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import type { InsertUser, User } from "../../drizzle/schema";
import {
  countUsers,
  createLocalUser,
  getUserByEmail,
  getUserById,
  updateUserLastSignedIn,
} from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";

export type AuthenticatedUser = Omit<User, "passwordHash">;

type SessionPayload = {
  sub: string;
  email: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function toPublicUser(user: User): AuthenticatedUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

function getSecretKey() {
  if (!ENV.auth.jwtSecret || ENV.auth.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(ENV.auth.jwtSecret);
}

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) return new Map<string, string>();
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

async function createSessionToken(user: AuthenticatedUser) {
  const now = Date.now();
  const expiresAt = Math.floor((now + ENV.auth.sessionTtlDays * DAY_MS) / 1000);
  const payload: SessionPayload = {
    sub: String(user.id),
    email: user.email ?? "",
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());
}

export async function setSessionCookie(
  req: Request,
  res: Response,
  user: AuthenticatedUser,
) {
  const token = await createSessionToken(user);
  const maxAge = ENV.auth.sessionTtlDays * DAY_MS;
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge });
}

async function verifySession(cookieValue: string | undefined) {
  if (!cookieValue) return null;

  try {
    const { payload } = await jwtVerify(cookieValue, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub || !/^\d+$/.test(sub)) return null;
    return { userId: Number(sub) };
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request) {
  const cookies = parseCookies(req.headers.cookie);
  const session = await verifySession(cookies.get(COOKIE_NAME));
  if (!session) return null;

  const user = await getUserById(session.userId);
  return user ? toPublicUser(user) : null;
}

function resolveNewUserRole(email: string, existingUserCount: number): User["role"] {
  if (ENV.auth.adminEmails.includes(email)) return "admin";
  if (existingUserCount === 0 && ENV.auth.allowFirstUserAdmin) return "admin";
  return "user";
}

export async function registerWithPassword(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "An account with this email already exists",
    });
  }

  const existingUserCount = await countUsers();
  const role = resolveNewUserRole(email, existingUserCount);
  const canRegister =
    ENV.auth.allowSignups ||
    ENV.auth.adminEmails.includes(email) ||
    (existingUserCount === 0 && ENV.auth.allowFirstUserAdmin);

  if (!canRegister) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Signups are disabled for this deployment",
    });
  }

  const passwordHash = await hashPassword(input.password);
  const userData: InsertUser = {
    openId: `email:${email}`,
    name: input.name.trim(),
    email,
    passwordHash,
    loginMethod: "password",
    role,
    lastSignedIn: new Date(),
  };

  const user = await createLocalUser(userData);
  return toPublicUser(user);
}

function invalidCredentials(): never {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Invalid email or password",
  });
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const user = await getUserByEmail(email);
  if (!user?.passwordHash) invalidCredentials();

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) invalidCredentials();

  await updateUserLastSignedIn(user.id, new Date());
  return toPublicUser({ ...user, lastSignedIn: new Date() });
}
