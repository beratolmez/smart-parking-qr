import Link from "next/link";
import type { ReportWithAsset } from "@/features/reports/repository";
import { ISSUE_TYPE_LABELS } from "@/features/reports/constants";
import { ASSET_TYPE_LABELS } from "@/features/assets/constants";
import { StatusBadge } from "@/features/reports/components/StatusBadge";
import { formatDateTR } from "@/shared/format";

export interface ReportTableProps {
  reports: ReportWithAsset[];
  overdueReportIds?: string[];
}

export function ReportTable({ reports, overdueReportIds = [] }: ReportTableProps) {
  const overdueIds = new Set(overdueReportIds);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Takip No</th>
            <th scope="col" className="px-4 py-3 font-medium">Demirbaş</th>
            <th scope="col" className="px-4 py-3 font-medium">Park</th>
            <th scope="col" className="px-4 py-3 font-medium">Sorun</th>
            <th scope="col" className="px-4 py-3 font-medium">Durum</th>
            <th scope="col" className="px-4 py-3 font-medium">Tekrar</th>
            <th scope="col" className="px-4 py-3 font-medium">Gecikme</th>
            <th scope="col" className="px-4 py-3 font-medium">Tarih</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {reports.map((report) => (
            <tr key={report.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <td className="px-4 py-3">
                <Link
                  href={`/panel/bildirimler/${report.id}`}
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-50 dark:focus-visible:outline-zinc-50"
                >
                  #{report.ticketNo}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono font-semibold">{report.asset.code}</span>
                <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                  {ASSET_TYPE_LABELS[report.asset.type]}
                </span>
              </td>
              <td className="px-4 py-3">{report.asset.park.name}</td>
              <td className="px-4 py-3">{ISSUE_TYPE_LABELS[report.issueType]}</td>
              <td className="px-4 py-3">
                <StatusBadge status={report.status} />
              </td>
              <td className="px-4 py-3">
                {report.duplicateCount > 1 && (
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                    {report.duplicateCount} kişi bildirdi
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {overdueIds.has(report.id) && (
                  <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-100">
                    Gecikti
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{formatDateTR(report.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
