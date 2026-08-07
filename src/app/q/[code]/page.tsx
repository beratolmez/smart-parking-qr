import { redirect } from "next/navigation";
import * as assetService from "@/features/assets/service";
import { normalizeAssetCode } from "@/features/assets/codes";
import { ASSET_TYPE_LABELS } from "@/features/assets/constants";
import { getOpenReport } from "@/features/reports/service";
import { ReportForm } from "@/features/reports/components/ReportForm";
import { CodeLookupForm } from "@/features/reports/components/CodeLookupForm";

export default async function QPage(props: PageProps<"/q/[code]">) {
  const { code } = await props.params;
  const normalized = normalizeAssetCode(code);
  if (normalized !== code) redirect(`/q/${normalized}`);

  let asset;
  try {
    asset = await assetService.getAssetByCode(normalized);
  } catch {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Kod bulunamadı
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          &quot;{normalized}&quot; kodlu bir demirbaş bulunamadı. Etiketin üzerindeki kodu kontrol
          edip tekrar deneyin.
        </p>
        <CodeLookupForm />
      </main>
    );
  }

  const openReport = await getOpenReport(asset.id);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-8">
      <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset.park.name}</p>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {ASSET_TYPE_LABELS[asset.type]}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Kod: <span className="font-mono font-semibold">{asset.code}</span>
        </p>
      </section>

      <ReportForm
        assetCode={asset.code}
        parkName={asset.park.name}
        openReport={
          openReport
            ? { ticketNo: openReport.ticketNo, duplicateCount: openReport.duplicateCount }
            : null
        }
      />
    </main>
  );
}
