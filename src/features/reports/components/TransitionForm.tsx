"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ReportStatus } from "@/generated/prisma/client";
import { ALLOWED_TRANSITIONS, REPORT_STATUS_LABELS } from "@/features/reports/constants";
import { transitionReportAction } from "@/features/reports/actions";
import type { ActionState } from "@/shared/types";

const INITIAL_STATE: ActionState = { ok: false };

export interface TransitionFormProps {
  reportId: string;
  status: ReportStatus;
  canReject: boolean;
  assetCode: string;
}

export function TransitionForm({ reportId, status, canReject, assetCode }: TransitionFormProps) {
  const [state, formAction, pending] = useActionState(transitionReportAction, INITIAL_STATE);
  const errors = state.fieldErrors ?? {};

  const targets = ALLOWED_TRANSITIONS[status].filter((s) => s !== "REDDEDILDI" || canReject);
  if (targets.length === 0) return null;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Durum Güncelle</h2>

      <input type="hidden" name="reportId" value={reportId} />

      <div className="flex flex-col gap-1">
        <label htmlFor="toStatus" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Yeni durum
        </label>
        <select
          id="toStatus"
          name="toStatus"
          defaultValue={targets[0]}
          className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          {targets.map((target) => (
            <option key={target} value={target}>
              {REPORT_STATUS_LABELS[target]}
            </option>
          ))}
        </select>
        {errors.toStatus && <p className="text-sm text-red-600">{errors.toStatus[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Not <span className="font-normal text-zinc-500">(isteğe bağlı)</span>
        </label>
        <textarea
          id="note"
          name="note"
          maxLength={500}
          placeholder="Yapılan işlemi kısaca açıklayın"
          className="min-h-24 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {errors.note && <p className="text-sm text-red-600">{errors.note[0]}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="photo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Fotoğraf <span className="font-normal text-zinc-500">(isteğe bağlı)</span>
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
        <p
          role="status"
          aria-live="polite"
          className={state.ok ? "text-sm text-green-700 dark:text-green-500" : "text-sm text-red-600"}
        >
          {state.message}
        </p>
      )}

      {state.ok && (
        <Link
          href={`/q/${assetCode}`}
          className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
        >
          QR sayfasını görüntüle
        </Link>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Kaydediliyor…" : "Güncelle"}
      </button>
    </form>
  );
}
