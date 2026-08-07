import * as assetService from "@/features/assets/service";
import { REPORT_STATUSES, REPORT_STATUS_LABELS } from "@/features/reports/constants";
import { reportFilterSchema } from "@/features/reports/schemas";
import * as reportService from "@/features/reports/service";
import { ReportTable } from "@/features/reports/components/ReportTable";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Button } from "@/shared/ui/Button";

export default async function BildirimlerPage(props: PageProps<"/panel/bildirimler">) {
  const rawSearchParams = await props.searchParams;
  const filter = reportFilterSchema.parse({
    status: rawSearchParams.status ?? "",
    parkId: rawSearchParams.parkId ?? "",
    overdue: rawSearchParams.overdue ?? undefined,
  });

  const [reports, parks] = await Promise.all([
    reportService.listReports(filter),
    assetService.listParks(),
  ]);

  const sortedParks = [...parks].sort((a, b) => a.name.localeCompare(b.name, "tr"));

  const overdueReportIds = reports
    .filter((report) => reportService.isReportOverdue(report))
    .map((report) => report.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Bildirimler</h1>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Durum
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filter.status ?? ""}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Tümü</option>
            {REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {REPORT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="parkId" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Park
          </label>
          <select
            id="parkId"
            name="parkId"
            defaultValue={filter.parkId ?? ""}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Tümü</option>
            {sortedParks.map((park) => (
              <option key={park.id} value={park.id}>
                {park.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            name="overdue"
            value="true"
            defaultChecked={filter.overdue === true}
            className="size-4 rounded border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950"
          />
          Gecikenler (7+ gün)
        </label>
        <Button type="submit" variant="secondary">
          Filtrele
        </Button>
      </form>

      {reports.length === 0 ? (
        <EmptyState message="Henüz bildirim yok." />
      ) : (
        <ReportTable reports={reports} overdueReportIds={overdueReportIds} />
      )}
    </div>
  );
}
