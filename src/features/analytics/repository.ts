import { prisma } from "@/core/db";
import {
  type AssetStatus,
  type AssetType,
  type IssueType,
  type ReportStatus,
} from "@/generated/prisma/client";
import { OVERDUE_DAYS } from "@/features/analytics/constants";

export interface ResolvedTimeRow {
  createdAt: Date;
  closedAt: Date | null;
}

export async function countOpenReports(): Promise<number> {
  return prisma.report.count({ where: { status: { in: ["YENI", "ATANDI"] } } });
}

export async function countOverdueReports(): Promise<number> {
  return prisma.report.count({
    where: {
      status: { in: ["YENI", "ATANDI"] },
      createdAt: { lt: new Date(Date.now() - OVERDUE_DAYS * 24 * 60 * 60 * 1000) },
    },
  });
}

export async function findResolvedTimes(): Promise<ResolvedTimeRow[]> {
  return prisma.report.findMany({
    where: { status: "ONARILDI" },
    select: { createdAt: true, closedAt: true },
  });
}

export interface AssetFaultCount {
  assetId: string;
  count: number;
}

export async function countFaultsPerAsset(
  since: Date,
  limit: number,
): Promise<AssetFaultCount[]> {
  // Prisma 7 groupBy `_count._all` orderBy tiplenmediği için findMany + JS gruplama
  // kullanılır (planın düşüş planı; demo ölçeğinde ~53 kayıt, maliyet önemsiz).
  const rows = await prisma.report.findMany({
    where: { createdAt: { gte: since } },
    select: { assetId: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.assetId, (counts.get(row.assetId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([assetId, count]) => ({ assetId, count }))
    .sort((a, b) => b.count - a.count || a.assetId.localeCompare(b.assetId))
    .slice(0, limit);
}

export interface AssetWithParkRow {
  id: string;
  code: string;
  type: AssetType;
  status: AssetStatus;
  park: { name: string };
}

export async function findAssetsByIds(ids: string[]): Promise<AssetWithParkRow[]> {
  return prisma.asset.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      park: { select: { name: true } },
    },
  });
}

export interface DistributionRow {
  status: ReportStatus;
  issueType: IssueType;
  parkName: string;
}

export async function findReportsForDistribution(): Promise<DistributionRow[]> {
  const rows = await prisma.report.findMany({
    select: {
      status: true,
      issueType: true,
      asset: { select: { park: { select: { name: true } } } },
    },
  });
  return rows.map((row) => ({ status: row.status, issueType: row.issueType, parkName: row.asset.park.name }));
}

export interface TypeCountRow {
  issueType: IssueType;
  count: number;
}

export async function countFaultsByType(): Promise<TypeCountRow[]> {
  // groupBy `_count._all` orderBy Prisma 7'de tiplenmediği için findMany + JS gruplama.
  const rows = await prisma.report.findMany({ select: { issueType: true } });
  const counts = new Map<IssueType, number>();
  for (const row of rows) {
    counts.set(row.issueType, (counts.get(row.issueType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([issueType, count]) => ({ issueType, count }))
    .sort((a, b) => b.count - a.count || a.issueType.localeCompare(b.issueType));
}

export interface TrendRow {
  createdAt: Date;
  closedAt: Date | null;
}

export async function findReportsForTrend(since: Date): Promise<TrendRow[]> {
  return prisma.report.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, closedAt: true },
  });
}
