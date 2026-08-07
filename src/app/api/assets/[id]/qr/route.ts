import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/core/errors";
import * as assetService from "@/features/assets/service";
import { qrPngDataUrl, qrSvg } from "@/features/assets/qr";

const querySchema = z.object({
  format: z.enum(["svg", "png"]).default("svg"),
  size: z.coerce.number().int().min(64).max(1024).default(240),
});

export async function GET(request: Request, ctx: RouteContext<"/api/assets/[id]/qr">) {
  const { id } = await ctx.params;
  const url = new URL(request.url);

  const parsedQuery = querySchema.safeParse({
    format: url.searchParams.get("format") ?? undefined,
    size: url.searchParams.get("size") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", detail: "Geçersiz sorgu parametreleri." },
      { status: 400 },
    );
  }
  const { format, size } = parsedQuery.data;

  try {
    const asset = await assetService.getAsset(id);

    if (format === "png") {
      const dataUrl = await qrPngDataUrl(asset.code, size);
      const base64 = dataUrl.split(",")[1] ?? "";
      const buffer = Buffer.from(base64, "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `inline; filename="${asset.code}.png"`,
        },
      });
    }

    const svg = await qrSvg(asset.code, size);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `inline; filename="${asset.code}.svg"`,
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json({ error: e.code, detail: e.message }, { status: e.status });
    }
    throw e;
  }
}
