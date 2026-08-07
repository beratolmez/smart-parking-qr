import type { AssetType, AssetStatus } from "@/generated/prisma/enums";

export const ASSET_TYPES = [
  "BANK",
  "OYUN_GRUBU",
  "SALINCAK",
  "KAYDIRAK",
  "TAHTEREVALLI",
  "SPOR_ALETI",
  "COP_KUTUSU",
  "AYDINLATMA",
  "CESME",
  "DIGER",
] as const satisfies readonly AssetType[];

export const ASSET_STATUSES = [
  "AKTIF",
  "ARIZALI",
  "BAKIMDA",
  "HURDA",
] as const satisfies readonly AssetStatus[];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  BANK: "Bank",
  OYUN_GRUBU: "Oyun Grubu",
  SALINCAK: "Salıncak",
  KAYDIRAK: "Kaydırak",
  TAHTEREVALLI: "Tahterevalli",
  SPOR_ALETI: "Spor Aleti",
  COP_KUTUSU: "Çöp Kutusu",
  AYDINLATMA: "Aydınlatma",
  CESME: "Çeşme",
  DIGER: "Diğer",
};

export const ASSET_TYPE_PREFIXES: Record<AssetType, string> = {
  BANK: "BANK",
  OYUN_GRUBU: "OYUN",
  SALINCAK: "SALN",
  KAYDIRAK: "KAYD",
  TAHTEREVALLI: "THTR",
  SPOR_ALETI: "SPOR",
  COP_KUTUSU: "COPK",
  AYDINLATMA: "AYDN",
  CESME: "CSME",
  DIGER: "DGER",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  AKTIF: "Aktif",
  ARIZALI: "Arızalı",
  BAKIMDA: "Bakımda",
  HURDA: "Hurda",
};
