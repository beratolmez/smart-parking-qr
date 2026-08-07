import { Card } from "@/shared/ui/Card";

export interface TrendChartPoint {
  label: string;
  opened: number;
  closed: number;
}

export interface TrendChartProps {
  points: TrendChartPoint[];
}

export function TrendChart({ points }: TrendChartProps) {
  const max = Math.max(...points.flatMap((p) => [p.opened, p.closed]), 1);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Aylık Trend (son 6 ay)
        </h2>
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-zinc-900 dark:bg-zinc-50" />
            Açılan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Kapanan
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-[420px] items-end justify-between gap-2">
          {points.map((point) => {
            const openedHeight = (point.opened / max) * 96;
            const closedHeight = (point.closed / max) * 96;
            return (
              <div
                key={point.label}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div className="flex items-end gap-1">
                  <div
                    className="w-3 rounded-t bg-zinc-900 dark:bg-zinc-50"
                    style={{ height: `${Math.max(openedHeight, 2)}px` }}
                  />
                  <div
                    className="w-3 rounded-t bg-emerald-500"
                    style={{ height: `${Math.max(closedHeight, 2)}px` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{point.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
