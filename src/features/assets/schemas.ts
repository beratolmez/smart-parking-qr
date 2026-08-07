import { z } from "zod";
import { ASSET_STATUSES, ASSET_TYPES } from "@/features/assets/constants";

function emptyToUndefined<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
}

export const createAssetsSchema = z.object({
  parkId: z.string({ error: "Park seçilmelidir." }).min(1, { error: "Park seçilmelidir." }),
  type: z.enum(ASSET_TYPES, { error: "Geçerli bir tür seçin." }),
  count: z.coerce
    .number({ error: "Adet sayı olmalı." })
    .int({ error: "Adet tam sayı olmalı." })
    .min(1, { error: "Adet en az 1 olmalı." })
    .max(100, { error: "Adet en fazla 100 olabilir." })
    .default(1),
  label: emptyToUndefined(z.string().max(120, { error: "Etiket en fazla 120 karakter olabilir." })),
  brand: emptyToUndefined(z.string().max(120, { error: "Marka en fazla 120 karakter olabilir." })),
  installedAt: emptyToUndefined(z.coerce.date({ error: "Geçerli bir tarih girin." })),
  latitude: emptyToUndefined(
    z.coerce.number({ error: "Enlem sayı olmalı." }).min(-90, { error: "Enlem -90 ile 90 arasında olmalı." }).max(90, { error: "Enlem -90 ile 90 arasında olmalı." }),
  ),
  longitude: emptyToUndefined(
    z.coerce.number({ error: "Boylam sayı olmalı." }).min(-180, { error: "Boylam -180 ile 180 arasında olmalı." }).max(180, { error: "Boylam -180 ile 180 arasında olmalı." }),
  ),
});

export type CreateAssetsInput = z.infer<typeof createAssetsSchema>;

export const updateAssetSchema = z.object({
  parkId: z.string({ error: "Park seçilmelidir." }).min(1, { error: "Park seçilmelidir." }),
  type: z.enum(ASSET_TYPES, { error: "Geçerli bir tür seçin." }),
  status: z.enum(ASSET_STATUSES, { error: "Geçerli bir durum seçin." }),
  label: emptyToUndefined(z.string().max(120, { error: "Etiket en fazla 120 karakter olabilir." })),
  brand: emptyToUndefined(z.string().max(120, { error: "Marka en fazla 120 karakter olabilir." })),
  installedAt: emptyToUndefined(z.coerce.date({ error: "Geçerli bir tarih girin." })),
  latitude: emptyToUndefined(
    z.coerce.number({ error: "Enlem sayı olmalı." }).min(-90, { error: "Enlem -90 ile 90 arasında olmalı." }).max(90, { error: "Enlem -90 ile 90 arasında olmalı." }),
  ),
  longitude: emptyToUndefined(
    z.coerce.number({ error: "Boylam sayı olmalı." }).min(-180, { error: "Boylam -180 ile 180 arasında olmalı." }).max(180, { error: "Boylam -180 ile 180 arasında olmalı." }),
  ),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const assetFilterSchema = z.object({
  parkId: emptyToUndefined(z.string()),
  type: emptyToUndefined(z.enum(ASSET_TYPES)),
  status: emptyToUndefined(z.enum(ASSET_STATUSES)),
});

export type AssetFilterInput = z.infer<typeof assetFilterSchema>;
