import { prisma } from "@/core/db";
import type { User } from "@/generated/prisma/client";

export async function getUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { username } });
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}
