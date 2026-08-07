import { prisma } from "@/core/db";
import {
  Prisma,
  type Asset,
  type AssetStatus,
  type Park,
  type Report,
  type ReportEvent,
  type ReportStatus,
} from "@/generated/prisma/client";
import { OVERDUE_DAYS } from "@/features/reports/constants";
import type { ReportFilterInput } from "@/features/reports/schemas";

export type ReportWithAsset = Report & { asset: Asset & { park: Park } };

export type ReportEventWithActor = ReportEvent & {
  actor: { id: string; fullName: string; username: string } | null;
};

export type ReportDetail = ReportWithAsset & { events: ReportEventWithActor[] };

export async function findOpenReport(
  tx: Prisma.TransactionClient,
  assetId: string,
): Promise<Report | null> {
  return tx.report.findFirst({
    where: { assetId, status: { in: ["YENI", "ATANDI"] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createReport(
  tx: Prisma.TransactionClient,
  data: Prisma.ReportCreateInput,
): Promise<Report> {
  return tx.report.create({ data });
}

export async function registerDuplicate(
  tx: Prisma.TransactionClient,
  reportId: string,
  photoUrl: string,
): Promise<Report> {
  return tx.report.update({
    where: { id: reportId },
    data: { duplicateCount: { increment: 1 }, photoUrl },
  });
}

/** Takip numarası tahsisinde yarış koşulunu engelleyen atomik sayaç. */
export async function allocateTicketNo(tx: Prisma.TransactionClient): Promise<number> {
  const counter = await tx.reportCounter.upsert({
    where: { id: 1 },
    create: { id: 1, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return counter.lastValue;
}

export async function listReports(filter: ReportFilterInput): Promise<ReportWithAsset[]> {
  return prisma.report.findMany({
    where: {
      status: filter.status,
      asset: filter.parkId ? { parkId: filter.parkId } : undefined,
      ...(filter.overdue
        ? {
            status: { in: ["YENI", "ATANDI"] },
            createdAt: { lt: new Date(Date.now() - OVERDUE_DAYS * 24 * 60 * 60 * 1000) },
          }
        : {}),
    },
    include: { asset: { include: { park: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReportById(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<ReportDetail | null> {
  return tx.report.findUnique({
    where: { id },
    include: {
      asset: { include: { park: true } },
      events: {
        include: { actor: { select: { id: true, fullName: true, username: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function listReportsByAsset(assetId: string, since: Date): Promise<Report[]> {
  return prisma.report.findMany({
    where: { assetId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateReportStatus(
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.ReportUpdateInput,
): Promise<Report> {
  return tx.report.update({ where: { id }, data });
}

export interface CreateReportEventInput {
  reportId: string;
  fromStatus?: ReportStatus;
  toStatus: ReportStatus;
  note?: string;
  actorId?: string;
}

export async function createReportEvent(
  tx: Prisma.TransactionClient,
  data: CreateReportEventInput,
): Promise<ReportEvent> {
  return tx.reportEvent.create({ data });
}

export async function countOpenReports(
  tx: Prisma.TransactionClient,
  assetId: string,
): Promise<number> {
  return tx.report.count({
    where: { assetId, status: { in: ["YENI", "ATANDI"] } },
  });
}

export async function setAssetStatus(
  tx: Prisma.TransactionClient,
  assetId: string,
  status: AssetStatus,
): Promise<Asset> {
  return tx.asset.update({ where: { id: assetId }, data: { status } });
}
