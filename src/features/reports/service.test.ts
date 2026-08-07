import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { prisma } from "@/core/db";
import {
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  TransitionError,
  ValidationError,
} from "@/core/errors";
import { _resetRateLimits } from "@/core/rate-limit";
import * as assetService from "@/features/assets/service";
import * as reportService from "@/features/reports/service";
import type { Role, User } from "@/generated/prisma/client";

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

  it("yeni kayıt açınca asset.status ARIZALI olur", async () => {
    const asset = await createTestAsset();
    await reportService.createReport(input(asset.code, await testPhoto()));
    const updated = await prisma.asset.findUnique({ where: { id: asset.id } });
    expect(updated?.status).toBe("ARIZALI");
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

async function createTestUser(role: Role): Promise<User> {
  return prisma.user.create({
    data: {
      username: `personel-${role}-${Math.random().toString(36).slice(2, 8)}`,
      passwordHash: "hash",
      fullName: role === "YONETICI" ? "Test Yönetici" : "Test Personel",
      role,
    },
  });
}

describe("reportService.transitionReport", () => {
  beforeEach(() => {
    _resetRateLimits();
  });

  async function createOpenReport() {
    const asset = await createTestAsset();
    const result = await reportService.createReport(input(asset.code, await testPhoto()));
    return { asset, report: result.report };
  }

  it("YENI → ATANDI geçişi geçerlidir, ReportEvent oluşur ve status güncellenir", async () => {
    const { report } = await createOpenReport();
    const actor = await createTestUser("SAHA_GOREVLISI");

    const updated = await reportService.transitionReport(
      report.id,
      { toStatus: "ATANDI", note: "Üstlendim" },
      actor,
    );

    expect(updated.status).toBe("ATANDI");
    const events = await prisma.reportEvent.findMany({ where: { reportId: report.id } });
    expect(events).toHaveLength(1);
    expect(events[0].fromStatus).toBe("YENI");
    expect(events[0].toStatus).toBe("ATANDI");
    expect(events[0].actorId).toBe(actor.id);
    expect(events[0].note).toBe("Üstlendim");
  });

  it("ATANDI → ONARILDI geçişi closedAt/not yazar, asset AKTIF'e döner, 2 event kayıtlıdır", async () => {
    const { asset, report } = await createOpenReport();
    const actor = await createTestUser("SAHA_GOREVLISI");
    await reportService.transitionReport(report.id, { toStatus: "ATANDI" }, actor);

    const updated = await reportService.transitionReport(
      report.id,
      { toStatus: "ONARILDI", note: "Ayak kaynak yapıldı" },
      actor,
    );

    expect(updated.status).toBe("ONARILDI");
    expect(updated.closedAt).not.toBeNull();
    expect(updated.resolutionNote).toBe("Ayak kaynak yapıldı");
    const events = await prisma.reportEvent.findMany({
      where: { reportId: report.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events).toHaveLength(2);
    expect(events[0].toStatus).toBe("ATANDI");
    expect(events[1].toStatus).toBe("ONARILDI");
    const currentAsset = await prisma.asset.findUnique({ where: { id: asset.id } });
    expect(currentAsset?.status).toBe("AKTIF");
  });

  it("YENI → ONARILDI geçersiz geçişte TransitionError fırlar ve event oluşmaz", async () => {
    const { report } = await createOpenReport();
    const actor = await createTestUser("SAHA_GOREVLISI");

    await expect(
      reportService.transitionReport(report.id, { toStatus: "ONARILDI" }, actor),
    ).rejects.toBeInstanceOf(TransitionError);
    await expect(prisma.reportEvent.count({ where: { reportId: report.id } })).resolves.toBe(0);
  });

  it("ONARILDI → YENI geçersiz geçişte TransitionError fırlar", async () => {
    const { report } = await createOpenReport();
    const actor = await createTestUser("SAHA_GOREVLISI");
    await reportService.transitionReport(report.id, { toStatus: "ATANDI" }, actor);
    await reportService.transitionReport(report.id, { toStatus: "ONARILDI" }, actor);

    await expect(
      reportService.transitionReport(report.id, { toStatus: "YENI" }, actor),
    ).rejects.toBeInstanceOf(TransitionError);
  });

  it("SAHA_GOREVLISI YENI → REDDEDILDI yapamaz (ForbiddenError)", async () => {
    const { report } = await createOpenReport();
    const actor = await createTestUser("SAHA_GOREVLISI");

    await expect(
      reportService.transitionReport(report.id, { toStatus: "REDDEDILDI", note: "Asılsız" }, actor),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("YONETICI YENI → REDDEDILDI yapabilir ve asset AKTIF'e döner", async () => {
    const { asset, report } = await createOpenReport();
    const actor = await createTestUser("YONETICI");

    const updated = await reportService.transitionReport(
      report.id,
      { toStatus: "REDDEDILDI", note: "Fotoğraf konumla uyuşmuyor" },
      actor,
    );

    expect(updated.status).toBe("REDDEDILDI");
    expect(updated.closedAt).not.toBeNull();
    const currentAsset = await prisma.asset.findUnique({ where: { id: asset.id } });
    expect(currentAsset?.status).toBe("AKTIF");
  });

  it("olmayan reportId için NotFoundError fırlatır", async () => {
    const actor = await createTestUser("YONETICI");
    await expect(
      reportService.transitionReport("olmayan-id", { toStatus: "ONARILDI" }, actor),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("fotoğrafsız ve notesuz kapatma geçerlidir", async () => {
    const { report } = await createOpenReport();
    const actor = await createTestUser("SAHA_GOREVLISI");
    await reportService.transitionReport(report.id, { toStatus: "ATANDI" }, actor);

    const updated = await reportService.transitionReport(report.id, { toStatus: "ONARILDI" }, actor);
    expect(updated.status).toBe("ONARILDI");
    expect(updated.resolvedPhoto).toBeNull();
    expect(updated.resolutionNote).toBeNull();
  });
});
