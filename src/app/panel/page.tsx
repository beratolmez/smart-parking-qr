import { formatDurationTR } from "@/shared/format";
import * as analyticsService from "@/features/analytics/service";
import { MetricCard } from "@/features/analytics/components/MetricCard";
import { HorizontalBarChart } from "@/features/analytics/components/HorizontalBarChart";
import { TrendChart } from "@/features/analytics/components/TrendChart";
import { TopFaultyAssetsTable } from "@/features/analytics/components/TopFaultyAssetsTable";
import { ISSUE_TYPE_LABELS } from "@/features/reports/constants";
import { EmptyState } from "@/shared/ui/EmptyState";

export default async function PanelPage() {
  const data = await analyticsService.getDashboardData();
  const avgLabel =
    data.avgResolutionHours === null
      ? "—"
      : formatDurationTR(Math.round(data.avgResolutionHours * 3_600_000));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Gösterge Paneli</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Açık Bildirim" value={String(data.openCount)} />
        <MetricCard label="Geciken Bildirim" value={String(data.overdueCount)} hint="7 günden eski açık" />
        <MetricCard label="Ortalama Çözüm Süresi" value={avgLabel} />
        <MetricCard label="Toplam Bildirim" value={String(data.totalCount)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            En Çok Arıza Veren Demirbaşlar
          </h2>
          <TopFaultyAssetsTable assets={data.topFaultyAssets} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Sorun Türü Dağılımı
          </h2>
          {data.typeDistribution.length === 0 ? (
            <EmptyState message="Henüz bildirim yok." />
          ) : (
            <HorizontalBarChart
              title=""
              emptyMessage="Henüz bildirim yok."
              items={data.typeDistribution.map((d) => ({
                label: ISSUE_TYPE_LABELS[d.issueType],
                value: d.count,
              }))}
            />
          )}
        </section>
      </div>

      {data.parkDistribution.length === 0 ? (
        <EmptyState message="Henüz park verisi yok." />
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Park Bazında Dağılım
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <HorizontalBarChart
              title="Açık"
              emptyMessage="Bu parkta açık bildirim yok."
              items={data.parkDistribution.map((p) => ({
                label: p.parkName,
                value: p.open,
                color: "bg-zinc-900 dark:bg-zinc-50",
              }))}
            />
            <HorizontalBarChart
              title="Kapalı"
              emptyMessage="Bu parkta kapalı bildirim yok."
              items={data.parkDistribution.map((p) => ({
                label: p.parkName,
                value: p.closed,
                color: "bg-emerald-500",
              }))}
            />
          </div>
        </section>
      )}

      <TrendChart points={data.monthlyTrend} />
    </div>
  );
}
