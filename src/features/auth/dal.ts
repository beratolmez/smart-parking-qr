import "server-only";
import { cache } from "react";
import { redirect, forbidden } from "next/navigation";
import * as repository from "@/features/auth/repository";
import { SESSION_COOKIE, verifySessionToken } from "@/features/auth/session";
import { cookies } from "next/headers";
import type { Role, User } from "@/generated/prisma/client";

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return repository.getUserById(payload.userId);
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

export async function requireRole(role: Role): Promise<User> {
  const user = await requireUser();
  if (user.role !== role) forbidden();
  return user;
}
