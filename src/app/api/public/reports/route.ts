import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/core/errors";
import { createReportSchema } from "@/features/reports/schemas";
import * as reportService from "@/features/reports/service";

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = createReportSchema.safeParse({
    assetCode: formData.get("assetCode"),
    issueType: formData.get("issueType"),
    description: formData.get("description") ?? undefined,
    reporterPhone: formData.get("reporterPhone") ?? undefined,
    photo: formData.get("photo"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        detail: "Form bilgileri hatalı.",
        fields: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 422 },
    );
  }

  const { photo, ...fields } = parsed.data;
  const photoBuffer = Buffer.from(await photo.arrayBuffer());
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "bilinmeyen";

  try {
    const result = await reportService.createReport({ ...fields, photo: photoBuffer, clientIp });
    return NextResponse.json(
      {
        ticketNo: result.report.ticketNo,
        status: result.report.status,
        duplicate: result.duplicate,
        message: result.duplicate
          ? "Bu sorun zaten bildirilmiş. Kaydınız eklendi."
          : "Bildiriminiz Park ve Bahçeler Müdürlüğü'ne iletildi.",
      },
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.code, detail: e.message }, { status: e.status });
    }
    throw e;
  }
}
