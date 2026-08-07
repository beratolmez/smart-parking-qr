import type { AssetWithPark } from "@/features/assets/repository";
import { ASSET_TYPE_LABELS } from "@/features/assets/constants";
import { qrSvg } from "@/features/assets/qr";
import { config } from "@/core/config";

export interface LabelSheetProps {
  assets: AssetWithPark[];
}

export async function LabelSheet({ assets }: LabelSheetProps) {
  const labels = await Promise.all(
    assets.map(async (asset) => ({
      asset,
      svg: await qrSvg(asset.code, 140),
    })),
  );

  return (
    <div className="label-sheet grid grid-cols-3 gap-4">
      {labels.map(({ asset, svg }) => (
        <div
          key={asset.id}
          className="flex flex-col items-center justify-center gap-1 border border-zinc-300 p-3 text-center dark:border-zinc-700"
          style={{ width: "63.5mm", height: "72mm" }}
        >
          {/* svg, qrcode kütüphanesi tarafından sunucuda üretildi — kullanıcı girdisi değil */}
          <div
            className="h-[35mm] w-[35mm]"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <span className="font-mono text-base font-semibold">{asset.code}</span>
          <span className="text-xs">{ASSET_TYPE_LABELS[asset.type]}</span>
          <span className="text-xs">{config.MUNICIPALITY_NAME}</span>
          <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
            Arıza bildirmek için okutun
          </span>
        </div>
      ))}
    </div>
  );
}
