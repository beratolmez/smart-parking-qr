# Feature: Aşama 4 — Raporlama ve Sunum Hazırlığı

Bu plan eksiksiz olacak şekilde yazıldı, ancak **uygulamaya başlamadan önce dokümantasyonu ve kod tabanındaki desenleri doğrula.** Aşama 1–3 planlarındaki GOTCHA'ların tamamı geçerli (Next 16 async `params`, Prisma 7, Zod 4 `{ error }` sözdizimi). Mevcut util, tip ve model isimlerine dikkat et; `src/features/reports` dilimi **kanonik referanstır** (katman akışı, isimlendirme, test desenleri), `src/features/analytics` birebir onu taklit eder.

---

## Feature Description

Aşama 3'te döngü kapandı: `Report`, `ReportEvent`, `closedAt` ve durum makinesi var. Ama PRD'nin yöneticiye vaat ettiği **veriye dayalı karar ekranı yok** — `/panel` hâlâ placeholder (`src/app/panel/page.tsx:6` — "Metrikler ve raporlar Aşama 4'te eklenecek."). Aşama 4, PRD Bölüm 7.2'deki `features/analytics` diliminin 7 metriğini ve `/panel` gösterge panelini ekler:

1. Açık bildirim sayısı (`YENI` + `ATANDI`)
2. Ortalama çözüm süresi (`ONARILDI` kayıtlarında `closedAt - createdAt` ortalaması)
3. Geciken bildirimler (7 günden uzun açık)
4. En çok arıza veren 5 demirbaş (son 12 ay)
5. Park bazında dağılım (açık/kapalı)
6. Tür (sorun tipi) bazında dağılım
7. Aylık trend (son 6 ay: açılan vs. kapanan)

Ayrıca PRD Aşama 4'ün diğer çıktıları: **seed verisi zenginleştirme** (6 aya yayılmış gerçekçi tarihler, tekrarlı arıza veren demirbaşlar — "bu salıncak son 6 ayda 5. kez arızalandı" cümlesi demoda gerçekten çıkar), **360px mobil gözden geçirme**, **sunum senaryosu dokümanı** ve README güncellemeleri.

**Karar (kullanıcı onaylı):** Grafikler saf CSS/SVG ile sunucu bileşenlerinde çizilir — `recharts`/`date-fns` eklenmez. Proje zaten PRD'den saparak `date-fns` yerine `src/shared/format.ts`'te kendi fonksiyonlarını yazdı; sıfır harici bağımlılık felsefesi korunur (React 19/SSR uyum riski de yok olur).

## User Story

> **Birim yöneticisi** olarak,
> gösterge panelinde açık bildirim sayısını, ortalama çözüm süresini ve en çok arıza veren demirbaşları görmek istiyorum
> ki **onarım yerine yenileme kararını veriyle savunabileyim** (PRD UH-6, UH-7).

## Problem Statement

`/panel` boş bir sayfa; `Report`/`ReportEvent`/`closedAt` verisi toplanıyor ama hiçbir metrik hesaplanmıyor. Seed'deki 20 bildirimin tamamı son 30 günde, tek sorun tipiyle (`KIRIK_HASARLI`) ve tek parkta — aylık trend, park dağılımı ve tekrarlı arıza metrikleri bu veriyle anlamsız. Sunum senaryosu ve 360px mobil kontrol de yok.

## Solution Statement

`features/analytics` dikey dilimi: repository (yalnızca Prisma; `groupBy` + `count` + select'li `findMany`) → service (hesaplamalar, ay dilimleme, `DashboardData` DTO'su) → sunucu bileşenleri (MetricCard, HorizontalBarChart, TrendChart, TopFaultyAssetsTable) → `/panel` sayfası. Grafikler `div` tabanlı saf CSS bar'lar. Seed 2. park + 6 aya yayılmış ~53 bildirimle zenginleştirilir. `docs/sunum-senaryosu.md` 8 dakikalık canlı demo akışı. API route yok — Aşama 3'ün belgelediği sapma: panel verisi Server Component'te doğrudan servisten okunur (PRD 10.2'deki `/api/analytics/summary` için dead code üretilmez).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `src/features/analytics/` (yeni dilim), `src/app/panel/page.tsx`, `prisma/seed.ts`, kök `README.md`, `src/features/reports/README.md`
**Dependencies**: Yok — yeni paket kurulmaz (karar: saf CSS/SVG grafikler)
**Not**: Şema değişikliği yok — migration gereksiz.

---

## CONTEXT REFERENCES

### Okunması Zorunlu Proje Dosyaları

Bu dosyaları uygulamaya başlamadan **önce oku**:

