import { describe, expect, it } from "vitest";
import { prisma } from "@/core/db";
import * as assetService from "@/features/assets/service";
import { buildMonthlyTrend, getDashboardData } from "@/features/analytics/service";
import type { AssetType, IssueType, ReportStatus } from "@/generated/prisma/enums";

async function createTestPark(name = "Test Parkı") {
  return prisma.park.create({ data: { name, district: "Test Mahallesi" } });
}

async function createTestAsset(parkId: string, type: AssetType = "BANK") {
  const [asset] = await assetService.createAssets({ parkId, type, count: 1 });
  return asset;
}

let ticketCounter = 1000;
async function createDirectReport(params: {
  assetId: string;
  status: ReportStatus;
  issueType?: IssueType;
  createdAt: Date;
  closedAt?: Date;
}) {
  ticketCounter += 1;
  return prisma.report.create({
    data: {
      ticketNo: ticketCounter,
      asset: { connect: { id: params.assetId } },
      issueType: params.issueType ?? "KIRIK_HASARLI",
      description: "Test bildirimi",
      reporterType: "VATANDAS",
      photoUrl: "/uploads/test.webp",
      status: params.status,
      createdAt: params.createdAt,
      ...(params.closedAt ? { closedAt: params.closedAt } : {}),
    },
  });
}

const daysAgo = (days: number, hourOffset = 0) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000);

/** Son `count` ayın monthKey'lerini (en eski → en yeni) üretir. */
function lastMonthsKeys(count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

/** `months` ay öncesinin ayın ortasındaki bir tarihini döner (sınır taşmasına dayanıklı). */
function monthOffsetDate(months: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, 15, 12, 0, 0);
}

describe("getDashboardData — boş veritabanı", () => {
  it("tüm metrikler sıfır/null ve grafikler boştur, monthlyTrend 6 sıfır kova içerir", async () => {
    const data = await getDashboardData();

    expect(data.openCount).toBe(0);
    expect(data.overdueCount).toBe(0);
    expect(data.avgResolutionHours).toBeNull();
    expect(data.totalCount).toBe(0);
    expect(data.topFaultyAssets).toEqual([]);
    expect(data.parkDistribution).toEqual([]);
    expect(data.typeDistribution).toEqual([]);

    expect(data.monthlyTrend).toHaveLength(6);
    expect(data.monthlyTrend.map((p) => p.key)).toEqual(lastMonthsKeys(6));
    for (const point of data.monthlyTrend) {
      expect(point.opened).toBe(0);
      expect(point.closed).toBe(0);
    }
  });
});

