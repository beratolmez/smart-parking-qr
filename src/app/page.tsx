import Link from "next/link";
import { CodeLookupForm } from "@/features/reports/components/CodeLookupForm";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        ParkTakip
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Park demirbaşlarının dijital envanteri ve QR etiket yönetimi.
      </p>

      <section className="flex w-full max-w-lg flex-col items-center gap-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Kod ile bildir</h2>
        <CodeLookupForm />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Etiketinizdeki kodu yazın — örn. BANK-0147
        </p>
      </section>

      <Link
        href="/panel"
        className="rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Yönetim Paneline Git
      </Link>
    </main>
  );
}
