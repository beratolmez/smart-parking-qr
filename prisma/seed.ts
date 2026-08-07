import "dotenv/config";
import { mkdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "@/core/db";
import { config } from "@/core/config";
import * as assetService from "@/features/assets/service";
import { hashPassword } from "@/features/auth/service";
import { savePhoto } from "@/features/reports/photos";
import type { Asset } from "@/generated/prisma/client";
import type { AssetType, ReportStatus } from "@/generated/prisma/enums";

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
const DAY_MS = 24 * 60 * 60 * 1000;

function randomPastDate(): Date {
  return new Date(Date.now() - Math.floor(Math.random() * THREE_YEARS_MS));
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

async function allocateTicketNo(): Promise<number> {
  const counter = await prisma.reportCounter.upsert({
    where: { id: 1 },
    create: { id: 1, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return counter.lastValue;
}

function photoBuffer(color: string): Promise<Buffer> {
  return sharp({ create: { width: 800, height: 600, channels: 3, background: color } })
    .webp()
    .toBuffer();
}

async function createReportWithEvents(params: {
  asset: Asset;
  status: ReportStatus;
  createdAt: Date;
  closedAt?: Date;
  resolutionNote?: string;
  personelId: string;
  yoneticiId: string;
  ticketNo: number;
  photoUrl: string;
  resolvedPhotoUrl?: string;
}) {
  const { asset, status, createdAt, closedAt, resolutionNote, personelId, yoneticiId } = params;

  const report = await prisma.report.create({
    data: {
      ticketNo: params.ticketNo,
      asset: { connect: { id: asset.id } },
      issueType: "KIRIK_HASARLI",
      description: "Sahada tespit edilen hasar.",
      reporterType: "VATANDAS",
      photoUrl: params.photoUrl,
      status,
      createdAt,
      resolvedPhoto: params.resolvedPhotoUrl,
      ...(status === "ONARILDI" || status === "REDDEDILDI" ? { closedAt } : {}),
      ...(resolutionNote ? { resolutionNote } : {}),
    },
  });

  const eventData = [];
  if (status === "ONARILDI") {
    const assignedAt = new Date(report.createdAt.getTime() + DAY_MS);
    eventData.push({
      reportId: report.id,
      fromStatus: "YENI" as const,
      toStatus: "ATANDI" as const,
      note: "Üstlenildi.",
      actorId: personelId,
      createdAt: assignedAt,
    });
    eventData.push({
      reportId: report.id,
      fromStatus: "ATANDI" as const,
      toStatus: "ONARILDI" as const,
      note: resolutionNote ?? "Onarım tamamlandı.",
      actorId: personelId,
      createdAt: closedAt ?? report.createdAt,
    });
  } else if (status === "ATANDI") {
    eventData.push({
      reportId: report.id,
      fromStatus: "YENI" as const,
      toStatus: "ATANDI" as const,
      note: "Üstlenildi.",
      actorId: personelId,
      createdAt: new Date(report.createdAt.getTime() + DAY_MS),
    });
  } else if (status === "REDDEDILDI") {
    eventData.push({
      reportId: report.id,
      fromStatus: "YENI" as const,
      toStatus: "REDDEDILDI" as const,
      note: resolutionNote ?? "Bildirim gerekçesi bulunamadı.",
      actorId: yoneticiId,
      createdAt: closedAt ?? report.createdAt,
    });
  }

  if (eventData.length > 0) {
    await prisma.reportEvent.createMany({ data: eventData });
  }

  return report;
}

async function main() {
  console.log("Seed başlıyor: mevcut veriler temizleniyor...");
  await prisma.reportEvent.deleteMany();
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();
  await prisma.reportCounter.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.park.deleteMany();
  await prisma.assetCodeCounter.deleteMany();
  await rm(config.UPLOAD_DIR, { recursive: true, force: true });
  await mkdir(config.UPLOAD_DIR, { recursive: true });

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

  const yonetici = await prisma.user.create({
    data: {
      username: "yonetici",
      passwordHash: await hashPassword("yonetici123"),
      fullName: "Yönetici",
      role: "YONETICI",
    },
  });
  const personel = await prisma.user.create({
    data: {
      username: "personel",
      passwordHash: await hashPassword("personel123"),
      fullName: "Saha Personeli",
      role: "SAHA_GOREVLISI",
    },
  });
  console.log("Kullanıcılar oluşturuldu: yonetici, personel");

  const allAssets = await prisma.asset.findMany({ orderBy: { code: "asc" } });

  const plan: {
    status: ReportStatus;
    createdDaysAgo: number;
    resolutionNote?: string;
  }[] = [
    // YENI ×5 (3'ü 7+ gün → gecikme rozeti)
    { status: "YENI", createdDaysAgo: 1 },
    { status: "YENI", createdDaysAgo: 2 },
    { status: "YENI", createdDaysAgo: 4 },
    { status: "YENI", createdDaysAgo: 8 },
    { status: "YENI", createdDaysAgo: 12 },
    // ATANDI ×5 (2'si gecikmiş)
    { status: "ATANDI", createdDaysAgo: 1 },
    { status: "ATANDI", createdDaysAgo: 3 },
    { status: "ATANDI", createdDaysAgo: 6 },
    { status: "ATANDI", createdDaysAgo: 9 },
    { status: "ATANDI", createdDaysAgo: 15 },
    // ONARILDI ×8
    { status: "ONARILDI", createdDaysAgo: 4, resolutionNote: "Kaynak yapıldı, boya yenilendi." },
    { status: "ONARILDI", createdDaysAgo: 6, resolutionNote: "Boya yenilendi." },
    { status: "ONARILDI", createdDaysAgo: 10, resolutionNote: "Vida sıkıldı, denge kontrolü yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 12, resolutionNote: "Parça değişimi yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 15, resolutionNote: "Temizlik ve bakım yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 20, resolutionNote: "Kaynak yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 25, resolutionNote: "Yeni kilit takıldı." },
    { status: "ONARILDI", createdDaysAgo: 30, resolutionNote: "Uyarı tabelası eklendi." },
    // REDDEDILDI ×2
    { status: "REDDEDILDI", createdDaysAgo: 7, resolutionNote: "Fotoğraf konumla uyuşmuyor." },
    { status: "REDDEDILDI", createdDaysAgo: 18, resolutionNote: "Mükerrer ve asılsız bildirim." },
  ];

  const colors = ["#cbd5e1", "#fde68a", "#93c5fd", "#bbf7d0", "#fecaca"];
  let reportCount = 0;

  for (let i = 0; i < plan.length; i++) {
    const asset = allAssets[i];
    const entry = plan[i];
    const createdAt = daysAgo(entry.createdDaysAgo);
    const closedAt =
      entry.status === "ONARILDI" || entry.status === "REDDEDILDI"
        ? new Date(createdAt.getTime() + 2 * DAY_MS)
        : undefined;

    const photoUrl = await savePhoto(await photoBuffer(colors[i % colors.length]));
    const resolvedPhotoUrl =
      entry.status === "ONARILDI" ? await savePhoto(await photoBuffer(colors[(i + 2) % colors.length])) : undefined;

    await createReportWithEvents({
      asset,
      status: entry.status,
      createdAt,
      closedAt,
      resolutionNote: entry.resolutionNote,
      personelId: personel.id,
      yoneticiId: yonetici.id,
      ticketNo: await allocateTicketNo(),
      photoUrl,
      resolvedPhotoUrl,
    });
    reportCount += 1;
  }

  const openAssets = await prisma.asset.findMany({
    where: { reports: { some: { status: { in: ["YENI", "ATANDI"] } } } },
    select: { id: true },
  });
  await prisma.asset.updateMany({
    where: { id: { in: openAssets.map((a) => a.id) } },
    data: { status: "ARIZALI" },
  });

  console.log(`Seed tamamlandı: 1 park, ${totalCreated} demirbaş, ${reportCount} bildirim.`);
}

main()
  .catch((e) => {
    console.error("Seed başarısız:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
