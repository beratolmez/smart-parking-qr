import { describe, expect, it } from "vitest";
import { prisma } from "@/core/db";
import { NotFoundError } from "@/core/errors";
import * as assetService from "@/features/assets/service";

async function createTestPark() {
  return prisma.park.create({ data: { name: "Test Parkı", district: "Test Mahallesi" } });
}

describe("assetService.createAssets", () => {
  it("tek demirbaş için doğru kod formatı üretir", async () => {
    const park = await createTestPark();
    const [asset] = await assetService.createAssets({ parkId: park.id, type: "BANK", count: 1 });
    expect(asset.code).toBe("BANK-0001");
  });

  it("count=100 ile 100 benzersiz, ardışık kod üretir", async () => {
    const park = await createTestPark();
    const assets = await assetService.createAssets({ parkId: park.id, type: "BANK", count: 100 });
    expect(assets).toHaveLength(100);

    const codes = assets.map((a) => a.code);
    expect(new Set(codes).size).toBe(100);

    const sequences = codes.map((c) => Number(c.split("-")[1])).sort((a, b) => a - b);
    for (let i = 0; i < sequences.length; i++) {
      expect(sequences[i]).toBe(i + 1);
    }
  });

  it("art arda iki çağrıda sayaç kaldığı yerden devam eder", async () => {
    const park = await createTestPark();
    const first = await assetService.createAssets({
      parkId: park.id,
      type: "SALINCAK",
      count: 3,
    });
    const second = await assetService.createAssets({
      parkId: park.id,
      type: "SALINCAK",
      count: 2,
    });
    expect(first.map((a) => a.code)).toEqual(["SALN-0001", "SALN-0002", "SALN-0003"]);
    expect(second.map((a) => a.code)).toEqual(["SALN-0004", "SALN-0005"]);
  });

  it("aynı türden farklı parklara eklendiğinde kodlar küresel olarak benzersiz kalır", async () => {
    const parkA = await createTestPark();
    const parkB = await prisma.park.create({ data: { name: "Diğer Park", district: "Diğer" } });

    const a = await assetService.createAssets({ parkId: parkA.id, type: "KAYDIRAK", count: 2 });
    const b = await assetService.createAssets({ parkId: parkB.id, type: "KAYDIRAK", count: 2 });

    expect(a.map((x) => x.code)).toEqual(["KAYD-0001", "KAYD-0002"]);
    expect(b.map((x) => x.code)).toEqual(["KAYD-0003", "KAYD-0004"]);
  });

  it("geçersiz parkId için NotFoundError fırlatır", async () => {
    await expect(
      assetService.createAssets({ parkId: "olmayan-park", type: "BANK", count: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("assetService.updateAsset", () => {
  it("code alanını değiştiremez", async () => {
    const park = await createTestPark();
    const [asset] = await assetService.createAssets({ parkId: park.id, type: "BANK", count: 1 });

    const updated = await assetService.updateAsset(asset.id, {
      parkId: park.id,
      type: "BANK",
      status: "AKTIF",
      label: "Yeni etiket",
    });

    expect(updated.code).toBe(asset.code);
    expect(updated.label).toBe("Yeni etiket");
  });
});

describe("assetService.archiveAsset", () => {
  it("kaydı silmez, HURDA durumuna alır", async () => {
    const park = await createTestPark();
    const [asset] = await assetService.createAssets({ parkId: park.id, type: "BANK", count: 1 });

    const archived = await assetService.archiveAsset(asset.id);
    expect(archived.status).toBe("HURDA");

    const found = await assetService.getAsset(asset.id);
    expect(found.id).toBe(asset.id);
  });
});
