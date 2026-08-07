import type { Role } from "@/generated/prisma/enums";

export const ROLES = ["SAHA_GOREVLISI", "YONETICI"] as const satisfies readonly Role[];

export const ROLE_LABELS: Record<Role, string> = {
  SAHA_GOREVLISI: "Saha Görevlisi",
  YONETICI: "Yönetici",
};
