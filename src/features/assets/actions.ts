"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError } from "@/core/errors";
import { createAssetsSchema, updateAssetSchema } from "@/features/assets/schemas";
import * as assetService from "@/features/assets/service";
import { requireRole } from "@/features/auth/dal";
import type { ActionState } from "@/shared/types";

export async function createAssetsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("YONETICI");
  const parsed = createAssetsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    const assets = await assetService.createAssets(parsed.data);
    revalidatePath("/panel/demirbaslar");
    const first = assets[0].code;
    const last = assets[assets.length - 1].code;
    const rangeText = assets.length > 1 ? `${first} – ${last}` : first;
    return { ok: true, message: `${assets.length} demirbaş eklendi (${rangeText}).` };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message };
    throw e;
  }
}

export async function updateAssetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("YONETICI");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, message: "Geçersiz istek." };

  const parsed = updateAssetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    await assetService.updateAsset(id, parsed.data);
    revalidatePath("/panel/demirbaslar");
    revalidatePath(`/panel/demirbaslar/${id}/duzenle`);
    return { ok: true, message: "Demirbaş güncellendi." };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message };
    throw e;
  }
}

export async function archiveAssetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("YONETICI");
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return { ok: false, message: "Geçersiz istek." };
  try {
    await assetService.archiveAsset(id);
    revalidatePath("/panel/demirbaslar");
    return { ok: true, message: "Demirbaş hurdaya ayrıldı." };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message };
    throw e;
  }
}