- `src/features/reports/service.test.ts` (tam dosya, 253 satır) — **Test deseninin kanonik kaynağı**: `createTestPark` (satır 16–18), `createTestAsset` (satır 20–24, `assetService.createAssets` kullanır), `testPhoto` (satır 26–30), `input` helper (satır 32–39), `beforeEach` + `_resetRateLimits` (satır 42–44). Analytics testleri bunu taklit eder.
- `src/features/reports/repository.ts` (tam dosya, 138 satır) — Repository deseni: `prisma` importu `@/core/db`'den (satır 1), tip re-export (satır 14–20), `findMany` + `include` (satır 60–75), `count` (satır 123–130). Analytics repository bu desenleri tekrarlar.
- `src/features/reports/service.ts` (tam dosya, 156 satır) — Servis deseni: `logger.info("domain.action.started", {...})` (satır 27), `prisma` doğrudan çağırmaz, `isReportOverdue` (satır 150–155) **yeniden kullanılır**.
- `src/features/reports/constants.ts` (satır 12–19) — `ISSUE_TYPE_LABELS`; tür dağılımı grafiği ve tablolar bunu kullanır. `OVERDUE_DAYS` (satır 35) analytics'te **kopyalanır** (üç-dilim kuralı: 2 dilim kullanana kadar shared'e taşınmaz).
- `src/features/assets/constants.ts` (satır 23–34) — `ASSET_TYPE_LABELS`; top-5 tablosunda tür etiketi için.
- `src/features/assets/repository.ts` (satır 19–33) — `getAssetById`/`listAssetsByIds` include deseni; analytics top-5 asset bilgilerini kendi içinde inline çeker (çapraz dilim import yok).
- `src/app/panel/page.tsx` (tam dosya, 10 satır) — Placeholder; tamamen değiştirilir.
- `src/app/panel/layout.tsx` (satır 7–12) — `NAV_ITEMS`; `/panel` "Gösterge Paneli" zaten var — **değişmez**.
- `src/app/panel/bildirimler/page.tsx` — Sayfa iskeleti deseni (başlık + `Card`-içi form + `EmptyState`); dashboard grid'inde stil referansı.
- `src/shared/format.ts` (satır 7–22) — `formatDurationTR(ms)`; ortalama çözüm süresi kartında **aynen kullanılır** (`ms` bekler).
- `src/shared/ui/Card.tsx` (tam dosya, 12 satır) — Metrik kartlarının temeli.
- `src/shared/ui/EmptyState.tsx` (tam dosya, 10 satır) — Boş grafik/tablo durumları.
- `src/features/assets/components/AssetTable.tsx` — Tablo deseni: `overflow-x-auto`, `min-w-max`, koyu mod sınıfları (`bg-zinc-.../dark:bg-zinc-...`). TopFaultyAssetsTable bunu taklit eder.
- `src/core/logger.ts` — `logger.info(evt, meta)` deseni (Aşama 3 planının satır 54'ünde atıfta bulunulan yapı).
- `prisma/seed.ts` (tam dosya, 265 satır) — **Zenginleştirme hedefi**: `DISTRIBUTION` (satır 14–24), `createReportWithEvents` (satır 52–126), ana akış (satır 128–256). `photoBuffer` (satır 46–50) ve `allocateTicketNo` (satır 37–44) korunur.
- `PRD.md` (Bölüm 7.2, satır 400–410) — `features/analytics` metrik tablosu (kanonik hesap tanımları).
- `PRD.md` (Bölüm 11.2, satır 600) — "Gösterge paneli 7 metriğin tamamını gerçek veriden hesaplıyor" kabul kriteri.
- `PRD.md` (Bölüm 12, Aşama 4, satır 678–691) — Bu aşamanın çıktıları ve doğrulama kriterleri.
- `PRD.md` (Bölüm 11.3, satır 610–613) — Demo verisi ve test kapsamı hedefleri.
- `PRD.md` (Bölüm 13, satır 703–715) — "Ürün Geliştirmeleri" tablosu (sunum senaryosunda gelecek adımlar anlatılır).
- `.claude/skills/agent-browser/SKILL.md` — E2E komutları (viewport 360px için `resize`/`viewport` komutu burada aranır).
- `README.md` (tam dosya) — Güncellenecek bölümler: giriş paragrafı (Aşama 4 çıktısı), "Mimari Özeti"ndeki dilim listesi (satır 54–63, `analytics` eklenir), demo verisi sayıları (satır 23–24).

### Oluşturulacak Yeni Dosyalar

**features/analytics/**
- `src/features/analytics/constants.ts` — `TREND_MONTHS`, `TOP_ASSETS_LIMIT`, `OVERDUE_DAYS` (kopya)
- `src/features/analytics/repository.ts` — 7 sorgu (T2)
- `src/features/analytics/service.ts` — `getDashboardData()` + ay dilimleme (T3)
- `src/features/analytics/service.test.ts` — 7 metrik testi (T4)
- `src/features/analytics/components/MetricCard.tsx` (T5)
- `src/features/analytics/components/HorizontalBarChart.tsx` (T6)
- `src/features/analytics/components/TrendChart.tsx` (T7)
- `src/features/analytics/components/TopFaultyAssetsTable.tsx` (T8)
- `src/features/analytics/README.md` (T11)

**docs/**
- `docs/sunum-senaryosu.md` — 8 dakikalık canlı demo akışı (T14)

**güncellemeler:** `src/app/panel/page.tsx`, `prisma/seed.ts`, kök `README.md`, `src/features/reports/README.md` (dashboard veri kaynağı notu)

### Okunması Zorunlu Dokümantasyon

- [Prisma Client — groupBy](https://www.prisma.io/docs/orm/reference/prisma-client-reference#groupby)
  - `groupBy` + `_count` + `orderBy: { _count: { _all: "desc" } }` + `take`
  - Neden: top-5 demirbaş ve tür dağılımı sorguları
- [Prisma Client — count](https://www.prisma.io/docs/orm/reference/prisma-client-reference#count)
  - `where`'li `count`
  - Neden: açık/geciken bildirim sayıları
- [MDN — Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
  - `{ month: "short", year: "2-digit" }`, `locale: "tr-TR"` → "Mar 26" etiketleri
  - Neden: trend grafiği ay etiketleri (`formatDateTR` ile aynı yaklaşım, `shared/format.ts:1-5`)
- `PRD.md` Bölüm 12 Aşama 4 (satır 678–691) — çıktı listesi birebir karşılanacak

### Uyulacak Desenler

**Katman akışı** (mevcut kanonik yapı — bozulmaz):

```
page.tsx (Server Component)  ← requireUser layout'ta; veri servisten
        ↓
     service.ts               ← hesaplamalar, DTO; Prisma çağırmaz
        ↓
    repository.ts             ← yalnızca Prisma (count/groupBy/findMany)
        ↓
     core/db.ts → Prisma
```

**İsimlendirme:** dosya kebab-case, bileşen PascalCase, fonksiyon camelCase İngilizce (`getDashboardData`, `countOpenReports`), enum değerleri SCREAMING_SNAKE. Log olay adı `{domain}.{action}.{status}`: `analytics.dashboard.started` / `analytics.dashboard.success`.

**Hata yönetimi:** Analytics servisi hata fırlatmaz — boş veri `DashboardData`'da sıfır/null olarak temsil edilir (dashboard'da hata durumu yoktur; sadece EmptyState boş durumları). `avgResolutionHours` sıfır ONARILDI'da `null` döner; `formatDurationTR` çağrısı için `null` kontrolü page'de yapılır.

**Logging deseni** — `src/features/reports/service.ts:27`:

```ts
logger.info("analytics.dashboard.started");
// ...hesaplamalar...
logger.info("analytics.dashboard.success", { openCount, overdueCount });
```

**Server Component grafik deseni** (client bileşen yok — grafikler sunucuda render edilir):

```tsx
// HorizontalBarChart — div tabanlı saf CSS bar
const max = Math.max(...items.map((i) => i.value), 1);
{items.map((item) => (
  <div key={item.label} className="flex items-center gap-3">
    <span className="w-36 truncate text-sm text-zinc-700 dark:text-zinc-300">{item.label}</span>
    <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.value / max) * 100}%` }} />
    </div>
    <span className="w-10 text-right text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{item.value}</span>
  </div>
))}
```

**Anti-desenler — yapma:**

- ❌ `recharts`/`date-fns` kurma — kullanıcı onayı: saf CSS/SVG; proje sıfır-bağımlılık felsefesinde
- ❌ `src/features/assets/repository`'den `listAssetsByIds` import etme — çapraz dilim; `findAssetsByIds` analytics repository'de inline yazılır (Aşama 3'ün "çapraz dilim tip bağımlılığını önle" kararı, `asama-3...md:508`)
- ❌ Serviste Prisma çağırma — tüm sorgular repository'de; servis yalnızca hesaplar
- ❌ `OVERDUE_DAYS`'i `reports/constants`'tan import etme — kopyala (üç-dilim kuralı; 3. dilimde `shared/constants.ts`'e taşınır)
- ❌ Ortalama çözüm süresine `REDDEDILDI`'yi dahil etme — yalnızca `ONARILDI` ve `closedAt` dolu kayıtlar (PRD 7.2)
- ❌ `groupBy`'da ilişki (relation) alanına göre gruplama deneme — Prisma `groupBy` relation traverse etmez; park dağılımı `findMany` + JS'te kovalama yapılır (demo ölçeği ~53 kayıt)
- ❌ 0'a bölme — `max = Math.max(...values, 1)` ve `avgResolutionHours` null guard
- ❌ `createdAt`'i elle set ederken Prisma default'una güvenme — seed'de `create` data'sına açık `createdAt`/`closedAt` verilir (mevcut desen, `seed.ts:74-78`)
- ❌ Dashboard'da `requireRole("YONETICI")` kullanma — gösterge paneli her iki rolün nav'ında zaten var (layout.tsx:7-12); PRD 10.2'deki `YONETICI` kısıtı `/api/analytics/summary` içindir, o da API yerine Server Component kararıyla zaten yok (NOTES #1)

---

## IMPLEMENTATION PLAN

### Phase 1: Temel (Foundation) — `features/analytics` veri katmanı

constants → repository → service → servis testleri. Bu faz bitmeden UI yazılmaz.

### Phase 2: Çekirdek — UI bileşenleri + `/panel` sayfası

MetricCard, HorizontalBarChart, TrendChart, TopFaultyAssetsTable (hepsi Server Component) → `src/app/panel/page.tsx`'in placeholder'ı değiştirilir.

### Phase 3: Seed zenginleştirme

2. park, 6 aya yayılmış ~53 bildirim, tekrarlı arıza veren demirbaşlar, çeşitli sorun tipleri ve çözüm süreleri.

### Phase 4: Dokümantasyon

analytics README, reports README notu, kök README, `docs/sunum-senaryosu.md`.

### Phase 5: Doğrulama

360px mobil gözden geçirme + tam doğrulama zinciri (lint, typecheck, test, build) + agent-browser E2E.

---

## STEP-BY-STEP TASKS

IMPORTANT: Her görevi sırayla, yukarıdan aşağıya uygula. Her görev atomiktir ve bağımsız doğrulanabilir.

---

### T1 — CREATE `src/features/analytics/constants.ts`

- **IMPLEMENT**:

```ts
export const TREND_MONTHS = 6;
export const TOP_ASSETS_LIMIT = 5;
export const TOP_ASSETS_MONTHS = 12;
export const OVERDUE_DAYS = 7;
```

- **GOTCHA**: `OVERDUE_DAYS` `reports/constants.ts:35`'teki değerin kopyasıdır (üç-dilim kuralı) — değerler aynı kalmalı.
- **VALIDATE**: `npm run typecheck`

### T2 — CREATE `src/features/analytics/repository.ts`

- **IMPLEMENT** (hepsi `prisma` importu `@/core/db`'den; hiçbiri `tx` almaz — analytics salt okuma):

```ts
import { prisma } from "@/core/db";
import { type Asset, type AssetType, type IssueType, type Park } from "@/generated/prisma/client";
import { OVERDUE_DAYS } from "@/features/analytics/constants";

export interface ResolvedTimeRow { createdAt: Date; closedAt: Date | null; }

export async function countOpenReports(): Promise<number>
// prisma.report.count({ where: { status: { in: ["YENI", "ATANDI"] } } })

export async function countOverdueReports(): Promise<number>
// prisma.report.count({ where: { status: { in: ["YENI", "ATANDI"] },
//   createdAt: { lt: new Date(Date.now() - OVERDUE_DAYS * 24 * 60 * 60 * 1000) } } })

export async function findResolvedTimes(): Promise<ResolvedTimeRow[]>
// prisma.report.findMany({ where: { status: "ONARILDI" }, select: { createdAt: true, closedAt: true } })

export interface AssetFaultCount { assetId: string; count: number; }

export async function countFaultsPerAsset(since: Date, limit: number): Promise<AssetFaultCount[]>
// prisma.report.groupBy({ by: ["assetId"], where: { createdAt: { gte: since } },
//   _count: { _all: true }, orderBy: { _count: { _all: "desc" } }, take: limit })

export interface AssetWithParkRow { id: string; code: string; type: AssetType; status: AssetStatus; park: { name: string }; }

export async function findAssetsByIds(ids: string[]): Promise<AssetWithParkRow[]>
// prisma.asset.findMany({ where: { id: { in: ids } },
//   select: { id: true, code: true, type: true, status: true, park: { select: { name: true } } } })

export interface DistributionRow { status: ReportStatus; issueType: IssueType; parkName: string; }

export async function findReportsForDistribution(): Promise<DistributionRow[]>
// prisma.report.findMany({ select: { status: true, issueType: true,
//   asset: { select: { park: { select: { name: true } } } } } })

export interface TypeCountRow { issueType: IssueType; count: number; }

export async function countFaultsByType(): Promise<TypeCountRow[]>
// prisma.report.groupBy({ by: ["issueType"], _count: { _all: true }, orderBy: { _count: { _all: "desc" } } })

export interface TrendRow { createdAt: Date; closedAt: Date | null; }

export async function findReportsForTrend(since: Date): Promise<TrendRow[]>
// prisma.report.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, closedAt: true } })
```

- **IMPORTS**: `AssetStatus`, `ReportStatus` tipleri de `@/generated/prisma/client`'tan.
- **GOTCHA**: `groupBy` dönüşü `{ assetId, _count: { _all: number } }` şeklindedir — serviste `_count._all`'ı oku. `orderBy: { _count: { _all: "desc" } }` Prisma'da geçerlidir (Prisma docs — groupBy). SQLite'te desteklenir.
- **VALIDATE**: `npm run typecheck`

### T3 — CREATE `src/features/analytics/service.ts`

- **IMPLEMENT** DTO'lar ve `getDashboardData()` (tam dosya, `import "server-only"` — `core/db` zaten taşıyor ama kod tabanı konvansiyonu olarak eklensin; `reports/service.ts` import etmez, `core/db` import eder — **`server-only` importunu EKLEME**, `reports/service.ts` desenini izle):

```ts
import { logger } from "@/core/logger";
import * as repository from "@/features/analytics/repository";
import { TOP_ASSETS_LIMIT, TOP_ASSETS_MONTHS, TREND_MONTHS } from "@/features/analytics/constants";
import type { AssetType, IssueType } from "@/generated/prisma/enums";

export interface TopFaultyAsset {
  code: string;
  type: AssetType;
  parkName: string;
  count: number;
}

export interface ParkDistribution {
  parkName: string;
  open: number;
  closed: number;
}

export interface TypeDistribution { issueType: IssueType; count: number; }

export interface TrendPoint { label: string; key: string; opened: number; closed: number; }

export interface DashboardData {
  openCount: number;
  overdueCount: number;
  avgResolutionHours: number | null;
  totalCount: number;
  topFaultyAssets: TopFaultyAsset[];
  parkDistribution: ParkDistribution[];
  typeDistribution: TypeDistribution[];
  monthlyTrend: TrendPoint[];
}
```

- **IMPLEMENT** iç yardımcılar:

```ts
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function monthKey(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", { month: "short", year: "2-digit" }).format(new Date(y, m - 1, 1));
}
```

- **IMPLEMENT** `buildMonthlyTrend(rows: TrendRow[]): TrendPoint[]` — **saf fonksiyon, servis içinde export** (test edilebilir):
  - Bugünkü aydan geriye `TREND_MONTHS` ayın `monthKey`'lerini üret (kronolojik: en eski → en yeni; boş aylar 0'lı gelir)
  - `opened`: `createdAt` bu aya düşen satır sayısı; `closed`: `closedAt` bu aya düşen satır sayısı (`closedAt` null olanlar closed'a yazılmaz)
  - `label` = `monthLabel(key)`
- **IMPLEMENT** `getDashboardData()`:

```ts
export async function getDashboardData(): Promise<DashboardData> {
  logger.info("analytics.dashboard.started");
  const sinceTrend = new Date(Date.now() - (TREND_MONTHS - 1) * MONTH_MS);
  const sinceTop = new Date(Date.now() - TOP_ASSETS_MONTHS * MONTH_MS);

  const [
    openCount, overdueCount, resolvedTimes, faultCounts, typeCounts, distRows, trendRows,
  ] = await Promise.all([
    repository.countOpenReports(),
    repository.countOverdueReports(),
    repository.findResolvedTimes(),
    repository.countFaultsPerAsset(sinceTop, TOP_ASSETS_LIMIT),
    repository.countFaultsByType(),
    repository.findReportsForDistribution(),
    repository.findReportsForTrend(sinceTrend),
  ]);

  const resolved = resolvedTimes.filter((r): r is ResolvedTimeRow & { closedAt: Date } => r.closedAt !== null);
  const avgResolutionHours =
    resolved.length === 0
      ? null
      : Math.round((resolved.reduce((s, r) => s + (r.closedAt.getTime() - r.createdAt.getTime()), 0) / resolved.length / HOUR_MS) * 10) / 10;

  const assetRows = await repository.findAssetsByIds(faultCounts.map((f) => f.assetId));
  const assetMap = new Map(assetRows.map((a) => [a.id, a]));
  const topFaultyAssets = faultCounts
    .map((f) => ({ code: assetMap.get(f.assetId)?.code ?? "?", type: assetMap.get(f.assetId)?.type ?? "DIGER", parkName: assetMap.get(f.assetId)?.park.name ?? "?", count: f.count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  const parkMap = new Map<string, ParkDistribution>();
  for (const row of distRows) {
    const entry = parkMap.get(row.parkName) ?? { parkName: row.parkName, open: 0, closed: 0 };
    if (row.status === "YENI" || row.status === "ATANDI") entry.open += 1;
    else entry.closed += 1;
    parkMap.set(row.parkName, entry);
  }
  const parkDistribution = [...parkMap.values()].sort((a, b) => a.parkName.localeCompare(b.parkName, "tr"));

  logger.info("analytics.dashboard.success", { openCount, overdueCount });
  return {
    openCount, overdueCount, avgResolutionHours,
    totalCount: distRows.length,
    topFaultyAssets,
    parkDistribution,
    typeDistribution: typeCounts,
    monthlyTrend: buildMonthlyTrend(trendRows),
  };
}
```

- **GOTCHA**: `Promise.all` — sorgular bağımsız, paralel koşar. `sinceTrend`'i `(TREND_MONTHS - 1) * MONTH_MS` geriye koy (mevcut ay + 5 önceki = 6 kova; 30 günlük ay yaklaşımı yeterli — sınır taşması olursa kova hesaplaması zaten monthKey ile hizalar). `avgResolutionHours` 1 ondalık yuvarlanır; `formatDurationTR` `ms` ister → page'de `avgResolutionHours * HOUR_MS` çevrilir.
- **VALIDATE**: `npm run typecheck`

### T4 — CREATE `src/features/analytics/service.test.ts`

- **IMPLEMENT** test yardımcıları (desen: `reports/service.test.ts:16-39`):

```ts
async function createTestPark(name = "Test Parkı") {
  return prisma.park.create({ data: { name, district: "Test Mahallesi" } });
}

async function createTestAsset(parkId: string, type: AssetType = "BANK") {
  const [asset] = await assetService.createAssets({ parkId, type, count: 1 });
  return asset;
}

let ticketCounter = 1000;
async function createDirectReport(params: {
  assetId: string;
  status: ReportStatus;
  issueType?: IssueType;
  createdAt: Date;
  closedAt?: Date;
}) {
  ticketCounter += 1;
  return prisma.report.create({
    data: {
      ticketNo: ticketCounter,
      asset: { connect: { id: params.assetId } },
      issueType: params.issueType ?? "KIRIK_HASARLI",
      description: "Test bildirimi",
      reporterType: "VATANDAS",
      photoUrl: "/uploads/test.webp",
      status: params.status,
      createdAt: params.createdAt,
      ...(params.closedAt ? { closedAt: params.closedAt } : {}),
    },
  });
}

const daysAgo = (days: number, hourOffset = 0) => new Date(Date.now() - days * 24 * 60 * 60 * 1000 + hourOffset * 60 * 60 * 1000);
```

- **IMPLEMENT** testler (her metrik için `describe` bloğu):

1. `describe("getDashboardData — boş veritabanı")`: hiç veri yokken `openCount 0`, `overdueCount 0`, `avgResolutionHours null`, `totalCount 0`, `topFaultyAssets []`, `parkDistribution []`, `typeDistribution []`, `monthlyTrend` 6 elemanlı ve tümü 0 (sadece son 6 ayın `monthKey`'leri).
2. `describe("getDashboardData — sayılar")`:
   - YENI×1 + ATANDI×1 + ONARILDI×1 + REDDEDILDI×1 → `openCount 2`, `totalCount 4`
   - 8 gün önce YENI + 3 gün önce YENI → `overdueCount 1` (8 günlük sayılır, 3 günlük sayılmaz)
   - `avgResolutionHours`: ONARILDI 2 kayıt (48 saat ve 96 saat) → `72`; REDDEDILDI ve closedAt'ı null ONARILDI hariç; hiç ONARILDI yoksa `null`
   - `typeDistribution`: 3 farklı `issueType` → doğru sayılar, çoktan aza sıralı
   - `parkDistribution`: 2 park, her parkta açık+kapalı karışımı → `open`/`closed` doğru; `REDDEDILDI` closed sayılır
3. `describe("getDashboardData — topFaultyAssets")`:
   - 3 asset: A 5 bildirim (2'si 13 ay önce — `TOP_ASSETS_MONTHS` dışı), B 3, C 2 → sıralama A(3), B(3?) — dikkat: A'nın 13 ay öncekiler sayılmaz; belirgin veri kur: A son 12 ayda 4, B 3, C 2; limit 5'e 5'ten fazla asset koyarsan yalnızca en çok 5'i gelir
   - `code`, `type`, `parkName` doğru; eşit sayıda koda göre sıralanır (deterministik)
4. `describe("buildMonthlyTrend")` (export edilen saf fonksiyon — satır referansı T3):
   - Son 6 ayın kovaları doğru üretilir (boş aylar dahil, kronolojik)
   - Geçen ay açılan + geçen ay kapanan bildirim doğru kovaya düşer
   - `closedAt` null kayıt `closed` sayılmaz
   - 7 ay önceki kayıt hiçbir kovada görünmez

- **GOTCHA**: `createDirectReport` ile `prisma.report.create` doğrudan kullanılır (servis değil) — böylece geçmiş `createdAt`/`closedAt` set edilebilir; `ticketNo` zorunlu ve `@unique` (elle sayaç). `beforeEach` temizliği `tests/setup.ts`'te zaten var — ekstra gerekmez. `_resetRateLimits` GEREKMEZ (createReport servisi çağrılmaz).
- **VALIDATE**: `npx vitest run src/features/analytics/service.test.ts`

### T5 — CREATE `src/features/analytics/components/MetricCard.tsx`

- **IMPLEMENT**: Server Component:

```tsx
import { Card } from "@/shared/ui/Card";

export interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</p>
      {hint ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    </Card>
  );
}
```

- **GOTCHA**: `Card`'ın `className`'ı append eder (`Card.tsx:5-12`) — `flex flex-col gap-1` güvenle eklenir. Client bileşen GEREKMEZ.
- **VALIDATE**: `npm run typecheck`

### T6 — CREATE `src/features/analytics/components/HorizontalBarChart.tsx`

- **IMPLEMENT**: Server Component — props: `{ title: string; items: { label: string; value: number; color?: string }[]; emptyMessage: string }`; `max = Math.max(...items.map((i) => i.value), 1)`; her satır: etiket (`w-36 truncate`) + bar (`h-3 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800`, iç div `bg-zinc-900 dark:bg-zinc-50` varsayılan veya `color` prop'u) + değer (`tabular-nums`). `items.length === 0` ise `EmptyState emptyMessage`. Sarmalayıcı `Card` + `<h2>` başlık. En dış `overflow-x-auto` + iç `min-w-[320px]` (360px mobilde taşma olmaz).
- **PATTERN**: "Uyulacak Desenler" → Server Component grafik deseni birebir; `EmptyState` kullanımı `demirbaslar/page.tsx:100`.
- **VALIDATE**: `npm run typecheck`

### T7 — CREATE `src/features/analytics/components/TrendChart.tsx`

- **IMPLEMENT**: Server Component — props: `{ points: { label: string; opened: number; closed: number }[] }`. `max = Math.max(...points.flatMap((p) => [p.opened, p.closed]), 1)`. Düzen: yatay flex, her ay bir sütun (`flex-1 flex flex-col items-center gap-1`):
  - Çubuk çifti: `flex items-end gap-1` içinde iki dikey bar — `opened` → `bg-zinc-900 dark:bg-zinc-50` (h: `(v/max)*96` px), `closed` → `bg-emerald-500` (aynı formül); bar `w-3 rounded-t` + `style={{ height }}`
  - Sütun altı: `label` (`text-xs text-zinc-500`)
  - Kart başlığı: "Aylık Trend (son 6 ay)" + lejant (`opened` = "Açılan", `closed` = "Kapanan" küçük renkli kutular)
  - En dış `overflow-x-auto`, iç `min-w-[420px]`
- **GOTCHA**: Bar yüksekliği px cinsinden `style={{ height: \`${Math.max(barHeight, 2)}px\` }}` — 0 değerinde görünür 2px'lik iz kalır (yoksa "boş" sütun tespiti zor). `tabular-nums` değerleri bar üstünde opsiyonel.
- **VALIDATE**: `npm run typecheck`

### T8 — CREATE `src/features/analytics/components/TopFaultyAssetsTable.tsx`

- **IMPLEMENT**: Server Component — props: `{ assets: TopFaultyAsset[] }` (tip T3'ten). `overflow-x-auto` + `min-w-max` table (desen: `AssetTable.tsx`). Kolonlar: Kod (monospace), Tür (`ASSET_TYPE_LABELS[a.type]`, `@/features/assets/constants`'tan), Park, Bildirim Sayısı (`count` + " bildirim"). Satırlar: `assets` sıralı (servis zaten sıraladı). Boşsa `EmptyState("Henüz arıza kaydı yok.")`.
- **PATTERN**: `src/features/assets/components/AssetTable.tsx` (tablo yapısı, koyu mod sınıfları).
- **VALIDATE**: `npm run typecheck`

### T9 — UPDATE `src/app/panel/page.tsx`

- **IMPLEMENT**: Placeholder'ı (satır 1–10) komple değiştir:

```tsx
import { formatDurationTR } from "@/shared/format";
import * as analyticsService from "@/features/analytics/service";
import { MetricCard } from "@/features/analytics/components/MetricCard";
import { HorizontalBarChart } from "@/features/analytics/components/HorizontalBarChart";
import { TrendChart } from "@/features/analytics/components/TrendChart";
import { TopFaultyAssetsTable } from "@/features/analytics/components/TopFaultyAssetsTable";
import { ASSET_TYPE_LABELS } from "@/features/assets/constants";
import { ISSUE_TYPE_LABELS } from "@/features/reports/constants";
import { EmptyState } from "@/shared/ui/EmptyState";

export default async function PanelPage() {
  const data = await analyticsService.getDashboardData();
  const avgLabel =
    data.avgResolutionHours === null ? "—" : formatDurationTR(Math.round(data.avgResolutionHours * 3_600_000));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Gösterge Paneli</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Açık Bildirim" value={String(data.openCount)} />
        <MetricCard label="Geciken Bildirim" value={String(data.overdueCount)} hint="7 günden eski açık" />
        <MetricCard label="Ortalama Çözüm Süresi" value={avgLabel} />
        <MetricCard label="Toplam Bildirim" value={String(data.totalCount)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">En Çok Arıza Veren Demirbaşlar</h2>
          <TopFaultyAssetsTable assets={data.topFaultyAssets} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sorun Türü Dağılımı</h2>
          {data.typeDistribution.length === 0 ? (
            <EmptyState message="Henüz bildirim yok." />
          ) : (
            <HorizontalBarChart
              title=""
              emptyMessage="Henüz bildirim yok."
              items={data.typeDistribution.map((d) => ({ label: ISSUE_TYPE_LABELS[d.issueType], value: d.count }))}
            />
          )}
        </section>
      </div>

      <TrendChart points={data.monthlyTrend} />
    </div>
  );
}
```

- **IMPLEMENT**: `ASSET_TYPE_LABELS` importu gerekmiyorsa (TopFaultyAssetsTable içinde kullanılıyor) kaldır — yalnızca kullanılan importları tut.
- **GOTCHA**: Sayfa `await` yapar ve layout cookie okuduğu için zaten dynamic — cache sorunu yok. `formatDurationTR` `ms` ister (`shared/format.ts:7`); `avgResolutionHours` saat → `* 3_600_000`.
- **VALIDATE**: `npm run typecheck && npm run build`

### T10 — UPDATE `prisma/seed.ts`

**Amaç:** PRD Aşama 4'ün "geçmişe yayılmış gerçekçi tarihler" çıktısı — trend, top-5 ve park dağılımı demoda anlamlı olsun.

- **IMPLEMENT** — `DISTRIBUTION`'dan sonra 2. park bloğu (satır 24 sonrası):

```ts
const PARK_2 = { name: "Atatürk Parkı", district: "Yeni Mahallesi" };

const DISTRIBUTION_2: { type: AssetType; count: number }[] = [
  { type: "BANK", count: 2 },
  { type: "SALINCAK", count: 1 },
  { type: "COP_KUTUSU", count: 1 },
  { type: "KAYDIRAK", count: 1 },
];
```

- **IMPLEMENT** — ana akışta (satır 140 sonrası) 2. parkı oluştur + demirbaşlarını ekle (mevcut döngü deseni birebir; `assetService.createAssets` + `updateAsset`):

```ts
const park2 = await prisma.park.create({ data: PARK_2 });
// DISTRIBUTION_2 için aynı döngü; totalCreated'a ekle
```

  - **GOTCHA**: `AssetCodeCounter` type-bazlı ve globaldir — Atatürk Parkı'nın BANK'ları `BANK-0015`, `BANK-0016` olur; SALINCAK → `SALN-0004`; COP_KUTUSU → `COPK-0007`; KAYDIRAK → `KAYD-0003`. Bu kodlar aşağıdaki planda sabit kullanılır — yanlış eşleşme testleri/panel'i bozar.
- **IMPLEMENT** — `createReportWithEvents` params'ına `issueType: IssueType` ve `resolutionDays: number` ekle (satır 52–63):
  - `issueType` alanı `report.create` data'sına (satır 71) yazılır (sabit `"KIRIK_HASARLI"` yerine)
  - `description` parametresi ekle (sabit "Sahada tespit edilen hasar." yerine)
  - `closedAt = new Date(createdAt.getTime() + params.resolutionDays * DAY_MS)` (sabit `2 * DAY_MS` yerine, satır 224'ün çağrı tarafıyla birlikte)
- **IMPLEMENT** — `plan` dizisini (satır 184–213) aşağıdakiyle değiştir. Her satır: `createdDaysAgo, status, code, issueType, resolutionDays?, description?`:

```
YENI (6):
  1d   YENI  BANK-0001   KIRIK_HASARLI   —   "Bankın sol ayağı kırılmış, oturulamıyor."
  2d   YENI  SALN-0001   KIRIK_HASARLI   —   "Salıncak zinciri kopmuş."
  3d   YENI  COPK-0001   KIRLI           —   "Çöp kutusu dolup taşmış, koku yayıyor."
  5d   YENI  KAYD-0003   KIRIK_HASARLI   —   "Kaydırak basamağı kırık."          (Atatürk)
  8d   YENI  KAYD-0001   BOYA_DOKUNTU    —   "Kaydırağın boyası tamamen soyulmuş."  (geciken)
  12d  YENI  SPOR-0001   TEHLIKELI       —   "Spor aletinin vidaları gevşemiş."    (geciken)

ATANDI (5):
  1d   ATANDI OYUN-0001   KIRIK_HASARLI  —   "Oyun grubu platformunda delik var."
  4d   ATANDI AYDN-0001   DIGER          —   "Aydınlatma gece çalışmıyor."
  9d   ATANDI CSME-0001   KIRIK_HASARLI  —   "Çeşme musluğu kırılmış."             (geciken)
  14d  ATANDI BANK-0002   KIRLI          —   "Bank üzeri yazıyla kaplanmış."       (geciken)
  16d  ATANDI THTR-0001   TEHLIKELI      —   "Tahterevalli menteşesi bozulmuş."    (geciken)

ONARILDI (38) — 6 aya yayılmış; tekrarlı demirbaşlar işaretli (R1..R5):
  160d ONARILDI BANK-0005   KIRIK_HASARLI  res5d "Tahta çıta değişimi yapıldı."
  150d ONARILDI SALN-0001   KIRIK_HASARLI  res3d "Zincir kaynak yapıldı."          (R1)
  148d ONARILDI COPK-0005   KIRLI          res1d "Kutu boşaltıldı, temizlendi."
  140d ONARILDI BANK-0001   KIRIK_HASARLI  res2d "Ayak kaynak yapıldı."           (R1)
  132d ONARILDI COPK-0002   KIRLI          res1d "Temizlik yapıldı."
  128d ONARILDI BANK-0006   KIRIK_HASARLI  res3d "Koltuk yenilendi."
  120d ONARILDI OYUN-0001   KIRIK_HASARLI  res4d "Platform onarıldı."             (R2)
  112d ONARILDI SALN-0001   KIRIK_HASARLI  res2d "Bağlantı halkası değişti."      (R2)
  110d ONARILDI SPOR-0001   KIRIK_HASARLI  res4d "Kablo değişimi yapıldı."
  105d ONARILDI SPOR-0002   BOYA_DOKUNTU   res1d "Rötuş boya yapıldı."
   98d ONARILDI OYUN-0002   BOYA_DOKUNTU   res2d "Boyama yapıldı."
   95d ONARILDI BANK-0001   BOYA_DOKUNTU   res2d "Rötuş boya yapıldı."            (R2)
   90d ONARILDI SALN-0004   KIRIK_HASARLI  res2d "Koltuğa kaynak yapıldı."        (Atatürk)
   88d ONARILDI KAYD-0001   TEHLIKELI      res5d "Sağlamlaştırma çalışması yapıldı."
   85d ONARILDI BANK-0007   KIRLI          res1d "Temizlik yapıldı."
   80d ONARILDI CSME-0001   DIGER          res1d "Musluk contası değişti."
   72d ONARILDI SALN-0001   KIRIK_HASARLI  res3d "Zincir kısaltıldı."             (R3)
   65d ONARILDI OYUN-0001   KIRIK_HASARLI  res2d "Vida sıkıldı."                  (R3)
   60d ONARILDI KAYD-0002   KIRIK_HASARLI  res3d "Parça değişimi yapıldı."
   58d ONARILDI BANK-0002   KIRLI          res1d "Yazılar söküldü, temizlik."
   55d ONARILDI BANK-0016   KIRLI          res1d "Temizlik yapıldı."              (Atatürk)
   50d ONARILDI AYDN-0002   DIGER          res3d "Lamba değişti."
   48d ONARILDI BANK-0008   DIGER          res2d "Bakım yapıldı."
   42d ONARILDI SALN-0001   KIRIK_HASARLI  res4d "Bağlantı yenilendi."            (R4)
   35d ONARILDI BANK-0001   KIRIK_HASARLI  res2d "Kaynak + boya."                 (R3)
   33d ONARILDI AYDN-0001   DIGER          res4d "Fotosel değişti."
   30d ONARILDI COPK-0003   KIRLI          res1d "Kutu değişimi yapıldı."
   24d ONARILDI KAYD-0001   KIRIK_HASARLI  res6d "Basamak kaynak yapıldı."
   21d ONARILDI COPK-0006   KIRLI          res1d "Temizlik yapıldı."
   18d ONARILDI SPOR-0003   BOYA_DOKUNTU   res2d "Rötuş boya yapıldı."
   15d ONARILDI BANK-0009   KIRIK_HASARLI  res1d "Vida sıkıldı."
   12d ONARILDI SALN-0001   KIRIK_HASARLI  res3d "Zincir değişimi yapıldı."       (R5)
    9d ONARILDI THTR-0001   KIRIK_HASARLI  res1d "Menteşe yenilendi."
    6d ONARILDI BANK-0015   KIRIK_HASARLI  res1d "Kaynak yapıldı."                (Atatürk)
    5d ONARILDI OYUN-0001   KIRIK_HASARLI  res2d "Plastik parça değişti."         (R4)
    4d ONARILDI SALN-0004   KIRLI          res1d "Temizlik yapıldı."              (Atatürk)
    3d ONARILDI BANK-0003   BOYA_DOKUNTU   res1d "Rötuş boya yapıldı."
    2d ONARILDI COPK-0007   KIRLI          res1d "Kutu boşaltıldı."               (Atatürk)

REDDEDILDI (4):
  100d REDDEDILDI COPK-0004  DIGER           res2d "Fotoğraf başka parka ait."
   75d REDDEDILDI CSME-0001  TEHLIKELI      res1d "Mükerrer bildirim."
   70d REDDEDILDI COPK-0007  DIGER           res1d "Asılsız bildirim."            (Atatürk)
   45d REDDEDILDI SPOR-0004  EKSIK_CALINMIS res2d "Ekipman depoda bulundu."
```

  Toplam 53 bildirim. **Değişmezler (invariant'lar):**
  - Her takvim ayına (Mart–Ağustos 2026) en az 4 bildirim düşer — gerekiyorsa `createdDaysAgo`'yu ±2 gün ayarla
  - `SALN-0001` 6 bildirim (R1–R5 + 1 açık) → top-5 tablosunda 1. sıra; `BANK-0001` 4, `OYUN-0001` 4, `KAYD-0001` 3, `CSME-0001` 3
  - `EKSIK_CALINMIS` dahil tüm `IssueType`'lar en az 1 kez geçer
  - Açık (YENI+ATANDI) = 11 → panelde "Açık Bildirim 11"; geciken = 6 (8d,12d,9d,14d,16d) — 5 açık geciken: 8d YENI, 12d YENI, 9d ATANDI, 14d ATANDI, 16d ATANDI = 5
- **IMPLEMENT** — döngü (satır 218–244) yeni planı gezsin: `allAssets` içinden `code` ile asset'i bul (kodlar sabit) → `createReportWithEvents` çağrısına `issueType`, `description`, `resolutionDays`'ı geçir.
- **GOTCHA**: `allAssets` sıralaması değişmez (kod sıralı); plan kod bazlı olduğu için index'e güvenilmez. `createReportWithEvents` içindeki olay zamanlaması korunur (`YENI→ATANDI` createdAt+1gün, `ATANDI→ONARILDI` closedAt — satır 84–99). Son satırdaki `openAssets → ARIZALI` senkronu (satır 246–253) korunur.
- **VALIDATE**: `npm run db:seed` (2 kez çalıştır — idempotent olmalı) sonra `npm run dev`'de `/panel` açık değerleri gösterir (T16'da E2E doğrular)

### T11 — CREATE `src/features/analytics/README.md`

- **IMPLEMENT** (`src/features/reports/README.md` yapısıyla aynı): 7 metrik + hesap tanımı (PRD 7.2 tablosuyla birebir), katman akışı, `buildMonthlyTrend` kova mantığı, kararlar: saf CSS/SVG grafik (neden recharts değil), API route yerine Server Component (Aşama 3'ün belgelediği sapmaya gönderme), `OVERDUE_DAYS` kopyası (üç-dilim kuralı).
- **VALIDATE**: `npm run typecheck`

### T12 — UPDATE `src/features/reports/README.md`

- **IMPLEMENT**: Aşama 4'ü "gerçekleşti" olarak işaretle + kısa bölüm: gösterge panelinin veri kaynakları (`Report.closedAt` → ortalama çözüm süresi, `ReportEvent` → olay bazlı metrikler, `status` → açık/geciken) ve analytics'in `countOpenReports` gibi sorgularla reports verisine salt-okuma erişimi.
- **VALIDATE**: `npm run typecheck`

### T13 — UPDATE kök `README.md`

- **IMPLEMENT**:
  - Giriş paragrafı (satır 7–12): "... ve **Aşama 4 — Raporlama ve Sunum Hazırlığı** çıktılarını içerir: gösterge paneli (7 metrik, saf CSS/SVG grafikler), 6 aya yayılmış zenginleştirilmiş demo verisi, sunum senaryosu."
  - "Mimari Özeti" ağacı (satır 54–63): `├── analytics/ # gösterge paneli metrikleri` satırı ekle
  - Demo verisi sayıları (satır 23–24): "2 park, 40 demirbaş, 53 bildirim (6 aya yayılmış)"
  - "Demo Kullanıcılar" (satır 27–34): dokunma
  - "Doğrulama" bölümüne: `/panel` gösterge paneli + `docs/sunum-senaryosu.md` linki
- **VALIDATE**: `npm run typecheck`

### T14 — CREATE `docs/sunum-senaryosu.md`

- **IMPLEMENT** (yeni `docs/` dizini — dizin yoksa oluştur). İçerik (PRD Aşama 4 "Sunum senaryosu: canlı QR okutma dahil 8 dakikalık akış"):
  - **Hazırlık kontrol listesi**: `npm install && npm run db:seed && npm run dev`; telefon aynı Wi-Fi'da; `/panel/etiketler?parkId=<id>` yazdırılmış fiziksel etiket (çıktı `screenshots/asama4-etiket-ornegi.png` ile ispatlanır — T16); yedek plan (ekran kaydı, `localhost`).
  - **8 dakikalık akış** (dakika dakika): 0–1' sorun + değer önermesi ("şikâyeti değil, varlığı kaydediyoruz" — PRD Bölüm 1); 1–3' envanter + etiket yazdırma; 3–5' canlı QR okutma → bildirim → panelde anında görünme; 5–7' üstlen → onarım → QR ile kapatma → demirbaş `AKTIF`; 7–8' gösterge paneli: SALN-0001'in "son 6 ayda 6. arıza" satırı + ortalama çözüm süresi + aylık trend; kapanış ve gelecek adımlar (PRD Bölüm 13).
  - **Konuşma noktaları**: R2 itirazına yanıt ("mevcut kanalların rakibi değil, tamamlayıcısı").
- **GOTCHA**: Dokümanda anlatılan her sayı T10 seed'iyle tutarlı olmalı (açık 11, SALN-0001 6 bildirim) — seed değişirse doküman da güncellenir.
- **VALIDATE**: `npm run typecheck`

### T15 — 360px mobil gözden geçirme

- **IMPLEMENT** — agent-browser ile 360×740 viewport'ta şu sayfaları aç (`agent-browser` SKILL.md'deki resize/viewport komutu; gerekirse `agent-browser viewport 360 740`):
  - `/panel` (oturum açık): metrik kartları 2 sütun, `TrendChart`/bar'lar yatay taşma **sayfa gövdesinde** değil (iç `overflow-x-auto`)
  - `/panel/bildirimler`: tablo iç taşma, gövde taşması yok
  - `/q/BANK-0001` (oturumsuz): vatandaş formu tek sütun
  - `/panel/etiketler?parkId=<id>`: yazdırma düzeni
- **IMPLEMENT** — kontrol: `document.documentElement.scrollWidth <= 360` (gövde yatay kaydırma yok). Taşma varsa bileşene `overflow-x-auto` + iç `min-w-[...]` ekle (T6/T7'deki desen).
- **GOTCHA**: PRD 11.3 "360px genişlikte yatay kaydırma yok" hedefi — gövde için geçerli; grafik/tablo **iç** kaydırma kabul edilir.
- **VALIDATE**: her sayfa için yukarıdaki scrollWidth kontrolü + ekran görüntüsü (`screenshots/asama4-mobile-*.png`)

### T16 — Tam doğrulama zinciri + E2E

- **IMPLEMENT** aşağıdaki "VALIDATION COMMANDS" bölümündeki tüm komutları sırayla çalıştır; Level 5 agent-browser akışını `screenshots/asama4-*.png` ile tamamla.
- **GOTCHA**: E2E öncesi `npm run db:seed` — panel sayıları seed'le tutarlı olmalı (Açık 11, Geciken 5, SALN-0001 6 bildirim).

---

## TESTING STRATEGY

### Unit Tests

- `src/features/analytics/service.test.ts` — 7 metriğin tamamı: boş DB, sayılar (açık/geciken/toplam), ortalama çözüm süresi (REDDEDILDI hariç, null guard), top-5 (sıralama, limit, 12 ay penceresi, bağ sıralaması), park dağılımı (REDDEDILDI closed), tür dağılımı (çoktan aza), `buildMonthlyTrend` (kova üretimi, boş ay, null closedAt, pencere dışı kayıt). Mevcut tüm testler yeşil kalmalı (regresyon yok).

### Integration Tests

Mevcut desende servis testleri zaten gerçek SQLite üzerinde çalışır (`tests/setup.ts`) — analytics testleri de aynı niteliktedir. Ayrı route testi yok.

### Edge Cases

- Boş veritabanı → tüm metrikler sıfır/null, grafikler `EmptyState`
- `avgResolutionHours`: hiç ONARILDI yok → `null`; `closedAt` null ONARILDI → hesaba katılmaz
- `REDDEDILDI` ortalama süreye girmez ama park dağılımında `closed` sayılır
- 12 aydan eski bildirim top-5'e girmez; 6 aydan eski trend'e girmez
- Eşit arıza sayılı demirbaşlar → kod sırası (deterministik)
- 0 bildirimli grafik: `max` 1'e sabitlenir, 0'a bölme yok

### E2E / Browser Automation

`agent-browser` skill'i ile doğrulanacak akışlar (`screenshots/asama4-*.png`):

- **Happy path:** `npm run db:seed` sonrası `http://localhost:3000/giris` → `yonetici`/`yonetici123` → `/panel`: metrik kartları (Açık Bildirim 11, Geciken 5, Toplam 53), "En Çok Arıza Veren Demirbaşlar" tablosunda `SALN-0001` ilk sırada 6 bildirim, tür dağılımı bar'ları ve 6 aylık trend çubuğu görünür
- **Rol akışı:** `personel`/`personel123` ile `/panel` de açılır (gösterge paneli her iki role açık)
- **Mobil:** 360×740 viewport'ta `/panel` — gövde taşması yok (`scrollWidth <= 360`), grafikler iç kaydırmayla görünür
- **Error paths:** oturumsuz `/panel` → `/giris` (regresyon); `/q/BANK-9999` → "Bu kod bulunamadı" (regresyon)
- **Screenshots:** `screenshots/asama4-dashboard.png`, `asama4-dashboard-trend.png`, `asama4-mobile-360.png`, `asama4-personel-dashboard.png`, `asama4-etiket-ornegi.png` (`/panel/etiketler?parkId=...` yazdırma görünümü — fiziksel çıktı örneğinin dijital kanıtı), `asama4-q-notfound.png`
- `agent-browser errors` ile console hatası olmadığı doğrulanır

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
npm run lint
npm run typecheck
```

### Level 2: Unit Tests

```bash
npm test
# hedefli:
npx vitest run src/features/analytics/service.test.ts
```

### Level 3: Build

```bash
npm run build
```

### Level 4: Manual Validation

1. `npm run db:seed` (2 kez — idempotent) → `npm run dev`
2. `/giris` → `yonetici`/`yonetici123` → `/panel`
3. Paneldeki her sayıyı veritabanından doğrula (PRD Aşama 4 doğrulama kriteri): `npx prisma studio` ile `Report` tablosunda açık = YENI+ATANDI sayısı, geciken = 7+ gün açık, SALN-0001'in 6 kaydı
4. `/panel/bildirimler` ve `/q/BANK-0001` regresyon kontrolü (listeler, kapatma formu)
5. `personel` ile `/panel` — erişim açık

### Level 5: E2E / Browser Automation

```bash
npm run db:seed
npm run dev   # http://localhost:3000

agent-browser open http://localhost:3000/giris
# yonetici girişi → /panel
agent-browser screenshot screenshots/asama4-dashboard.png
# trend ve dağılımlar görünür
agent-browser screenshot screenshots/asama4-dashboard-trend.png
# 360x740 viewport → taşma kontrolü
agent-browser screenshot screenshots/asama4-mobile-360.png
# personel girişi → /panel
agent-browser screenshot screenshots/asama4-personel-dashboard.png
# etiket sayfası (yazdırma örneği)
agent-browser open http://localhost:3000/panel/etiketler?parkId=<ilk-park-id>
agent-browser screenshot screenshots/asama4-etiket-ornegi.png
# geçersiz kod (regresyon)
agent-browser open http://localhost:3000/q/BANK-9999
agent-browser screenshot screenshots/asama4-q-notfound.png

agent-browser errors
agent-browser close
```

**NOT:** `agent-browser` Windows'ta Unix socket sorunu yaşayabilir (SKILL.md satır 22) — WSL veya Linux container kullan; mevcut `screenshots/asama2-*.png` örnekleri yerel ortamda üretildiği için bu ortamda çalışıyor olmalı (Aşama 3 planının satır 783'teki notu).

### Level 6: Additional Validation

- `npm run db:seed` idempotence: iki kez çalıştır, ikinci çalıştırmada hata olmaz
- `npx prisma studio` — metriklerin elle doğrulanması (Level 4'teki adım)

---

## ACCEPTANCE CRITERIA

- [ ] `/panel` gösterge paneli PRD 7.2'deki **7 metriğin tamamını gerçek veriden hesaplar** (açık, ortalama çözüm süresi, geciken, top-5, park dağılımı, tür dağılımı, aylık trend)
- [ ] Grafikler saf CSS/SVG, yeni bağımlılık yok (`package.json` değişmez)
- [ ] Gösterge paneli hem `YONETICI` hem `SAHA_GOREVLISI` ile açılır; oturumsuz `/giris`'e yönlenir (regresyon yok)
- [ ] Boş veritabanında panel sıfırlarla ve `EmptyState` mesajlarıyla render edilir (çökme yok)
- [ ] Seed: 2 park, 40 demirbaş, 53 bildirim — 6 takvim ayına dağılmış, tüm sorun tipleri, tekrarlı arıza veren demirbaşlar (SALN-0001 6 bildirim), idempotent
- [ ] `SALN-0001` top-5 tablosunda 1. sırada; ortalama çözüm süresi `formatDurationTR` ile Türkçe görüntülenir
- [ ] 360px viewport'ta gövde yatay taşması yok (grafik/tablo içi kaydırma kabul edilir)
- [ ] `docs/sunum-senaryosu.md` — 8 dakikalık canlı demo akışı + hazırlık/yedek planı
- [ ] README'ler güncellendi (analytics README, reports README notu, kök README)
- [ ] Tüm mevcut testler yeşil; `npm run lint && npm run typecheck && npm run build` sıfır hata
- [ ] E2E akışları ekran görüntüleriyle doğrulanmış (`screenshots/asama4-*.png`)

---

## COMPLETION CHECKLIST

- [ ] Tüm görevler sırayla tamamlandı (T1 → T16)
- [ ] Her görevin VALIDATE komutu geçti
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` başarılı
- [ ] Level 5 agent-browser E2E doğrulaması geçti (screenshots/ kaydedildi)
- [ ] Manual doğrulama (Level 4) tamamlandı — paneldeki sayılar DB ile birebir
- [ ] Kabul kriterlerinin tümü sağlandı
- [ ] Kod gözden geçirildi (desen tutarlılığı, <300 satır kuralı — `service.ts` büyürse `buildMonthlyTrend` ayrı dosyaya alınabilir)

---

## NOTES

**Tasarım kararları:**

1. **API route yerine Server Component.** PRD 10.2 `GET /api/analytics/summary` tanımlar; kod tabanı konvansiyonu (Aşama 3 NOTES #1) panel verisini Server Component + Server Action ile üretir. Dashboard salt-okuma olduğundan Server Action bile gerekmez — sayfa doğrudan `analyticsService.getDashboardData()` çağırır. Tüketicisi olmayan route yazmak dead code üretir.
2. **recharts yerine saf CSS/SVG.** Kullanıcı onayı. Gerekçe: proje zaten PRD'den saparak `date-fns` yerine `Intl` tabanlı `formatDateTR`/`formatDurationTR` yazdı; recharts ~500KB paket + client bileşen zorunluluğu + React 19 SSR uyum riski getirir. Bar/trend grafikleri `div`'lerle sunucuda render edilir — sıfır risk, sıfır bağımlılık. Bu sapma `analytics/README.md`'de belgelenir.
3. **2. park (Atatürk Parkı) eklenir.** PRD'nin "1 park" ifadesi Aşama 1'in asgari çıktısıydı; park bazında dağılım metriği (PRD'de zorunlu) tek parkla tek bar üretir. "≥ 35 demirbaş" hedefi korunur (40'a çıkar). README ve sunum dokümanı bu sayıyla güncellenir.
4. **`OVERDUE_DAYS` kopyalanır.** `reports/constants.ts:35`'in değeri analytics'te yinelenir — üç-dilim kuralı (3 dilim kullanana kadar shared'e taşınmaz). İki değer senkron kalmalı.
5. **`avgResolutionHours` saat cinsinden, 1 ondalık.** `formatDurationTR` `ms` ister; page `* 3_600_000` ile çevirir. `null` → "—".
6. **Dashboard her iki role açık.** `NAV_ITEMS` her iki rol için ortak (layout.tsx:7-12); PRD 10.2'deki `YONETICI` kısıtı API içindir ve karar #1 gereği yoktur.
7. **Metrik hesaplarında `ReportEvent` yerine `Report.closedAt`.** PRD Bölüm 11.2/7.2 ortalama çözüm süresini `closedAt - createdAt` olarak tanımlar; `ReportEvent` zaman çizelgesi detay sayfasında kalır.
8. **`Promise.all` ile 7 sorgu paralel.** Demo ölçeğinde maliyet önemsiz; sayfa tek pass'ta veriyi alır.

**Bilinen riskler:**

- Seed planı kod bazlı (53 satır) — `AssetCodeCounter` global sayaç yüzünden 2. park kodları `BANK-0015`'ten başlar; kodların şemayla (T10 GOTCHA) çakışmaması için plan birebir uygulanmalı.
- `groupBy` + `orderBy: { _count: { _all: "desc" } }` Prisma 7 SQLite'te doğrulanmalı (T2 VALIDATE) — sorun olursa düşüş planı: `findMany` + JS'te gruplama (demo ölçeğinde ~53 kayıt, maliyet önemsiz).
- `buildMonthlyTrend` 30 günlük ay yaklaşımı sınırı yalnızca sorgu penceresi içindir; kovalama `monthKey` ile tarihe göre yapıldığından kayma olmaz.

**Devir:** Aşama 4 tamamlandığında PRD Bölüm 12'deki 4 aşamanın tamamı gerçekleşmiş olur — proje MVP kapsamında **tamamlanmış** sayılır; kalan tek iş sunum (docs/sunum-senaryosu.md) ve fiziksel etiket çıktısıdır. Gelecek özellikler PRD Bölüm 13'teki listeden planlanır.

**Confidence Score: 8/10**
