import { z } from "zod";
import type { ReportStatus } from "@/generated/prisma/enums";
import { normalizeAssetCode } from "@/features/assets/codes";
import { ISSUE_TYPES, REPORT_STATUSES } from "@/features/reports/constants";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function emptyToUndefined<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
}

// Boş file input'un FormData'da undefined yerine boş bir File (size 0) döndürmesini
// normalleştirir; opsiyonel fotoğraf alanı boş gönderildiğinde doğrulama patlamaz.
function emptyFileToUndefined<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v instanceof File && v.size === 0 ? undefined : v), schema.optional());
}

export const createReportSchema = z.object({
  assetCode: z
    .string({ error: "Kod gerekli." })
    .min(1, { error: "Kod gerekli." })
    .max(20, { error: "Kod çok uzun." })
    .transform((v) => normalizeAssetCode(v)),
  issueType: z.enum(ISSUE_TYPES, { error: "Geçerli bir sorun türü seçin." }),
  description: emptyToUndefined(
    z.string().max(500, { error: "Açıklama en fazla 500 karakter olabilir." }),
  ),
  reporterPhone: emptyToUndefined(
    z
      .string()
      .regex(/^(\+90|0)?[5-9]\d{9}$/, { error: "Geçerli bir telefon numarası girin." }),
  ),
  photo: z
    .instanceof(File, { error: "Fotoğraf zorunludur." })
    .refine((f) => ALLOWED_PHOTO_TYPES.includes(f.type), {
      error: "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz.",
    })
    .refine((f) => f.size <= MAX_PHOTO_BYTES, { error: "Fotoğraf en fazla 10 MB olabilir." }),
});

export type CreateReportForm = z.infer<typeof createReportSchema>;

export interface CreateReportInput {
  assetCode: string; // normalize edilmiş
  issueType: CreateReportForm["issueType"];
  description?: string;
  reporterPhone?: string;
  photo: Buffer; // route File.arrayBuffer()'dan çevrilir; servis şemayı görmez
  clientIp: string;
}

export const transitionReportSchema = z.object({
  reportId: z.string().min(1, { error: "Geçersiz istek." }),
  toStatus: z.enum(REPORT_STATUSES, { error: "Geçerli bir durum seçin." }),
  note: emptyToUndefined(
    z.string().max(500, { error: "Not en fazla 500 karakter olabilir." }),
  ),
  photo: emptyFileToUndefined(
    z
      .instanceof(File, { error: "Geçersiz dosya." })
      .refine((f) => ALLOWED_PHOTO_TYPES.includes(f.type), {
        error: "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz.",
      })
      .refine((f) => f.size <= MAX_PHOTO_BYTES, {
        error: "Fotoğraf en fazla 10 MB olabilir.",
      }),
  ),
});

export type TransitionReportForm = z.infer<typeof transitionReportSchema>;

export interface TransitionReportInput {
  toStatus: ReportStatus;
  note?: string;
  resolvedPhoto?: Buffer;
}

export const reportFilterSchema = z.object({
  status: emptyToUndefined(z.enum(REPORT_STATUSES)),
  parkId: emptyToUndefined(z.string()),
  overdue: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
