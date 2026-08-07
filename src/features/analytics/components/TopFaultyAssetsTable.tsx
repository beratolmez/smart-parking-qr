import type { TopFaultyAsset } from "@/features/analytics/service";
import { ASSET_TYPE_LABELS } from "@/features/assets/constants";
import { EmptyState } from "@/shared/ui/EmptyState";

export interface TopFaultyAssetsTableProps {
  assets: TopFaultyAsset[];
}

export function TopFaultyAssetsTable({ assets }: TopFaultyAssetsTableProps) {
  if (assets.length === 0) {
    return <EmptyState message="Henüz arıza kaydı yok." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Kod</th>
            <th scope="col" className="px-4 py-3 font-medium">Tür</th>
            <th scope="col" className="px-4 py-3 font-medium">Park</th>
            <th scope="col" className="px-4 py-3 font-medium">Bildirim Sayısı</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {assets.map((asset) => (
            <tr key={asset.code}>
              <td className="px-4 py-3 font-mono text-zinc-900 dark:text-zinc-50">{asset.code}</td>
              <td className="px-4 py-3">{ASSET_TYPE_LABELS[asset.type]}</td>
              <td className="px-4 py-3">{asset.parkName}</td>
              <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                {asset.count} bildirim
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
