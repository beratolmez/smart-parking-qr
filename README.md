# ParkTakip

Belediye parklarındaki demirbaşların (bank, oyun grubu, çöp kutusu vb.) dijital envanterini
tutan, her demirbaş için benzersiz bir QR etiket üreten ve vatandaşların QR okutarak arıza
bildirebildiği bir yönetim uygulaması.

Bu depo **Aşama 1 — İskelet, Envanter ve QR** ve **Aşama 2 — Vatandaş Bildirim Akışı** çıktılarını
içerir: proje iskeleti, veri modeli, demirbaş envanteri (ekleme/düzenleme), A4 yazdırılabilir QR
etiket sayfası ve QR okutan vatandaşın fotoğraflı arıza bildirimi gönderebildiği akış
(`/q/[code]` + `POST /api/public/reports`).

## Kurulum

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`http://localhost:3000/panel/demirbaslar` — 1 park, 35 demirbaş ile dolu envanter listesini
gösterir.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu (Turbopack) |
| `npm run build` | Üretim derlemesi |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run typegen` | Next.js route tiplerini üretir (`PageProps<>` için gerekli) |
| `npm run db:migrate` | Prisma migration uygular |
| `npm run db:seed` | Demo verisini yükler (idempotent) |
| `npm run db:reset` | Veritabanını sıfırlar ve yeniden migrate eder |
| `npm test` | Vitest test paketini çalıştırır |

## Mimari Özeti

Dikey dilim (vertical slice) yaklaşımı:

```
src/
├── core/        # evrensel altyapı: db, config, logger, errors
├── shared/      # 3+ özellik kullanınca buraya taşınır
├── features/
│   └── assets/  # demirbaş envanteri — service/repository/schemas/qr
└── app/         # Next.js App Router: sayfalar + API route'ları
```

Katman akışı: `page.tsx` / `route.ts` / `actions.ts` → `service.ts` (iş kuralları) →
`repository.ts` (yalnızca Prisma sorguları) → `core/db.ts` → Prisma.

Ayrıntılar için [`src/features/assets/README.md`](src/features/assets/README.md) ve
[`src/features/reports/README.md`](src/features/reports/README.md).

## Prisma 7 / Next.js 16 Tuzakları

Bu proje Prisma 7 ve Next.js 16 ile kuruldu — ikisi de eğitim verisindeki alışılagelmiş
kullanımdan belirgin şekilde farklı. Karşılaşılan ve çözülen sorunlar:

- **`params` artık Promise.** Next 16'da `await props.params` zorunlu; senkron erişim derlenmez.
  Tip güvenliği için `npm run typegen` sonrası `PageProps<'/route'>` / `RouteContext<'/route'>`
  kullanılır.
- **Prisma generator değişti.** `provider = "prisma-client"` (⚠️ `prisma-client-js` değil,
  deprecated). `output` alanı zorunlu; import yolu `@prisma/client` değil, generator'ın
  `output`'una göre değişir (bu projede `@/generated/prisma/client`).
- **`prisma.config.ts` zorunlu** ve `package.json.prisma.seed` artık okunmuyor — seed komutu
  `prisma.config.ts` → `migrations.seed` alanında tanımlanır.
- **SQLite driver adapter zorunlu.** `new PrismaClient()` adapter olmadan bağlanmıyor;
  `@prisma/adapter-better-sqlite3` kullanıldı. `better-sqlite3` native modül olduğu için
  `next.config.ts` → `serverExternalPackages` listesine eklenmesi gerekiyor, yoksa Turbopack
  paketlemeye çalışıp `invalid ELF header` benzeri hatalar veriyor.
- **`DATABASE_URL` göreli yolu proje köküne göre çözülüyor**, `prisma/` klasörüne göre değil.
  `.env` içinde `file:./prisma/dev.db` kullanılıyor (bkz.
  [`src/features/assets/README.md`](src/features/assets/README.md)).
- **`server-only` paketi düz Node'da (tsx, vitest) hata fırlatır** — yalnızca Next'in webpack
  `react-server` koşuluyla no-op olur. Seed betiği `tsx --conditions=react-server` ile,
  testler ise `vitest.config.ts`'teki `server-only` alias'ı ile çalıştırılıyor.
- **Zod 4 API değişiklikleri.** `z.string().url()` → `z.url()`; hata mesajı parametresi
  `{ message }` değil `{ error }`; `error.flatten()` → `z.flattenError(error)`.
- **`next lint` kaldırıldı.** `lint` scripti doğrudan `eslint .` çağırıyor.
- **`sharp` native modül — `serverExternalPackages`'ta.** `next.config.ts` listesine eklenmezse
  Turbopack paketlemeye çalışır ve derleme patlar.
- **`UPLOAD_DIR` göreli yol proje köküne göre çözülüyor.** `savePhoto` dizini otomatik oluşturur
  (`mkdir recursive`); testler `tests/.uploads` kullanır (`.gitignore`'da).
- **Rate limit bellek içidir.** `core/rate-limit.ts` kovaları işlem belleğinde tutar — sunucu
  yeniden başlayınca sayaçlar sıfırlanır (demo ölçeği için kabul edilen davranış).
- **`Object.fromEntries(formData)` kullanma.** `File` nesneleri bozulur; multipart alanlar tek tek
  `formData.get()` ile okunur (`POST /api/public/reports`).
- **SQLite `autoincrement()` non-id alanda desteklenmez.** `Report.ticketNo`, Aşama 1'deki
  `AssetCodeCounter` gibi `ReportCounter` atomik sayacından tahsis edilir.

## Doğrulama

Etiket sayfası (`/panel/etiketler?parkId=<id>`) yazdırılıp çıktıdaki QR gerçek bir telefonla
okutulmalı — doğru URL'e gitmeli ve bildirim formunu göstermeli. Servis testleri 100 demirbaşlık
toplu eklemede kod çakışması olmadığını (`src/features/assets/service.test.ts`) ve tekilleştirme
+ hız sınırı + fotoğraf boru hattını (`src/features/reports/service.test.ts`,
`src/features/reports/photos.test.ts`) doğrular.
