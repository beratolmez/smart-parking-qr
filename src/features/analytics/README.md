# Analytics Feature (Gösterge Paneli / Raporlama)

`/panel` gösterge panelinin 7 metriğini `Report` verisinden üretir. Birim yöneticisi bu ekranda
onarım yerine yenileme kararını veriyle savunabilir (PRD UH-6, UH-7).

## Metrikler ve Hesap Tanımları

PRD Bölüm 7.2 tablosuyla birebir:

| Metrik | Hesap |
|---|---|
| Açık bildirim | `status IN (YENI, ATANDI)` sayısı |
| Ortalama çözüm süresi | `ONARILDI` kayıtlarında `closedAt - createdAt` ortalaması |
| Geciken bildirimler | 7 günden uzun süredir açık kayıtlar (`OVERDUE_DAYS = 7`) |
| En çok arıza veren 5 demirbaş | `Report` sayısına göre `Asset` sıralaması (son 12 ay) |
| Park bazında dağılım | Park başına açık/kapalı bildirim |
| Tür bazında dağılım | `issueType` kırılımı |
| Aylık trend | Son 6 ay: açılan vs. kapanan bildirim |

Hesap detayları:

- **Ortalama çözüm süresi** yalnızca `ONARILDI` ve `closedAt` dolu kayıtları sayar;
  `REDDEDILDI` ve `closedAt` null kayıtlar hesaba katılmaz. Sonuç saat cinsinden 1 ondalık
  yuvarlanır; hiç `ONARILDI` yoksa `null` döner (sayfada "—" gösterilir).
- **Park dağılımında** `REDDEDILDI` `closed` sayılır (tüm terminal durumlar kapatılmıştır).
- **Top-5** son 12 ay penceresini kullanır (`TOP_ASSETS_MONTHS = 12`); eşit arıza sayılı
  demirbaşlar koda göre sıralanır (deterministik).

## Katman Akışı

```
page.tsx (Server Component)  ← layout'ta requireUser; veri servisten
        ↓
     service.ts               ← hesaplamalar, DTO; Prisma çağırmaz
        ↓
    repository.ts             ← yalnızca Prisma (count/findMany/groupBy)
        ↓
     core/db.ts → Prisma
```

`getDashboardData()` 7 sorguyu `Promise.all` ile paralel çalıştırır ve `DashboardData` DTO'sunu
döner. Servis hata fırlatmaz — boş veri sıfır/null olarak temsil edilir; grafikler `EmptyState`
gösterir.

## Aylık Trend Kovaları

`buildMonthlyTrend` saf fonksiyondur (servis içinde export; birim testte doğrudan test edilir):

- Bugünkü aydan geriye 6 ayın `monthKey`'leri üretilir (`YYYY-MM`), kronolojik sırada — boş aylar
  0'lı kova olarak gelir.
- `opened`: `createdAt` o kovaya düşen satır sayısı; `closed`: `closedAt` o kovaya düşen satır
  sayısı (`closedAt` null kayıt `closed`'a yazılmaz).
- Sorgu penceresi 30 günlük ay yaklaşımıyla kesilir (`sinceTrend`), kovalama ise `monthKey` ile
  tarihe göre yapıldığından sınır taşmasında kayma olmaz.

## Tasarım Kararları

- **Saf CSS/SVG grafikler (recharts değil).** Kullanıcı onayıyla grafik kütüphanesi eklenmedi —
  proje `date-fns` yerine `Intl` tabanlı `formatDateTR`/`formatDurationTR` yazdığı gibi sıfır
  harici bağımlılık felsefesinde. Bar/trend grafikleri `div`'lerle sunucuda render edilir;
  ~500KB client paket ve React 19 SSR uyum riski doğmaz.
- **API route yerine Server Component.** PRD 10.2 `GET /api/analytics/summary` tanımlar; kod
  tabanı konvansiyonu (Aşama 3 NOTES #1) panel verisini Server Component'te üretir. Dashboard
  salt-okuma olduğundan Server Action bile gerekmez — sayfa doğrudan `getDashboardData()` çağırır.
  Tüketicisi olmayan route yazmak dead code üretir.
- **`OVERDUE_DAYS` kopyası.** `reports/constants.ts:35`'teki değer burada yinelenir (üç-dilim
  kuralı; 3. dilim kullanılınca `shared/constants.ts`'e taşınır). İki değer senkron kalmalı.
- **Çapraz dilim import yok.** Top-5 asset bilgileri `findAssetsByIds` ile analytics repository
  içinde inline çekilir; `features/assets/repository`'den `listAssetsByIds` import edilmez.
- **`avgResolutionHours` saat cinsindendir.** `formatDurationTR` `ms` ister; sayfa `* 3_600_000`
  ile çevirir. `null` → "—".
- **Grafikler sunucuda render edilir.** Client bileşen yok; `Card` `className`'ı append eder
  (`flex flex-col gap-1` güvenle eklenir).
- **`groupBy` relation'ı traverse etmez.** Park dağılımı `findMany` + JS'te kovalama yapılır
  (demo ölçeği ~53 kayıt). Tür dağılımı ve top-5 `groupBy` + JS gruplama ile üretilir.

## Entegrasyon Noktaları

- **`features/reports`:** panelin tek veri kaynağıdır — `Report.closedAt` → ortalama çözüm
  süresi, `Report.status` → açık/geciken, `ReportEvent` → olay zaman çizelgesi (detay sayfası).
  `analytics` reports verisine yalnızca salt-okuma erişir.
- **`features/assets`:** `Asset.type`/`code`/`park` top-5 tablosunun ve park dağılımının girdisi.
- **`shared/format`:** `formatDurationTR` ortalama çözüm süresi kartında kullanılır.

## Test Notu

`service.test.ts` gerçek SQLite test veritabanı kullanır (Prisma mock yok); `beforeEach`
temizliği `tests/setup.ts`'te zaten var. `createDirectReport` geçmiş `createdAt`/`closedAt`
set edebilmek için servisi değil `prisma.report.create`'i doğrudan kullanır (ticketNo elle
sayaçla tahsis edilir). `buildMonthlyTrend` export edildiği için saf fonksiyon olarak ayrıca
test edilir.
