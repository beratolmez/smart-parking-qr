import { prisma } from "@/core/db";
import { logger } from "@/core/logger";
import { NotFoundError } from "@/core/errors";
import type { Asset } from "@/generated/prisma/client";
import { formatAssetCode } from "@/features/assets/codes";
import * as repository from "@/features/assets/repository";
import type { AssetWithPark } from "@/features/assets/repository";
import type {
  AssetFilterInput,
  CreateAssetsInput,
  UpdateAssetInput,
} from "@/features/assets/schemas";

export async function createAssets(input: CreateAssetsInput): Promise<Asset[]> {
  logger.info("asset.create.started", { type: input.type, count: input.count });

  const park = await repository.getParkById(input.parkId);
  if (!park) throw new NotFoundError("Seçilen park bulunamadı.");

  const { parkId, type, count, ...rest } = input;

  const assets = await prisma.$transaction(async (tx) => {
    const start = await repository.allocateSequence(tx, type, count);
    const codes = Array.from({ length: count }, (_, i) => formatAssetCode(type, start + i));

    await tx.asset.createMany({
      data: codes.map((code) => ({ ...rest, code, type, parkId })),
    });

    return tx.asset.findMany({ where: { code: { in: codes } }, orderBy: { code: "asc" } });
  });

  logger.info("asset.create.success", { codes: assets.map((a) => a.code) });
  return assets;
}

export async function listAssets(filter: AssetFilterInput): Promise<AssetWithPark[]> {
  return repository.listAssets(filter);
}

export async function getAsset(id: string): Promise<AssetWithPark> {
  const asset = await repository.getAssetById(id);
  if (!asset) throw new NotFoundError("Demirbaş bulunamadı.");
  return asset;
}

export async function getAssetByCode(code: string): Promise<AssetWithPark> {
  const asset = await repository.getAssetByCode(code);
  if (!asset) throw new NotFoundError("Demirbaş bulunamadı.");
  return asset;
}

export async function updateAsset(id: string, input: UpdateAssetInput): Promise<Asset> {
  await getAsset(id);
  logger.info("asset.update.started", { id });
  const asset = await repository.updateAsset(id, input);
  logger.info("asset.update.success", { id });
  return asset;
}

export async function archiveAsset(id: string): Promise<Asset> {
  await getAsset(id);
  logger.info("asset.archive.started", { id });
  const asset = await repository.updateAsset(id, { status: "HURDA" });
  logger.info("asset.archive.success", { id });
  return asset;
}

export async function listParks() {
  return repository.listParks();
}

export async function listAssetsForLabels(input: {
  ids?: string[];
  parkId?: string;
}): Promise<AssetWithPark[]> {
  if (input.ids && input.ids.length > 0) {
    return repository.listAssetsByIds(input.ids);
  }
  if (input.parkId) {
    return repository.listAssets({ parkId: input.parkId });
  }
  return [];
}
