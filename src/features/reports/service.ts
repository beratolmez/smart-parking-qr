import { prisma } from "@/core/db";
import { logger } from "@/core/logger";
import { checkRateLimit } from "@/core/rate-limit";
import * as assetService from "@/features/assets/service";
import { processPhoto, savePhoto } from "@/features/reports/photos";
import * as repository from "@/features/reports/repository";
import type { CreateReportInput } from "@/features/reports/schemas";
import type { Report } from "@/generated/prisma/client";

const PER_ASSET_WINDOW_MS = 5 * 60 * 1000; // 5 dakika
const PER_IP_WINDOW_MS = 60 * 60 * 1000; // 1 saat
const PER_IP_LIMIT = 20;

export interface CreateReportResult {
  report: Report;
  duplicate: boolean;
}

export async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
  logger.info("report.create.started", { code: input.assetCode, issueType: input.issueType });

  const asset = await assetService.getAssetByCode(input.assetCode); // NotFoundError("Demirbaş bulunamadı.")

  const openReport = await repository.findOpenReport(prisma, asset.id);
  const photoUrl = await savePhoto(await processPhoto(input.photo));

  if (openReport) {
    const updated = await repository.registerDuplicate(prisma, openReport.id, photoUrl);
    logger.info("report.create.duplicate", {
      ticketNo: updated.ticketNo,
      count: updated.duplicateCount,
    });
    return { report: updated, duplicate: true };
  }

  checkRateLimit(`report:${input.clientIp}:${asset.id}`, 1, PER_ASSET_WINDOW_MS);
  checkRateLimit(`report:${input.clientIp}`, PER_IP_LIMIT, PER_IP_WINDOW_MS);

  const result = await prisma.$transaction(async (tx) => {
    const stillOpen = await repository.findOpenReport(tx, asset.id);
    if (stillOpen) {
      const report = await repository.registerDuplicate(tx, stillOpen.id, photoUrl);
      return { report, isDuplicate: true };
    }
    const ticketNo = await repository.allocateTicketNo(tx);
    const report = await repository.createReport(tx, {
      ticketNo,
      asset: { connect: { id: asset.id } },
      issueType: input.issueType,
      description: input.description,
      reporterPhone: input.reporterPhone,
      reporterType: "VATANDAS",
      photoUrl,
    });
    return { report, isDuplicate: false };
  });

  const duplicate = result.isDuplicate;
  logger.info(duplicate ? "report.create.duplicate" : "report.create.success", {
    ticketNo: result.report.ticketNo,
  });
  return { report: result.report, duplicate };
}

export async function getOpenReport(assetId: string): Promise<Report | null> {
  return repository.findOpenReport(prisma, assetId);
}
