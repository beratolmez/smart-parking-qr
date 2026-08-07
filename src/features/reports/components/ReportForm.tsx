"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ISSUE_TYPE_LABELS, ISSUE_TYPES } from "@/features/reports/constants";

export interface ReportFormProps {
  assetCode: string;
  parkName: string;
  openReport: { ticketNo: number; duplicateCount: number } | null;
}

type FieldErrors = Record<string, string[] | undefined>;

interface SubmitResult {
  ok: boolean;
  ticketNo?: number;
  message?: string;
  fieldErrors?: FieldErrors;
}

const INITIAL_STATE: SubmitResult = { ok: false };

export function ReportForm({ assetCode, openReport }: ReportFormProps) {
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<SubmitResult>(INITIAL_STATE);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePhotoChange(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState(INITIAL_STATE);
    setPending(true);

    const formData = new FormData();
    formData.append("assetCode", assetCode);
    formData.append("issueType", issueType);
    if (description) formData.append("description", description);
    if (reporterPhone) formData.append("reporterPhone", reporterPhone);
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch("/api/public/reports", { method: "POST", body: formData });
      const body = (await res.json()) as SubmitResult & { error?: string; detail?: string };

      if (res.status === 422) {
        setState({ ok: false, fieldErrors: body.fieldErrors ?? {} });
        return;
      }
      if (res.status === 200 || res.status === 201) {
        setState({ ok: true, ticketNo: body.ticketNo, message: body.message });
        return;
      }
      setState({ ok: false, message: body.detail ?? "Bir hata oluştu. Lütfen tekrar deneyin." });
    } catch {
      setState({ ok: false, message: "Ağ hatası. Lütfen tekrar deneyin." });
    } finally {
      setPending(false);
    }
  }

  if (state.ok) {
    return (
      <section
        className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950"
        role="status"
        aria-live="polite"
      >
        <p className="text-2xl font-semibold text-green-900 dark:text-green-50">
          #{state.ticketNo}
        </p>
        <p className="mt-2 text-sm text-green-800 dark:text-green-200">{state.message}</p>
        <p className="mt-1 text-sm text-green-700 dark:text-green-300">
          Takip numaranızı kaydedin; bildiriminizin durumunu bu numara ile sorgulayabilirsiniz.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Başka bir sorun bildir
        </button>
      </section>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-4">
      {openReport && (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          role="status"
          aria-live="polite"
        >
          Bu demirbaşta açık bildirim var (#{openReport.ticketNo} ·{" "}
          {openReport.duplicateCount > 1
            ? `${openReport.duplicateCount} kişi bildirdi`
            : "1 kişi bildirdi"}
          ). Yeniden bildirirseniz aynı kayda eklenecektir.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset>
          <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sorun türü
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {ISSUE_TYPES.map((type) => (
              <label
                key={type}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm text-center ${
                  issueType === type
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="issueType"
                  value={type}
                  checked={issueType === type}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="sr-only"
                />
                {ISSUE_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
          {errors.issueType && <p className="mt-1 text-sm text-red-600">{errors.issueType[0]}</p>}
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Açıklama <span className="font-normal text-zinc-500">(isteğe bağlı)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Sorunu kısaca açıklayın"
            className="min-h-24 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="reporterPhone" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Telefon <span className="font-normal text-zinc-500">(isteğe bağlı)</span>
          </label>
          <input
            id="reporterPhone"
            type="tel"
            inputMode="tel"
            value={reporterPhone}
            onChange={(e) => setReporterPhone(e.target.value)}
            placeholder="05XX XXX XX XX"
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Yalnızca bu bildirimin sonucuyla ilgili sizi bilgilendirmek için kullanılır.
          </p>
          {errors.reporterPhone && (
            <p className="text-sm text-red-600">{errors.reporterPhone[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="photo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fotoğraf <span className="text-red-600">*</span>
          </label>
          <input
            ref={photoInputRef}
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:text-white dark:border-zinc-700 dark:bg-zinc-950 dark:file:bg-zinc-50 dark:file:text-zinc-900"
          />
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Seçilen fotoğraf önizlemesi"
              className="mt-2 max-h-48 rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
            />
          )}
          {errors.photo && <p className="text-sm text-red-600">{errors.photo[0]}</p>}
        </div>

        {state.message && (
          <p role="status" aria-live="polite" className="text-sm text-red-600">
            {state.message}
          </p>
        )}

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Fotoğraf ve isteğe bağlı telefon bilginiz yalnızca bu bildirim için kullanılır.{" "}
          <Link href="/kvkk" className="underline">
            Aydınlatma metni için tıklayın.
          </Link>
        </p>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Gönderiliyor…" : "Bildir"}
        </button>
      </form>
    </div>
  );
}