describe("getDashboardData — sayılar", () => {
  it("openCount yalnızca YENI+ATANDI'yı sayar, totalCount tüm kayıtları sayar", async () => {
    const park = await createTestPark();
    const assetA = await createTestAsset(park.id);
    const assetB = await createTestAsset(park.id);
    const assetC = await createTestAsset(park.id);
    const assetD = await createTestAsset(park.id);

    await createDirectReport({ assetId: assetA.id, status: "YENI", createdAt: daysAgo(2) });
    await createDirectReport({ assetId: assetB.id, status: "ATANDI", createdAt: daysAgo(2) });
    await createDirectReport({
      assetId: assetC.id,
      status: "ONARILDI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });
    await createDirectReport({
      assetId: assetD.id,
      status: "REDDEDILDI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });

    const data = await getDashboardData();
    expect(data.openCount).toBe(2);
    expect(data.totalCount).toBe(4);
  });

  it("overdueCount yalnızca 7+ gün açık kayıtları sayar", async () => {
    const park = await createTestPark();
    const assetOld = await createTestAsset(park.id);
    const assetFresh = await createTestAsset(park.id);

    await createDirectReport({ assetId: assetOld.id, status: "YENI", createdAt: daysAgo(8) });
    await createDirectReport({ assetId: assetFresh.id, status: "YENI", createdAt: daysAgo(3) });

    const data = await getDashboardData();
    expect(data.overdueCount).toBe(1);
  });

  it("avgResolutionHours yalnızca closedAt'lı ONARILDI kayıtlarını sayar (REDDEDILDI ve null closedAt hariç)", async () => {
    const park = await createTestPark();
    const assetA = await createTestAsset(park.id);
    const assetB = await createTestAsset(park.id);
    const assetC = await createTestAsset(park.id);
    const assetD = await createTestAsset(park.id);

    const baseA = daysAgo(10);
    await createDirectReport({
      assetId: assetA.id,
      status: "ONARILDI",
      createdAt: baseA,
      closedAt: new Date(baseA.getTime() + 48 * 60 * 60 * 1000),
    });
    const baseB = daysAgo(10);
    await createDirectReport({
      assetId: assetB.id,
      status: "ONARILDI",
      createdAt: baseB,
      closedAt: new Date(baseB.getTime() + 96 * 60 * 60 * 1000),
    });
    const baseC = daysAgo(10);
    await createDirectReport({
      assetId: assetC.id,
      status: "REDDEDILDI",
      createdAt: baseC,
      closedAt: new Date(baseC.getTime() + 10 * 60 * 60 * 1000),
    });
    await createDirectReport({
      assetId: assetD.id,
      status: "ONARILDI",
      createdAt: daysAgo(10),
    });

    const data = await getDashboardData();
    expect(data.avgResolutionHours).toBe(72);
  });

  it("hiç ONARILDI yokken avgResolutionHours null'dır", async () => {
    const park = await createTestPark();
    const assetA = await createTestAsset(park.id);

    await createDirectReport({ assetId: assetA.id, status: "YENI", createdAt: daysAgo(2) });

    const data = await getDashboardData();
    expect(data.avgResolutionHours).toBeNull();
  });

  it("typeDistribution çoktan aza sıralı doğru sayıları döner", async () => {
    const park = await createTestPark();
    const assets = await assetService.createAssets({ parkId: park.id, type: "BANK", count: 6 });

    await createDirectReport({
      assetId: assets[0].id,
      status: "ONARILDI",
      issueType: "KIRIK_HASARLI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });
    await createDirectReport({
      assetId: assets[1].id,
      status: "ONARILDI",
      issueType: "KIRIK_HASARLI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });
    await createDirectReport({
      assetId: assets[2].id,
      status: "ONARILDI",
      issueType: "KIRIK_HASARLI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });
    await createDirectReport({
      assetId: assets[3].id,
      status: "ONARILDI",
      issueType: "KIRLI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });
    await createDirectReport({
      assetId: assets[4].id,
      status: "ONARILDI",
      issueType: "KIRLI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });
    await createDirectReport({
      assetId: assets[5].id,
      status: "ONARILDI",
      issueType: "TEHLIKELI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });

    const data = await getDashboardData();
    expect(data.typeDistribution).toEqual([
      { issueType: "KIRIK_HASARLI", count: 3 },
      { issueType: "KIRLI", count: 2 },
      { issueType: "TEHLIKELI", count: 1 },
    ]);
  });

  it("parkDistribution park başına açık/kapalıyı doğru sayar (REDDEDILDI closed)", async () => {
    const park1 = await createTestPark("Park Bir");
    const park2 = await createTestPark("Park İki");
    const park1Open = await createTestAsset(park1.id);
    const park1Closed = await createTestAsset(park1.id);
    const park2Open = await createTestAsset(park2.id);
    const park2Closed = await createTestAsset(park2.id);

    await createDirectReport({ assetId: park1Open.id, status: "YENI", createdAt: daysAgo(2) });
    await createDirectReport({
      assetId: park1Closed.id,
      status: "ONARILDI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });
    await createDirectReport({ assetId: park2Open.id, status: "ATANDI", createdAt: daysAgo(2) });
    await createDirectReport({
      assetId: park2Closed.id,
      status: "REDDEDILDI",
      createdAt: daysAgo(10),
      closedAt: daysAgo(8),
    });

    const data = await getDashboardData();
    expect(data.parkDistribution).toEqual([
      { parkName: "Park Bir", open: 1, closed: 1 },
      { parkName: "Park İki", open: 1, closed: 1 },
    ]);
  });
});

describe("getDashboardData — topFaultyAssets", () => {
  it("son 12 ay içindeki bildirimleri saya, limiti uygular ve koda göre bağ sıralaması yapar", async () => {
    const park = await createTestPark();
    const assets = await assetService.createAssets({ parkId: park.id, type: "BANK", count: 6 });
    const [a, b, c, d, e] = assets;

    // A: 4 bildirim son 12 ay içinde + 2 bildirim 13 ay önce (sayılmaz) → 4
    for (let i = 0; i < 4; i++) {
      await createDirectReport({
        assetId: a.id,
        status: "ONARILDI",
        createdAt: daysAgo(5 + i * 10),
        closedAt: daysAgo(4 + i * 10),
      });
    }
    for (let i = 0; i < 2; i++) {
      await createDirectReport({
        assetId: a.id,
        status: "ONARILDI",
        createdAt: daysAgo(400 + i * 5),
        closedAt: daysAgo(399 + i * 5),
      });
    }
    // B: 3
    for (let i = 0; i < 3; i++) {
      await createDirectReport({
        assetId: b.id,
        status: "ONARILDI",
        createdAt: daysAgo(5 + i * 10),
        closedAt: daysAgo(4 + i * 10),
      });
    }
    // C: 2
    for (let i = 0; i < 2; i++) {
      await createDirectReport({
        assetId: c.id,
        status: "ONARILDI",
        createdAt: daysAgo(5 + i * 10),
        closedAt: daysAgo(4 + i * 10),
      });
    }
    // D: 1
    await createDirectReport({
      assetId: d.id,
      status: "ONARILDI",
      createdAt: daysAgo(5),
      closedAt: daysAgo(4),
    });
    // E: 1
    await createDirectReport({
      assetId: e.id,
      status: "ONARILDI",
      createdAt: daysAgo(5),
      closedAt: daysAgo(4),
    });
    // F: 0 → top-5'e girmez

    const data = await getDashboardData();

    expect(data.topFaultyAssets).toHaveLength(5);
    expect(data.topFaultyAssets[0]).toMatchObject({ code: a.code, count: 4 });
    expect(data.topFaultyAssets[1]).toMatchObject({ code: b.code, count: 3 });
    expect(data.topFaultyAssets[2]).toMatchObject({ code: c.code, count: 2 });

    // D ve E eşit (1'er) → koda göre deterministik sıralama
    const lastTwo = data.topFaultyAssets.slice(3).map((row) => row.code);
    expect(lastTwo.sort()).toEqual([d.code, e.code].sort());
    expect(data.topFaultyAssets[3].code < data.topFaultyAssets[4].code).toBe(true);
  });

  it("code, type ve parkName bilgilerini asset'ten doldurur", async () => {
    const park = await createTestPark("Dağıtım Parkı");
    const asset = await createTestAsset(park.id, "SALINCAK");

    await createDirectReport({
      assetId: asset.id,
      status: "ONARILDI",
      createdAt: daysAgo(5),
      closedAt: daysAgo(4),
    });

    const data = await getDashboardData();
    expect(data.topFaultyAssets[0]).toEqual({
      code: asset.code,
      type: "SALINCAK",
      parkName: "Dağıtım Parkı",
      count: 1,
    });
  });
});

describe("buildMonthlyTrend", () => {
  it("son 6 ayın kovalarını boş aylar dahil kronolojik üretir", () => {
    const trend = buildMonthlyTrend([]);
    expect(trend.map((p) => p.key)).toEqual(lastMonthsKeys(6));
    for (const point of trend) {
      expect(point.opened).toBe(0);
      expect(point.closed).toBe(0);
    }
  });

  it("geçen ay açılan ve kapanan bildirimi doğru kovaya koyar; null closedAt closed'a yazılmaz", () => {
    const lastMonth = monthOffsetDate(1);
    const trend = buildMonthlyTrend([
      { createdAt: lastMonth, closedAt: lastMonth },
      { createdAt: lastMonth, closedAt: null },
    ]);

    const point = trend.find((p) => p.key === lastMonthsKeys(6)[4]);
    expect(point).toBeDefined();
    expect(point?.opened).toBe(2);
    expect(point?.closed).toBe(1);
  });

  it("7 ay önceki kayıt hiçbir kovada görünmez", () => {
    const old = monthOffsetDate(7);
    const trend = buildMonthlyTrend([{ createdAt: old, closedAt: null }]);

    for (const point of trend) {
      expect(point.opened).toBe(0);
      expect(point.closed).toBe(0);
    }
  });
});
