import { prisma } from "@/core/db";
import { logger } from "@/core/logger";
import { ForbiddenError, NotFoundError, TransitionError } from "@/core/errors";
import { checkRateLimit } from "@/core/rate-limit";
import * as assetService from "@/features/assets/service";
import { ALLOWED_TRANSITIONS, OVERDUE_DAYS } from "@/features/reports/constants";
import { processPhoto, savePhoto } from "@/features/reports/photos";
import * as repository from "@/features/reports/repository";
import type { ReportWithAsset } from "@/features/reports/repository";
import type {
  CreateReportInput,
  ReportFilterInput,
  TransitionReportInput,
} from "@/features/reports/schemas";
import type { Report, User } from "@/generated/prisma/client";

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
    await repository.setAssetStatus(tx, asset.id, "ARIZALI");
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

export async function transitionReport(
  reportId: string,
  input: TransitionReportInput,
  actor: User,
): Promise<Report> {
  logger.info("report.transition.started", { reportId, toStatus: input.toStatus, actorId: actor.id });

  // Fotoğraf boru hattı transaction DIŞINDA işlenir (createReport deseni) —
  // dosya yazımı iş kuralı hatası yüzünden transaction ile geri alınmaz.
  let resolvedPhoto: string | undefined;
  if (input.resolvedPhoto) {
    resolvedPhoto = await savePhoto(await processPhoto(input.resolvedPhoto));
  }

  return prisma.$transaction(async (tx) => {
    const report = await repository.getReportById(tx, reportId);
    if (!report) throw new NotFoundError("Bildirim bulunamadı.");
    if (!ALLOWED_TRANSITIONS[report.status].includes(input.toStatus)) {
      throw new TransitionError(
        `${report.status} durumundaki bir kayıt ${input.toStatus} yapılamaz.`,
      );
    }
    if (input.toStatus === "REDDEDILDI" && actor.role !== "YONETICI") {
      throw new ForbiddenError("Yalnızca yönetici bildirimi reddedebilir.");
    }

    const closedAt =
      input.toStatus === "ONARILDI" || input.toStatus === "REDDEDILDI" ? new Date() : undefined;
    const updated = await repository.updateReportStatus(tx, reportId, {
      status: input.toStatus,
      resolutionNote: input.note,
      resolvedPhoto,
      closedAt,
    });
    await repository.createReportEvent(tx, {
      reportId,
      fromStatus: report.status,
      toStatus: input.toStatus,
      note: input.note,
      actorId: actor.id,
    });

    const openCount = await repository.countOpenReports(tx, report.assetId);
    if (openCount === 0) {
      await tx.asset.updateMany({
        where: { id: report.assetId, status: "ARIZALI" },
        data: { status: "AKTIF" },
      });
    }

    logger.info("report.transition.success", { reportId, toStatus: input.toStatus });
    return updated;
  });
}

export async function listReports(filter: ReportFilterInput): Promise<ReportWithAsset[]> {
  return repository.listReports(filter);
}

export async function getReport(id: string): Promise<repository.ReportDetail> {
  const report = await repository.getReportById(prisma, id);
  if (!report) throw new NotFoundError("Bildirim bulunamadı.");
  return report;
}

export async function getReportAssetHistory(
  assetId: string,
  months = 12,
): Promise<Report[]> {
  const since = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);
  return repository.listReportsByAsset(assetId, since);
}

export function isReportOverdue(report: Pick<Report, "status" | "createdAt">): boolean {
  const overdueMs = OVERDUE_DAYS * 24 * 60 * 60 * 1000;
  return (
    (report.status === "YENI" || report.status === "ATANDI") &&
    Date.now() - report.createdAt.getTime() > overdueMs
  );
}
