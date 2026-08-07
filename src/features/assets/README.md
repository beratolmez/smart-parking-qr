# Assets Feature (Demirbaş Envanteri)

Park demirbaşlarının (bank, oyun grubu, çöp kutusu vb.) dijital envanterini yönetir; her demirbaşa
çakışmasız bir kod (`BANK-0147`) tahsis eder ve bu kodları QR etikete çevirir.

## Ana Akışlar

### Demirbaş Ekleme (tekil + toplu)

1. `actions.ts` → `createAssetsAction` form verisini `createAssetsSchema` ile doğrular.
2. `service.ts` → `createAssets` seçilen parkın var olduğunu kontrol eder.
3. Tek bir `prisma.$transaction` içinde:
   - `repository.allocateSequence` sayaç tablosunu atomik artırır ve tahsis edilen ilk sıra
     numarasını döner.
   - `codes.ts` → `formatAssetCode` ile sıra numaraları koda çevrilir (`BANK-0148`).
   - `createMany` ile kayıtlar tek seferde yazılır.
4. Oluşan kodlar `findMany({ code: { in: codes } })` ile geri okunur (SQLite `createMany` kayıt
   döndürmez).

### Kod Tahsisi (atomik sayaç)

`AssetCodeCounter` tablosu her `AssetType` için son kullanılan sırayı tutar. `upsert` +
`increment` transaction içinde çalıştığı için toplu eklemede veya eşzamanlı isteklerde çakışma
oluşmaz. `SELECT MAX(code)` yaklaşımı **kullanılmadı** — bu, tek kullanıcılı demoda çalışır ama
100'lük toplu eklemede çakışır.

### Etiket Yazdırma

`etiketler/page.tsx` → `?ids=a,b,c` veya `?parkId=x` ile demirbaş seçer, `LabelSheet` her biri için
sunucuda QR SVG üretip satır içi gömer (`<img src="/api/...">` **kullanılmadı** — 12 ayrı HTTP
isteği yazdırma anında tamamlanmayabilir). A4, sayfa başına 3×4 = 12 etiket.

## İş Kuralları

- **Kod değişmez.** `updateAsset` girdisi `code` alanını kabul etmez — kod fiziksel etikete
  basılıdır, değişirse etiket geçersiz olur.
- **Silme yok.** Demirbaş `archiveAsset` ile `HURDA` durumuna alınır; Aşama 2'deki bildirimlerin
  yetim kalmaması için kayıt korunur.
- **Sayaç türe göre küresel.** Aynı türden demirbaşlar farklı parklara eklense bile kod sırası tek
  bir sayaçtan gelir (`AssetCodeCounter.type` birincil anahtar).

## Entegrasyon Noktaları

- **`features/reports`** (Aşama 2): QR okutan vatandaş `/q/[code]` üzerinden gelir;
  `getAssetByCode` ile demirbaş çözülür. Kullanıcı elle kod girerse `normalizeAssetCode` ile
  serbest metin (`bank-147`, `BANK147`) standart forma çevrilir.
- **`features/analytics`** (Aşama 4): `Asset.status` ve `installedAt` alanları metriklerin
  girdisidir.

## Bilinen Kararlar (Görev 3 — Prisma `datasource.url`)

`prisma.config.ts` içindeki `datasource.url = env("DATABASE_URL")` yeterli oldu;
`schema.prisma`'daki `datasource db` bloğuna ayrıca `url` eklemeye **gerek kalmadı** —
`prisma validate` bu haliyle geçti.

`DATABASE_URL` içindeki göreli yol (`file:./...`) **proje köküne göre** çözülüyor, `prisma/`
klasörüne göre değil (plan taslağının varsaydığının aksine). Bu yüzden `.env` içinde
`file:./prisma/dev.db` kullanılıyor — aksi halde veritabanı dosyası proje kökünde oluşur.

## Test Notu

`server-only` paketi Next'in webpack `react-server` koşulu olmadan (ör. `tsx` veya `vitest` ile
düz Node altında) çalıştırılırsa hata fırlatır. Bu yüzden:

- `prisma.config.ts` → seed komutu `tsx --conditions=react-server prisma/seed.ts` olarak
  tanımlandı.
- `vitest.config.ts` → `resolve.alias` ile `server-only` paketi no-op bir stub'a
  (`tests/stubs/server-only.ts`) yönlendirildi.
