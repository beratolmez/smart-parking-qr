import { notFound } from "next/navigation";
import * as assetService from "@/features/assets/service";
import { AssetForm } from "@/features/assets/components/AssetForm";
import { requireRole } from "@/features/auth/dal";
import { NotFoundError } from "@/core/errors";

export default async function DuzenlePage(props: PageProps<"/panel/demirbaslar/[id]/duzenle">) {
  await requireRole("YONETICI");
  const { id } = await props.params;

  const [asset, parks] = await Promise.all([
    assetService.getAsset(id).catch((e) => {
      if (e instanceof NotFoundError) return null;
      throw e;
    }),
    assetService.listParks(),
  ]);

  if (!asset) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Demirbaş Düzenle
      </h1>
      <AssetForm mode="edit" parks={parks} asset={asset} />
    </div>
  );
}
