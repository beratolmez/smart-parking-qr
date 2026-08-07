import Link from "next/link";
import type { AssetWithPark } from "@/features/assets/repository";
import { ASSET_STATUS_LABELS, ASSET_TYPE_LABELS } from "@/features/assets/constants";
import { formatDateTR } from "@/shared/format";

export interface AssetTableProps {
  assets: AssetWithPark[];
}

export function AssetTable({ assets }: AssetTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Kod</th>
            <th scope="col" className="px-4 py-3 font-medium">Tür</th>
            <th scope="col" className="px-4 py-3 font-medium">Park</th>
            <th scope="col" className="px-4 py-3 font-medium">Etiket</th>
            <th scope="col" className="px-4 py-3 font-medium">Durum</th>
            <th scope="col" className="px-4 py-3 font-medium">Montaj</th>
            <th scope="col" className="px-4 py-3 font-medium">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td className="px-4 py-3 font-mono text-zinc-900 dark:text-zinc-50">{asset.code}</td>
              <td className="px-4 py-3">{ASSET_TYPE_LABELS[asset.type]}</td>
              <td className="px-4 py-3">{asset.park.name}</td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{asset.label ?? "—"}</td>
              <td className="px-4 py-3">{ASSET_STATUS_LABELS[asset.status]}</td>
              <td className="px-4 py-3">{formatDateTR(asset.installedAt)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-3">
                  <Link
                    href={`/panel/demirbaslar/${asset.id}/duzenle`}
                    className="font-medium text-zinc-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:focus-visible:outline-zinc-50"
                  >
                    Düzenle
                  </Link>
                  <a
                    href={`/api/assets/${asset.id}/qr`}
                    className="font-medium text-zinc-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:focus-visible:outline-zinc-50"
                  >
                    QR indir
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
