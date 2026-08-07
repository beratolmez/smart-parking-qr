import type { ReportStatus } from "@/generated/prisma/client";
import { REPORT_STATUS_LABELS } from "@/features/reports/constants";

const STATUS_CLASSES: Record<ReportStatus, string> = {
  YENI: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  ATANDI: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  ONARILDI: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  REDDEDILDI: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

export interface StatusBadgeProps {
  status: ReportStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {REPORT_STATUS_LABELS[status]}
    </span>
  );
}
