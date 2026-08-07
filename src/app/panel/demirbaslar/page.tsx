import Link from "next/link";
import * as assetService from "@/features/assets/service";
import { assetFilterSchema } from "@/features/assets/schemas";
import { AssetTable } from "@/features/assets/components/AssetTable";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Button } from "@/shared/ui/Button";
import { ASSET_STATUS_LABELS, ASSET_TYPE_LABELS, ASSET_STATUSES, ASSET_TYPES } from "@/features/assets/constants";

export default async function DemirbaslarPage(props: PageProps<"/panel/demirbaslar">) {
  const rawSearchParams = await props.searchParams;
  const filter = assetFilterSchema.parse({
    parkId: rawSearchParams.parkId ?? "",
    type: rawSearchParams.type ?? "",
    status: rawSearchParams.status ?? "",
  });

  const [assets, parks] = await Promise.all([
    assetService.listAssets(filter),
    assetService.listParks(),
  ]);

  const sortedParks = [...parks].sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Demirbaşlar</h1>
        <Link
          href="/panel/demirbaslar/yeni"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-50"
        >
          Yeni Demirbaş Ekle
        </Link>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="parkId" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Park
          </label>
          <select
            id="parkId"
            name="parkId"
            defaultValue={filter.parkId ?? ""}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Tümü</option>
            {sortedParks.map((park) => (
              <option key={park.id} value={park.id}>
                {park.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tür
          </label>
          <select
            id="type"
            name="type"
            defaultValue={filter.type ?? ""}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Tümü</option>
            {ASSET_TYPES.map((type) => (
              <option key={type} value={type}>
                {ASSET_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Durum
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filter.status ?? ""}
            className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Tümü</option>
            {ASSET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ASSET_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filtrele
        </Button>
      </form>

      {assets.length === 0 ? (
        <EmptyState message="Henüz demirbaş eklenmemiş." />
      ) : (
        <AssetTable assets={assets} />
      )}
    </div>
  );
}
