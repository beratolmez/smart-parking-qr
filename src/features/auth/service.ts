import bcrypt from "bcryptjs";
import { logger } from "@/core/logger";
import { ValidationError } from "@/core/errors";
import * as repository from "@/features/auth/repository";
import type { User } from "@/generated/prisma/client";

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function authenticate(username: string, password: string): Promise<User> {
  logger.info("auth.login.started", { username });
  const user = await repository.getUserByUsername(username);
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    logger.warn("auth.login.failed", { username });
    throw new ValidationError("Kullanıcı adı veya şifre hatalı.");
  }
  logger.info("auth.login.success", { userId: user.id });
  return user;
}
