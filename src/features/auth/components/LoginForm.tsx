"use client";

import { useActionState } from "react";
import { loginAction } from "@/features/auth/actions";
import type { ActionState } from "@/shared/types";

const INITIAL_STATE: ActionState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Kullanıcı adı
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {errors.username && <p className="text-sm text-red-600">{errors.username[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Şifre
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {errors.password && <p className="text-sm text-red-600">{errors.password[0]}</p>}
      </div>

      {state.message && (
        <p
          role="status"
          aria-live="polite"
          className={state.ok ? "text-sm text-green-700 dark:text-green-500" : "text-sm text-red-600"}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
