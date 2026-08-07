"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError } from "@/core/errors";
import { requireUser } from "@/features/auth/dal";
import { processPhoto } from "@/features/reports/photos";
import { transitionReportSchema } from "@/features/reports/schemas";
import * as reportService from "@/features/reports/service";
import type { ActionState } from "@/shared/types";

export async function transitionReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transitionReportSchema.safeParse({
    reportId: formData.get("reportId"),
    toStatus: formData.get("toStatus"),
    note: formData.get("note") ?? undefined,
    photo: formData.get("photo") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const actor = await requireUser();

    const { photo, ...fields } = parsed.data;
    const resolvedPhoto = photo ? await processPhoto(Buffer.from(await photo.arrayBuffer())) : undefined;

    await reportService.transitionReport(fields.reportId, { ...fields, resolvedPhoto }, actor);

    revalidatePath("/panel/bildirimler");
    if (fields.toStatus === "ONARILDI" || fields.toStatus === "REDDEDILDI") {
      revalidatePath(`/panel/bildirimler/${fields.reportId}`);
      const report = await reportService.getReport(fields.reportId);
      revalidatePath(`/q/${report.asset.code}`);
    }
    return { ok: true, message: "Bildirim durumu güncellendi." };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message };
    throw e;
  }
}
