import { prisma } from "@/core/db";
import { Prisma, type Asset, type AssetType, type Park } from "@/generated/prisma/client";
import type { AssetFilterInput } from "@/features/assets/schemas";

export type AssetWithPark = Asset & { park: Park };

export async function listAssets(filter: AssetFilterInput): Promise<AssetWithPark[]> {
  return prisma.asset.findMany({
    where: {
      parkId: filter.parkId,
      type: filter.type,
      status: filter.status,
    },
    include: { park: true },
    orderBy: { code: "asc" },
  });
}

export async function getAssetById(id: string): Promise<AssetWithPark | null> {
  return prisma.asset.findUnique({ where: { id }, include: { park: true } });
}

export async function getAssetByCode(code: string): Promise<AssetWithPark | null> {
  return prisma.asset.findUnique({ where: { code }, include: { park: true } });
}

export async function listAssetsByIds(ids: string[]): Promise<AssetWithPark[]> {
  return prisma.asset.findMany({
    where: { id: { in: ids } },
    include: { park: true },
    orderBy: { code: "asc" },
  });
}

export async function createManyAssets(data: Prisma.AssetCreateManyInput[]): Promise<number> {
  const result = await prisma.asset.createMany({ data });
  return result.count;
}

export async function updateAsset(id: string, data: Prisma.AssetUpdateInput): Promise<Asset> {
  return prisma.asset.update({ where: { id }, data });
}

export async function listParks(): Promise<Park[]> {
  return prisma.park.findMany({ orderBy: { name: "asc" } });
}

export async function getParkById(id: string): Promise<Park | null> {
  return prisma.park.findUnique({ where: { id } });
}

/** Sayaç tablosunu atomik artırır ve tahsis edilen ilk sıra numarasını döner. */
export async function allocateSequence(
  tx: Prisma.TransactionClient,
  type: AssetType,
  count: number,
): Promise<number> {
  const counter = await tx.assetCodeCounter.upsert({
    where: { type },
    create: { type, lastValue: count },
    update: { lastValue: { increment: count } },
  });
  return counter.lastValue - count + 1;
}
