"use client";

import { useActionState } from "react";
import { transitionReportAction } from "@/features/reports/actions";
import type { ActionState } from "@/shared/types";

const INITIAL_STATE: ActionState = { ok: false };

export interface CloseReportFormProps {
  reportId: string;
  ticketNo: number;
}

export function CloseReportForm({ reportId, ticketNo }: CloseReportFormProps) {
  const [state, formAction, pending] = useActionState(transitionReportAction, INITIAL_STATE);
  const errors = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <section
        className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950"
        role="status"
        aria-live="polite"
      >
        <p className="text-lg font-semibold text-green-900 dark:text-green-50">
          #{ticketNo} numaralı bildirim kapatıldı
        </p>
        <p className="mt-1 text-sm text-green-800 dark:text-green-200">
          Demirbaş aktif duruma döndü.
        </p>
      </section>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="toStatus" value="ONARILDI" />

      <div
        className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
        role="status"
        aria-live="polite"
      >
        Açık bildirim: <span className="font-semibold">#{ticketNo}</span> — Onarıldı olarak kapatın.
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Yapılan işlem <span className="font-normal text-zinc-500">(isteğe bağlı)</span>
        </label>
        <textarea
          id="note"
          name="note"
          maxLength={500}
          placeholder="Örn. kaynak yapıldı, boya yenilendi"
          className="min-h-24 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {errors.note && <p className="text-sm text-red-600">{errors.note[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="photo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Onarım fotoğrafı <span className="font-normal text-zinc-500">(isteğe bağlı)</span>
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:text-white dark:border-zinc-700 dark:bg-zinc-950 dark:file:bg-zinc-50 dark:file:text-zinc-900"
        />
        {errors.photo && <p className="text-sm text-red-600">{errors.photo[0]}</p>}
      </div>

      {state.message && (
        <p role="status" aria-live="polite" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-green-700 px-5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-500"
      >
        {pending ? "Kaydediliyor…" : "Onarıldı Olarak Kapat"}
      </button>
    </form>
  );
}
