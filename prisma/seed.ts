import "dotenv/config";
import { mkdir, rm } from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "@/core/db";
import { config } from "@/core/config";
import * as assetService from "@/features/assets/service";
import { hashPassword } from "@/features/auth/service";
import { savePhoto } from "@/features/reports/photos";
import type { Asset } from "@/generated/prisma/client";
import type { AssetType, IssueType, ReportStatus } from "@/generated/prisma/enums";

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

const PARK_2 = { name: "Atatürk Parkı", district: "Yeni Mahallesi" };

const DISTRIBUTION_2: { type: AssetType; count: number }[] = [
  { type: "BANK", count: 2 },
  { type: "SALINCAK", count: 1 },
  { type: "COP_KUTUSU", count: 1 },
  { type: "KAYDIRAK", count: 1 },
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
  issueType: IssueType;
  description: string;
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
      issueType: params.issueType,
      description: params.description,
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

  const park2 = await prisma.park.create({ data: PARK_2 });
  console.log(`Park oluşturuldu: ${park2.name}`);

  for (const { type, count } of DISTRIBUTION_2) {
    const assets = await assetService.createAssets({
      parkId: park2.id,
      type,
      count,
    });

    for (const asset of assets) {
      await assetService.updateAsset(asset.id, {
        parkId: park2.id,
        type,
        status: "AKTIF",
        installedAt: randomPastDate(),
      });
    }

    totalCreated += assets.length;
    console.log(`${assets.length} ${type} oluşturuldu (${park2.name}).`);
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
    code: string;
    issueType: IssueType;
    resolutionDays?: number;
    description?: string;
  }[] = [
    // YENI (6)
    { status: "YENI", createdDaysAgo: 1, code: "BANK-0001", issueType: "KIRIK_HASARLI", description: "Bankın sol ayağı kırılmış, oturulamıyor." },
    { status: "YENI", createdDaysAgo: 2, code: "SALN-0001", issueType: "KIRIK_HASARLI", description: "Salıncak zinciri kopmuş." },
    { status: "YENI", createdDaysAgo: 3, code: "COPK-0001", issueType: "KIRLI", description: "Çöp kutusu dolup taşmış, koku yayıyor." },
    { status: "YENI", createdDaysAgo: 5, code: "KAYD-0003", issueType: "KIRIK_HASARLI", description: "Kaydırak basamağı kırık." },
    { status: "YENI", createdDaysAgo: 8, code: "KAYD-0001", issueType: "BOYA_DOKUNTU", description: "Kaydırağın boyası tamamen soyulmuş." },
    { status: "YENI", createdDaysAgo: 12, code: "SPOR-0001", issueType: "TEHLIKELI", description: "Spor aletinin vidaları gevşemiş." },
    // ATANDI (5)
    { status: "ATANDI", createdDaysAgo: 1, code: "OYUN-0001", issueType: "KIRIK_HASARLI", description: "Oyun grubu platformunda delik var." },
    { status: "ATANDI", createdDaysAgo: 4, code: "AYDN-0001", issueType: "DIGER", description: "Aydınlatma gece çalışmıyor." },
    { status: "ATANDI", createdDaysAgo: 9, code: "CSME-0001", issueType: "KIRIK_HASARLI", description: "Çeşme musluğu kırılmış." },
    { status: "ATANDI", createdDaysAgo: 14, code: "BANK-0002", issueType: "KIRLI", description: "Bank üzeri yazıyla kaplanmış." },
    { status: "ATANDI", createdDaysAgo: 16, code: "THTR-0001", issueType: "TEHLIKELI", description: "Tahterevalli menteşesi bozulmuş." },
    // ONARILDI (38) — 6 aya yayılmış
    { status: "ONARILDI", createdDaysAgo: 160, code: "BANK-0005", issueType: "KIRIK_HASARLI", resolutionDays: 5, description: "Tahta çıta değişimi yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 150, code: "SALN-0001", issueType: "KIRIK_HASARLI", resolutionDays: 3, description: "Zincir kaynak yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 148, code: "COPK-0005", issueType: "KIRLI", resolutionDays: 1, description: "Kutu boşaltıldı, temizlendi." },
    { status: "ONARILDI", createdDaysAgo: 140, code: "BANK-0001", issueType: "KIRIK_HASARLI", resolutionDays: 2, description: "Ayak kaynak yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 132, code: "COPK-0002", issueType: "KIRLI", resolutionDays: 1, description: "Temizlik yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 128, code: "BANK-0006", issueType: "KIRIK_HASARLI", resolutionDays: 3, description: "Koltuk yenilendi." },
    { status: "ONARILDI", createdDaysAgo: 120, code: "OYUN-0001", issueType: "KIRIK_HASARLI", resolutionDays: 4, description: "Platform onarıldı." },
    { status: "ONARILDI", createdDaysAgo: 112, code: "SALN-0001", issueType: "KIRIK_HASARLI", resolutionDays: 2, description: "Bağlantı halkası değişti." },
    { status: "ONARILDI", createdDaysAgo: 110, code: "SPOR-0001", issueType: "KIRIK_HASARLI", resolutionDays: 4, description: "Kablo değişimi yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 105, code: "SPOR-0002", issueType: "BOYA_DOKUNTU", resolutionDays: 1, description: "Rötuş boya yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 98, code: "OYUN-0002", issueType: "BOYA_DOKUNTU", resolutionDays: 2, description: "Boyama yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 95, code: "BANK-0001", issueType: "BOYA_DOKUNTU", resolutionDays: 2, description: "Rötuş boya yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 90, code: "SALN-0004", issueType: "KIRIK_HASARLI", resolutionDays: 2, description: "Koltuğa kaynak yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 88, code: "KAYD-0001", issueType: "TEHLIKELI", resolutionDays: 5, description: "Sağlamlaştırma çalışması yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 85, code: "BANK-0007", issueType: "KIRLI", resolutionDays: 1, description: "Temizlik yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 80, code: "CSME-0001", issueType: "DIGER", resolutionDays: 1, description: "Musluk contası değişti." },
    { status: "ONARILDI", createdDaysAgo: 72, code: "SALN-0001", issueType: "KIRIK_HASARLI", resolutionDays: 3, description: "Zincir kısaltıldı." },
    { status: "ONARILDI", createdDaysAgo: 65, code: "OYUN-0001", issueType: "KIRIK_HASARLI", resolutionDays: 2, description: "Vida sıkıldı." },
    { status: "ONARILDI", createdDaysAgo: 60, code: "KAYD-0002", issueType: "KIRIK_HASARLI", resolutionDays: 3, description: "Parça değişimi yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 58, code: "BANK-0002", issueType: "KIRLI", resolutionDays: 1, description: "Yazılar söküldü, temizlik." },
    { status: "ONARILDI", createdDaysAgo: 55, code: "BANK-0016", issueType: "KIRLI", resolutionDays: 1, description: "Temizlik yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 50, code: "AYDN-0002", issueType: "DIGER", resolutionDays: 3, description: "Lamba değişti." },
    { status: "ONARILDI", createdDaysAgo: 48, code: "BANK-0008", issueType: "DIGER", resolutionDays: 2, description: "Bakım yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 42, code: "SALN-0001", issueType: "KIRIK_HASARLI", resolutionDays: 4, description: "Bağlantı yenilendi." },
    { status: "ONARILDI", createdDaysAgo: 35, code: "BANK-0001", issueType: "KIRIK_HASARLI", resolutionDays: 2, description: "Kaynak + boya." },
    { status: "ONARILDI", createdDaysAgo: 33, code: "AYDN-0001", issueType: "DIGER", resolutionDays: 4, description: "Fotosel değişti." },
    { status: "ONARILDI", createdDaysAgo: 30, code: "COPK-0003", issueType: "KIRLI", resolutionDays: 1, description: "Kutu değişimi yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 24, code: "KAYD-0001", issueType: "KIRIK_HASARLI", resolutionDays: 6, description: "Basamak kaynak yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 21, code: "COPK-0006", issueType: "KIRLI", resolutionDays: 1, description: "Temizlik yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 18, code: "SPOR-0003", issueType: "BOYA_DOKUNTU", resolutionDays: 2, description: "Rötuş boya yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 15, code: "BANK-0009", issueType: "KIRIK_HASARLI", resolutionDays: 1, description: "Vida sıkıldı." },
    { status: "ONARILDI", createdDaysAgo: 12, code: "SALN-0001", issueType: "KIRIK_HASARLI", resolutionDays: 3, description: "Zincir değişimi yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 9, code: "THTR-0001", issueType: "KIRIK_HASARLI", resolutionDays: 1, description: "Menteşe yenilendi." },
    { status: "ONARILDI", createdDaysAgo: 6, code: "BANK-0015", issueType: "KIRIK_HASARLI", resolutionDays: 1, description: "Kaynak yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 5, code: "OYUN-0001", issueType: "KIRIK_HASARLI", resolutionDays: 2, description: "Plastik parça değişti." },
    { status: "ONARILDI", createdDaysAgo: 4, code: "SALN-0004", issueType: "KIRLI", resolutionDays: 1, description: "Temizlik yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 3, code: "BANK-0003", issueType: "BOYA_DOKUNTU", resolutionDays: 1, description: "Rötuş boya yapıldı." },
    { status: "ONARILDI", createdDaysAgo: 2, code: "COPK-0007", issueType: "KIRLI", resolutionDays: 1, description: "Kutu boşaltıldı." },
    // REDDEDILDI (4)
    { status: "REDDEDILDI", createdDaysAgo: 100, code: "COPK-0004", issueType: "DIGER", resolutionDays: 2, description: "Fotoğraf başka parka ait." },
    { status: "REDDEDILDI", createdDaysAgo: 75, code: "CSME-0001", issueType: "TEHLIKELI", resolutionDays: 1, description: "Mükerrer bildirim." },
    { status: "REDDEDILDI", createdDaysAgo: 70, code: "COPK-0007", issueType: "DIGER", resolutionDays: 1, description: "Asılsız bildirim." },
    { status: "REDDEDILDI", createdDaysAgo: 45, code: "SPOR-0004", issueType: "EKSIK_CALINMIS", resolutionDays: 2, description: "Ekipman depoda bulundu." },
  ];

  const colors = ["#cbd5e1", "#fde68a", "#93c5fd", "#bbf7d0", "#fecaca"];
  let reportCount = 0;

  const assetByCode = new Map(allAssets.map((a) => [a.code, a]));

  for (const entry of plan) {
    const asset = assetByCode.get(entry.code);
    if (!asset) {
      throw new Error(`Seed planında bilinmeyen demirbaş kodu: ${entry.code}`);
    }
    const createdAt = daysAgo(entry.createdDaysAgo);
    const closedAt =
      entry.status === "ONARILDI" || entry.status === "REDDEDILDI"
        ? new Date(createdAt.getTime() + (entry.resolutionDays ?? 2) * DAY_MS)
        : undefined;

    const photoUrl = await savePhoto(await photoBuffer(colors[reportCount % colors.length]));
    const resolvedPhotoUrl =
      entry.status === "ONARILDI"
        ? await savePhoto(await photoBuffer(colors[(reportCount + 2) % colors.length]))
        : undefined;

    await createReportWithEvents({
      asset,
      status: entry.status,
      issueType: entry.issueType,
      description: entry.description ?? "Sahada tespit edilen hasar.",
      createdAt,
      closedAt,
      resolutionNote:
        entry.status === "ONARILDI" || entry.status === "REDDEDILDI"
          ? entry.description
          : undefined,
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

  console.log(`Seed tamamlandı: 2 park, ${totalCreated} demirbaş, ${reportCount} bildirim.`);
}

main()
  .catch((e) => {
    console.error("Seed başarısız:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
