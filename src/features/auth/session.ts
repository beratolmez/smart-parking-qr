import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { config } from "@/core/config";
import type { Role, User } from "@/generated/prisma/client";

export const SESSION_COOKIE = "session";
const SESSION_TTL = "7d";

const encodedKey = new TextEncoder().encode(config.SESSION_SECRET);

export interface SessionPayload {
  userId: string;
  role: Role;
  [propName: string]: unknown;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(encodedKey);
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token ?? "", encodedKey, { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId, role: payload.role as Role };
  } catch {
    return null;
  }
}

export async function createSession(user: User): Promise<void> {
  const token = await createSessionToken({ userId: user.id, role: user.role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
