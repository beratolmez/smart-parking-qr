import * as assetService from "@/features/assets/service";
import { LabelSheet } from "@/features/assets/components/LabelSheet";
import { PrintButton } from "@/features/assets/components/PrintButton";
import { EmptyState } from "@/shared/ui/EmptyState";

export default async function EtiketlerPage(props: PageProps<"/panel/etiketler">) {
  const searchParams = await props.searchParams;
  const rawIds = searchParams.ids;
  const rawParkId = searchParams.parkId;

  const idsParam = Array.isArray(rawIds) ? rawIds[0] : rawIds;
  const parkIdParam = Array.isArray(rawParkId) ? rawParkId[0] : rawParkId;

  const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined;
  const parks = await assetService.listParks();

  const assets = await assetService.listAssetsForLabels({ ids, parkId: parkIdParam });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Etiketler</h1>
        {assets.length > 0 && <PrintButton />}
      </div>

      {!ids && !parkIdParam && (
        <form method="GET" className="flex items-end gap-4 no-print">
          <div className="flex flex-col gap-1">
            <label htmlFor="parkId" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Park seçin
            </label>
            <select
              id="parkId"
              name="parkId"
              defaultValue=""
              className="min-h-11 rounded border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              required
            >
              <option value="" disabled>
                Seçin
              </option>
              {parks.map((park) => (
                <option key={park.id} value={park.id}>
                  {park.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="min-h-11 rounded-full border border-zinc-300 px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Etiketleri Göster
          </button>
        </form>
      )}

      {assets.length === 0 ? (
        <EmptyState message="Yazdırılacak demirbaş bulunamadı." />
      ) : (
        <LabelSheet assets={assets} />
      )}
    </div>
  );
}
