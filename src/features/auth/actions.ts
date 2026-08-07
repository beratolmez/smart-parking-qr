"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AppError } from "@/core/errors";
import { loginSchema } from "@/features/auth/schemas";
import * as authService from "@/features/auth/service";
import { createSession, destroySession } from "@/features/auth/session";
import type { ActionState } from "@/shared/types";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    const user = await authService.authenticate(parsed.data.username, parsed.data.password);
    await createSession(user);
    redirect("/panel");
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message };
    throw e;
  }
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/giris");
}
