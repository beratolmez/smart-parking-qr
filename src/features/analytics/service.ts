import { logger } from "@/core/logger";
import * as repository from "@/features/analytics/repository";
import {
  TOP_ASSETS_LIMIT,
  TOP_ASSETS_MONTHS,
  TREND_MONTHS,
} from "@/features/analytics/constants";
import type { AssetType, IssueType } from "@/generated/prisma/enums";

export interface TopFaultyAsset {
  code: string;
  type: AssetType;
  parkName: string;
  count: number;
}

export interface ParkDistribution {
  parkName: string;
  open: number;
  closed: number;
}

export interface TypeDistribution {
  issueType: IssueType;
  count: number;
}

export interface TrendPoint {
  label: string;
  key: string;
  opened: number;
  closed: number;
}

export interface DashboardData {
  openCount: number;
  overdueCount: number;
  avgResolutionHours: number | null;
  totalCount: number;
  topFaultyAssets: TopFaultyAsset[];
  parkDistribution: ParkDistribution[];
  typeDistribution: TypeDistribution[];
  monthlyTrend: TrendPoint[];
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit" }).format(
    new Date(y, m - 1, 1),
  );
}

export function buildMonthlyTrend(rows: repository.TrendRow[]): TrendPoint[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }

  const points = keys.map((key) => ({ label: monthLabel(key), key, opened: 0, closed: 0 }));

  for (const row of rows) {
    const openedKey = monthKey(row.createdAt);
    const openedPoint = points.find((p) => p.key === openedKey);
    if (openedPoint) openedPoint.opened += 1;

    if (row.closedAt) {
      const closedKey = monthKey(row.closedAt);
      const closedPoint = points.find((p) => p.key === closedKey);
      if (closedPoint) closedPoint.closed += 1;
    }
  }

  return points;
}

export async function getDashboardData(): Promise<DashboardData> {
  logger.info("analytics.dashboard.started");
  const sinceTrend = new Date(Date.now() - (TREND_MONTHS - 1) * MONTH_MS);
  const sinceTop = new Date(Date.now() - TOP_ASSETS_MONTHS * MONTH_MS);

  const [
    openCount,
    overdueCount,
    resolvedTimes,
    faultCounts,
    typeCounts,
    distRows,
    trendRows,
  ] = await Promise.all([
    repository.countOpenReports(),
    repository.countOverdueReports(),
    repository.findResolvedTimes(),
    repository.countFaultsPerAsset(sinceTop, TOP_ASSETS_LIMIT),
    repository.countFaultsByType(),
    repository.findReportsForDistribution(),
    repository.findReportsForTrend(sinceTrend),
  ]);

  const resolved = resolvedTimes.filter(
    (r): r is repository.ResolvedTimeRow & { closedAt: Date } => r.closedAt !== null,
  );
  const avgResolutionHours =
    resolved.length === 0
      ? null
      : Math.round(
          (resolved.reduce(
            (s, r) => s + (r.closedAt.getTime() - r.createdAt.getTime()),
            0,
          ) /
            resolved.length /
            HOUR_MS) *
            10,
        ) / 10;

  const assetRows = await repository.findAssetsByIds(faultCounts.map((f) => f.assetId));
  const assetMap = new Map(assetRows.map((a) => [a.id, a]));
  const topFaultyAssets = faultCounts
    .map((f) => ({
      code: assetMap.get(f.assetId)?.code ?? "?",
      type: assetMap.get(f.assetId)?.type ?? "DIGER",
      parkName: assetMap.get(f.assetId)?.park.name ?? "?",
      count: f.count,
    }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  const parkMap = new Map<string, ParkDistribution>();
  for (const row of distRows) {
    const entry = parkMap.get(row.parkName) ?? { parkName: row.parkName, open: 0, closed: 0 };
    if (row.status === "YENI" || row.status === "ATANDI") entry.open += 1;
    else entry.closed += 1;
    parkMap.set(row.parkName, entry);
  }
  const parkDistribution = [...parkMap.values()].sort((a, b) =>
    a.parkName.localeCompare(b.parkName, "tr"),
  );

  logger.info("analytics.dashboard.success", { openCount, overdueCount });
  return {
    openCount,
    overdueCount,
    avgResolutionHours,
    totalCount: distRows.length,
    topFaultyAssets,
    parkDistribution,
    typeDistribution: typeCounts,
    monthlyTrend: buildMonthlyTrend(trendRows),
  };
}
