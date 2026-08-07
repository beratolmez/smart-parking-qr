import { Card } from "@/shared/ui/Card";
import { EmptyState } from "@/shared/ui/EmptyState";

export interface HorizontalBarItem {
  label: string;
  value: number;
  color?: string;
}

export interface HorizontalBarChartProps {
  title: string;
  items: HorizontalBarItem[];
  emptyMessage: string;
}

export function HorizontalBarChart({ title, items, emptyMessage }: HorizontalBarChartProps) {
  if (items.length === 0) {
    return (
      <Card>
        {title ? (
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        ) : null}
        <EmptyState message={emptyMessage} />
      </Card>
    );
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <Card>
      {title ? (
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      ) : null}
      <div className="overflow-x-auto">
        <div className="flex min-w-[320px] flex-col gap-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-36 truncate text-sm text-zinc-700 dark:text-zinc-300">
                {item.label}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${
                    item.color ?? "bg-zinc-900 dark:bg-zinc-50"
                  }`}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
