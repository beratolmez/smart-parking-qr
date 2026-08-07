import * as assetService from "@/features/assets/service";
import { AssetForm } from "@/features/assets/components/AssetForm";

export default async function YeniDemirbasPage() {
  const parks = await assetService.listParks();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Yeni Demirbaş</h1>
      <AssetForm mode="create" parks={parks} />
    </div>
  );
}
