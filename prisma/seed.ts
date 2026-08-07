import "dotenv/config";
import { prisma } from "@/core/db";
import * as assetService from "@/features/assets/service";
import type { AssetType } from "@/generated/prisma/enums";

const PARK = { name: "Cumhuriyet Parkı", district: "Merkez Mahallesi" };

const DISTRIBUTION: { type: AssetType; count: number }[] = [
  { type: "BANK", count: 14 },
  { type: "COP_KUTUSU", count: 6 },
  { type: "SPOR_ALETI", count: 4 },
  { type: "SALINCAK", count: 3 },
  { type: "KAYDIRAK", count: 2 },
  { type: "OYUN_GRUBU", count: 2 },
  { type: "AYDINLATMA", count: 2 },
  { type: "TAHTEREVALLI", count: 1 },
  { type: "CESME", count: 1 },
];

const THREE_YEARS_MS = 3 * 365 * 24 * 60 * 60 * 1000;

function randomPastDate(): Date {
  return new Date(Date.now() - Math.floor(Math.random() * THREE_YEARS_MS));
}

async function main() {
  console.log("Seed başlıyor: mevcut veriler temizleniyor...");
  await prisma.asset.deleteMany();
  await prisma.park.deleteMany();
  await prisma.assetCodeCounter.deleteMany();

  const park = await prisma.park.create({ data: PARK });
  console.log(`Park oluşturuldu: ${park.name}`);

  let totalCreated = 0;
  for (const { type, count } of DISTRIBUTION) {
    const assets = await assetService.createAssets({
      parkId: park.id,
      type,
      count,
    });

    for (const asset of assets) {
      await assetService.updateAsset(asset.id, {
        parkId: park.id,
        type,
        status: "AKTIF",
        installedAt: randomPastDate(),
      });
    }

    totalCreated += assets.length;
    console.log(`${assets.length} ${type} oluşturuldu.`);
  }

  console.log(`Seed tamamlandı: 1 park, ${totalCreated} demirbaş.`);
}

main()
  .catch((e) => {
    console.error("Seed başarısız:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
