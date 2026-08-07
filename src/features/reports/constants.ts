import type { IssueType, ReportStatus } from "@/generated/prisma/enums";

export const ISSUE_TYPES = [
  "KIRIK_HASARLI",
  "KIRLI",
  "BOYA_DOKUNTU",
  "TEHLIKELI",
  "EKSIK_CALINMIS",
  "DIGER",
] as const satisfies readonly IssueType[];

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  KIRIK_HASARLI: "Kırık / Hasarlı",
  KIRLI: "Kirli",
  BOYA_DOKUNTU: "Boya Döküntüsü",
  TEHLIKELI: "Tehlikeli",
  EKSIK_CALINMIS: "Eksik / Çalınmış",
  DIGER: "Diğer",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  YENI: "Yeni",
  ATANDI: "Atandı",
  ONARILDI: "Onarıldı",
  REDDEDILDI: "Reddedildi",
};

export const REPORT_STATUSES = [
  "YENI",
  "ATANDI",
  "ONARILDI",
  "REDDEDILDI",
] as const satisfies readonly ReportStatus[];

export const OVERDUE_DAYS = 7;

export const ALLOWED_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  YENI: ["ATANDI", "REDDEDILDI"],
  ATANDI: ["ONARILDI", "REDDEDILDI"],
  ONARILDI: [],
  REDDEDILDI: [],
};
