import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { prisma } from "@/core/db";
import { NotFoundError, RateLimitError, ValidationError } from "@/core/errors";
import { _resetRateLimits } from "@/core/rate-limit";
import * as assetService from "@/features/assets/service";
import * as reportService from "@/features/reports/service";

async function createTestPark() {
  return prisma.park.create({ data: { name: "Test Parkı", district: "Test Mahallesi" } });
}

async function createTestAsset() {
  const park = await createTestPark();
  const [asset] = await assetService.createAssets({ parkId: park.id, type: "BANK", count: 1 });
  return asset;
}

function testPhoto(): Promise<Buffer> {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: "#ccc" } })
    .png()
    .toBuffer();
}

function input(code: string, photo: Buffer) {
  return {
    assetCode: code,
    issueType: "KIRIK_HASARLI" as const,
    photo,
    clientIp: "127.0.0.1",
  };
}

describe("reportService.createReport", () => {
  beforeEach(() => {
    _resetRateLimits();
  });

  it("ilk bildirim için yeni kayıt açar (ticketNo 1, YENI, duplicate false)", async () => {
    const asset = await createTestAsset();
    const result = await reportService.createReport(input(asset.code, await testPhoto()));
    expect(result.duplicate).toBe(false);
    expect(result.report.ticketNo).toBe(1);
    expect(result.report.status).toBe("YENI");
    expect(result.report.photoUrl).toMatch(/^\/uploads\//);
  });

  it("açık kayıt varken ikinci bildirim yeni kayıt açmaz, sayacı artırır", async () => {
    const asset = await createTestAsset();
    const first = await reportService.createReport(input(asset.code, await testPhoto()));
    const second = await reportService.createReport(input(asset.code, await testPhoto()));
    expect(second.duplicate).toBe(true);
    expect(second.report.ticketNo).toBe(first.report.ticketNo);
    expect(second.report.duplicateCount).toBe(2);
  });

  it("kapalı kayıt sonrası yeni bildirim yeni ticketNo açar", async () => {
    const asset = await createTestAsset();
    const first = await reportService.createReport(input(asset.code, await testPhoto()));
    await prisma.report.update({
      where: { id: first.report.id },
      data: { status: "ONARILDI" },
    });
    const second = await reportService.createReport({
      ...input(asset.code, await testPhoto()),
      clientIp: "127.0.0.2",
    });
    expect(second.duplicate).toBe(false);
    expect(second.report.ticketNo).not.toBe(first.report.ticketNo);
    expect(second.report.ticketNo).toBe(2);
  });

  it("olmayan kod için NotFoundError fırlatır", async () => {
    await expect(
      reportService.createReport(input("DGER-9999", await testPhoto())),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("kapalı kayıt sonrası aynı IP + demirbaşta 5 dk içinde yeni bildirim RateLimitError fırlatır", async () => {
    const asset = await createTestAsset();
    const first = await reportService.createReport(input(asset.code, await testPhoto()));
    await prisma.report.update({
      where: { id: first.report.id },
      data: { status: "ONARILDI" },
    });
    await expect(
      reportService.createReport(input(asset.code, await testPhoto())),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("aynı IP saatte 20 bildirimden sonra 21. bildirimi reddeder", async () => {
    const park = await createTestPark();
    const assets = await assetService.createAssets({ parkId: park.id, type: "BANK", count: 21 });
    for (let i = 0; i < 20; i++) {
      await reportService.createReport(input(assets[i].code, await testPhoto()));
    }
    await expect(
      reportService.createReport(input(assets[20].code, await testPhoto())),
    ).rejects.toBeInstanceOf(RateLimitError);
  });

  it("geçersiz görsel buffer için ValidationError fırlatır", async () => {
    const asset = await createTestAsset();
    await expect(
      reportService.createReport(input(asset.code, Buffer.from("metin değil görsel"))),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
