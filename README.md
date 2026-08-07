# ParkTakip

Belediye parklarındaki demirbaşların (bank, oyun grubu, çöp kutusu vb.) dijital envanterini
tutan, her demirbaş için benzersiz bir QR etiket üreten ve vatandaşların QR okutarak arıza
bildirebildiği bir yönetim uygulaması.

Bu depo **Aşama 1 — İskelet, Envanter ve QR**, **Aşama 2 — Vatandaş Bildirim Akışı**,
**Aşama 3 — Personel Paneli ve Döngü Kapanışı** ve **Aşama 4 — Raporlama ve Sunum Hazırlığı**
çıktılarını içerir: proje iskeleti, veri modeli, demirbaş envanteri (ekleme/düzenleme), A4
yazdırılabilir QR etiket sayfası, QR okutan vatandaşın fotoğraflı arıza bildirimi gönderebildiği
akış (`/q/[code]` + `POST /api/public/reports`), personelin giriş yapıp bildirimleri üstlenip
kapatabildiği panel (`/giris`, `/panel/bildirimler`, oturum çerezi, durum makinesi, `ReportEvent`
olay akışı, QR ile kapatma) ve `/panel` gösterge paneli (7 metrik, saf CSS/SVG grafikler), 6 aya
yayılmış zenginleştirilmiş demo verisi ile 8 dakikalık sunum senaryosu.

## Kurulum

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`http://localhost:3000/panel/demirbaslar` — 2 park, 40 demirbaş ile dolu envanter listesini
gösterir. `http://localhost:3000/panel/bildirimler` — 53 bildirimlik durum/filtre paneline.
`http://localhost:3000/panel` — 7 metrikli gösterge paneli (6 aya yayılmış veri).

## Demo Kullanıcılar

| Rol | Kullanıcı adı | Şifre |
|---|---|---|
| Yönetici (`YONETICI`) | `yonetici` | `yonetici123` |
| Saha Görevlisi (`SAHA_GOREVLISI`) | `personel` | `personel123` |

`YONETICI` demirbaş/park yönetimi ve etiket yazdırmaya yetkilidir; `SAHA_GOREVLISI` yalnızca
bildirimleri görüp üstlenir/kapatır. `REDDEDILDI` geçişi yalnızca yöneticiye açıktır.

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
├── shared/      # 3+ özellik kullanınca buraya taşınır (ActionState, format)
├── features/
│   ├── assets/  # demirbaş envanteri — service/repository/schemas/qr
│   ├── reports/ # bildirim yaşam döngüsü — durum makinesi, olay akışı
│   ├── analytics/ # gösterge paneli metrikleri
│   └── auth/    # kimlik doğrulama — bcrypt, jose oturumu, roller
└── app/         # Next.js App Router: sayfalar + API route'ları
```

Katman akışı: `page.tsx` / `route.ts` / `actions.ts` → `service.ts` (iş kuralları) →
`repository.ts` (yalnızca Prisma sorguları) → `core/db.ts` → Prisma.

Ayrıntılar için [`src/features/assets/README.md`](src/features/assets/README.md),
[`src/features/reports/README.md`](src/features/reports/README.md),
[`src/features/analytics/README.md`](src/features/analytics/README.md) ve
[`src/features/auth/README.md`](src/features/auth/README.md).

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
- **`forbidden()` deneyseldir.** `next.config.ts` → `experimental.authInterrupts: true`
  zorunlu; açılmazsa `requireRole` 403 sayfası üretemez.

## Doğrulama

Etiket sayfası (`/panel/etiketler?parkId=<id>`) yazdırılıp çıktıdaki QR gerçek bir telefonla
okutulmalı — doğru URL'e gitmeli ve bildirim formunu göstermeli. `/panel` gösterge panelindeki her
sayı, `npx prisma studio` ile `Report` tablosundan elle doğrulanabilir (Açık 11, Geciken 5, Toplam
53, SALN-0001 6 bildirim). Servis testleri 100 demirbaşlık
toplu eklemede kod çakışması olmadığını (`src/features/assets/service.test.ts`), tekilleştirme
+ hız sınırı + fotoğraf boru hattı ve durum makinesini (`src/features/reports/service.test.ts`,
`src/features/reports/photos.test.ts`), bcrypt + JWT oturumunu
(`src/features/auth/service.test.ts`, `src/features/auth/session.test.ts`) ve gösterge paneli
metriklerini (`src/features/analytics/service.test.ts`) doğrular.

Sunum için hazır 8 dakikalık canlı demo akışı: [`docs/sunum-senaryosu.md`](docs/sunum-senaryosu.md).

Personel akışı: `/giris` ile giriş → `/panel/bildirimler` → detayda "Üstlen" → "Onarıldı olarak
kapat" → demirbaş `AKTIF`'e döner. Girişli personel aynı QR'ı okutunca `/q/[code]` sayfasında
kapatma formu görür. `SAHA_GOREVLISI` demirbaş yönetim sayfalarına giremez (403).
