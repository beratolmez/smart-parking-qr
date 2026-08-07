# Feature: Aşama 2 — Vatandaş Bildirim Akışı

Bu plan eksiksiz olacak şekilde yazıldı, ancak **uygulamaya başlamadan önce dokümantasyonu ve kod tabanındaki desenleri doğrula.** Next.js 16 ve Prisma 7 eğitim verisindeki kullanımdan farklı çalışıyor — bu planın "GOTCHA" notlarını atlama. Mevcut util, tip ve model isimlerine dikkat et; `@/features/assets` dilimindeki isimler ve katman akışı **kanonik referanstır**, `@/features/reports` bunları birebir taklit eder.

---

## Feature Description

Aşama 1'de üretilen QR etiketler `/q/[kod]` adresine işaret ediyor ve bu adres şu an 404 dönüyor. Aşama 2, o adresi **üyeliksiz vatandaş bildirim sayfası**na dönüştürür:

- QR okutulunca demirbaş bilgisi (park adı, tür, kod) görünür
- Kullanıcı sorun tipini seçer, **zorunlu fotoğraf** yükler, isteğe bağlı açıklama/telefon girer
- `POST /api/public/reports` ucu bildirimi kaydeder; yanıt takip numarası (#2451) ve "Park ve Bahçeler Müdürlüğü'ne iletildi" mesajıdır
- **Tekilleştirme:** aynı demirbaşta açık kayıt (YENI/ATANDI) varsa yeni kayıt açılmaz; `duplicateCount` artar, vatandaşa "Bu sorun zaten bildirilmiş" gösterilir
- **Hız sınırı:** yeni kayıt için aynı IP + aynı demirbaş 5 dakikada 1; aynı IP genel saatte 20 (PRD 9.2)
- **Fotoğraf işleme:** `sharp` ile maks. 1600px küçültme, WebP dönüşümü, **EXIF/GPS metadata silme**
- Ana sayfada "Kod ile bildir" kutusu (`bank-147` gibi serbest metin → `BANK-0147` normalize)
- KVKK aydınlatma metni sayfası

## User Story

**Vatandaş** olarak
kırık demirbaştaki QR kodu okutup fotoğraf yükleyerek bildirim göndermek istiyorum
ki **hangi demirbaş olduğunu tarif etmek zorunda kalmayayım ve işlemin gerçekten ulaştığını bileyim.**

## Problem Statement

Aşama 1'in QR etiketleri bir kimlik taşıyor ama kimliğin karşılığı yok: `/q/[kod]` 404 dönüyor, bildirim kanalı yok. PRD'nin temel vaadi — "şikâyeti değil, varlığı kaydediyoruz" — ancak bildirimler demirbaşa bağlandığında gerçekleşir. Ayrıca asılsız/spam bildirimlere karşı zorunlu fotoğraf, tekilleştirme ve hız sınırı önlemleri (PRD 9.2) bu aşamada kurulur.

## Solution Statement

`Report` veri modeli + `features/reports` dikey dilimi (constants/schemas/repository/service/photos), public API ucu (`POST /api/public/reports`), açık sayfa (`/q/[code]`), KVKK sayfası ve ana sayfaya kod arama kutusu. İş kuralları servis katmanında; girdi doğrulama zod ile sınırda; hata biçimi Aşama 1'deki `{ error, detail }` sözleşmesine uyar. Aşama 3'e devir: durum makinesi (`ATANDI/ONARILDI/REDDEDILDI`), `ReportEvent`, `User` ve personel paneli.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `prisma/schema.prisma`, `src/core/` (config, errors, rate-limit), `src/features/reports/` (yeni dilim), `src/app/q/[code]`, `src/app/api/public/reports`, `src/app/page.tsx`, `src/app/kvkk`, `tests/`
**Dependencies**: `sharp` (yeni bağımlılık), mevcut: zod 4.4, Prisma 7.9, Next 16.3

---

## CONTEXT REFERENCES

### Okunması Zorunlu Proje Dosyaları

Bu dosyaları uygulamaya başlamadan **önce oku**:

- `src/features/assets/service.ts` (tam dosya, 84 satır) — Servis katmanı deseni: `logger.info("domain.action.started")`, `NotFoundError`, Prisma'yı doğrudan çağırmaz, repository'ye delege eder. `getAssetByCode` buradan yeniden kullanılacak.
- `src/features/assets/repository.ts` (tam dosya, 64 satır) — Repository deseni: `Prisma.TransactionClient` alan `tx` parametreli fonksiyonlar (`allocateSequence` satır 53). Transaction sınırını **servis** yönetir.
- `src/features/assets/schemas.ts` (satır 1–6, 47–53) — `emptyToUndefined` preprocess yardımcısı ve zod 4 hata sözdizimi `{ error: "..." }`. Üç-özellik kuralı gereği aynı yardımcı `reports/schemas.ts`'e kopyalanır.
- `src/features/assets/actions.ts` (satır 14–17) — `z.flattenError(parsed.error).fieldErrors` kullanımı.
- `src/app/api/assets/[id]/qr/route.ts` (tam dosya, 56 satır) — Route handler deseni: `RouteContext<"...">`, `await ctx.params`, `AppError` → `{ error: e.code, detail: e.message }` dönüşümü (satır 50–55).
- `src/features/assets/service.test.ts` (satır 1–8) — Test deseni: gerçek SQLite test veritabanı, `createTestPark` yardımcısı, Prisma mock'lanmaz.
- `tests/setup.ts` (tam dosya, 15 satır) — `DATABASE_URL` ataması, `migrate deploy`, `beforeEach` temizliği. **Report tablosu temizliği buraya eklenecek** (foreign key sırası!).
- `src/features/assets/constants.ts` (satır 1–3) — Enum listeleri `as const satisfies readonly EnumType[]` deseni; `@/generated/prisma/enums` import yolu.
- `src/features/assets/codes.ts` (satır 15–22) — `normalizeAssetCode`: serbest metni `BANK-0147`'ye çevirir. **Aşama 1'de tam bu aşama için yazıldı.**
- `src/features/assets/qr.ts` (satır 1–5) — `assetUrl`: QR'ın işaret ettiği adresin üretildiği yer.
- `src/features/assets/components/AssetForm.tsx` (satır 22–34, 214–227) — Client Component deseni: `useActionState`, `min-h-11` dokunma hedefi, `role="status" aria-live="polite"` hata mesajı.
- `src/app/page.tsx` (tam dosya) — Ana sayfa; "Kod ile bildir" kutusu buraya eklenecek.
- `src/app/panel/etiketler/page.tsx` (satır 6–14) — `PageProps<...>`, async `searchParams` deseni.
- `prisma/schema.prisma` (tam dosya, 63 satır) — Mevcut şema. `Asset` modeline `reports Report[]` back-relation eklenecek.
- `prisma/seed.ts` (satır 27–31) — `deleteMany` sırası (foreign key). Aşama 2'de seed değişmez; Aşama 3/4'te bildirim verisi eklenecek.
- `next.config.ts` (satır 4) — `serverExternalPackages`: **`sharp` buraya eklenir** (Aşama 1 planının açık devir notu).
- `src/core/errors.ts` (tam dosya) — `AppError` sınıf hiyerarşisi; `RateLimitError` (429) buraya eklenir.
- `src/core/config.ts` (satır 4–8) — Zod ile doğrulanmış env; `UPLOAD_DIR` buraya eklenir.

### Oluşturulacak Yeni Dosyalar

**core/**
- `src/core/rate-limit.ts` — Bellek içi kova tabanlı hız sınırı + `RateLimitError`(429)
- `src/core/rate-limit.test.ts` — Sahte saat ile sınır/pencereden çıkış testleri

**features/reports/**
- `src/features/reports/constants.ts` — `ISSUE_TYPES`, `ISSUE_TYPE_LABELS`, `REPORT_STATUS_LABELS`
- `src/features/reports/schemas.ts` — `createReportSchema` (File doğrulaması dahil), `CreateReportInput` tipi
- `src/features/reports/repository.ts` — `findOpenReport`, `createReport`, `registerDuplicate` (hepsi `tx` alır)
- `src/features/reports/photos.ts` — `processPhoto` (sharp: doğrulama + küçültme + WebP + EXIF temizleme), `savePhoto`
- `src/features/reports/service.ts` — `createReport` (iş kuralları: tekilleştirme, hız sınırı, fotoğraf), `getOpenReport`
- `src/features/reports/components/ReportForm.tsx` — Vatandaş bildirim formu (Client Component, fetch ile)
- `src/features/reports/components/CodeLookupForm.tsx` — "Kod ile bildir" kutusu (Client Component)
- `src/features/reports/service.test.ts` — Tekilleştirme, hız sınırı, hata yolları
- `src/features/reports/photos.test.ts` — sharp boru hattı (boyut, format, EXIF)
- `src/features/reports/README.md`

**app/**
- `src/app/q/[code]/page.tsx` — QR açılış sayfası (Public)
- `src/app/api/public/reports/route.ts` — `POST` bildirim ucu
- `src/app/kvkk/page.tsx` — KVKK aydınlatma metni

**güncellemeler:** `prisma/schema.prisma` (+Report, +3 enum, Asset'e back-relation), `src/core/config.ts` (+UPLOAD_DIR), `src/core/errors.ts` (+RateLimitError), `next.config.ts` (+sharp), `src/app/page.tsx` (kod kutusu), `tests/setup.ts` (+report temizliği, +UPLOAD_DIR), `.env`, `.env.example`, `.gitignore`, kök `README.md`

### Okunması Zorunlu Dokümantasyon

- `PRD.md` (Bölüm 7.1 — Veri Modeli, satır 313–335) — `Report` modelinin kanonik tanımı. `ReportEvent` ve `User` Aşama 3'e aittir; **Aşama 2'de oluşturulmaz.**
- `PRD.md` (Bölüm 10.1 — Açık Uçlar, satır 504–545) — `/q/[code]` ve `POST /api/public/reports` yanıt sözleşmeleri (201/200/404/429/422).
- `PRD.md` (Bölüm 9.2–9.3 — Kötüye Kullanım Önlemleri ve KVKK, satır 465–480) — Hız sınırı, dosya kısıtı, EXIF temizleme, KVKK gereklilikleri.
- `PRD.md` (Bölüm 12, Aşama 2, satır 643–657) — Bu aşamanın çıktıları ve doğrulama kriterleri.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (satır 501–510) — Route Handler'da `request.formData()` ile multipart okuma. **App Router'da `bodyParser` config'i YOKTUR** (o, Pages Router'a aittir) — `formData()` yerleşik çalışır.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (satır 80–121) — `ctx.params` Promise'dir; `RouteContext<'...'>` helper'ı `next typegen` sonrası küresel kullanılabilir.
- [sharp API — operation](https://sharp.pixelplumbing.com/api-operation) — `.rotate()`, `.resize()`, `.webp()`; EXIF davranışı.
  - Neden: `.rotate()` EXIF yönünü piksele uygular; `.withMetadata()` **çağrılmadığı sürece** sharp çıktıda EXIF/GPS dahil tüm metadata'yı **atar** — KVKK gereksinimi böyle karşılanır. `sharp(buffer).metadata()` ise magic-byte doğrulaması için.
- [sharp GitHub issue #3867](https://github.com/lovell/sharp/issues/3867) — WebP'de EXIF orientation desteği yok; `.rotate()` çağırmadan döndürülmüş fotoğraflar yanlış görünür.

### Uyulacak Desenler

**Katman akışı** (Aşama 1'deki kanonik yapı — bozulmaz):

```
route.ts / page.tsx      ← girdi zod'dan geçer (sınırda doğrulama)
        ↓
     service.ts           ← iş kuralları (tekilleştirme, hız sınırı, fotoğraf); Prisma'yı doğrudan çağırmaz
        ↓
    repository.ts         ← yalnızca Prisma sorguları; `tx: Prisma.TransactionClient` alan fonksiyonlar
        ↓
     core/db.ts → Prisma
```

**İsimlendirme:** dosya kebab-case (`rate-limit.ts`, `photos.ts`), bileşen PascalCase (`ReportForm.tsx`), fonksiyon camelCase İngilizce (`createReport`, `processPhoto`), enum değerleri SCREAMING_SNAKE Türkçe (`KIRIK_HASARLI`), kullanıcı metni Türkçe. Log olay adı `{domain}.{action}.{status}`: `report.create.started` / `report.create.success` / `report.create.duplicate`.

**Hata yönetimi** — mevcut `AppError` hiyerarşisine ekleme:

```ts
// src/core/errors.ts — mevcut ValidationError'ın altına
export class RateLimitError extends AppError {
  constructor(message: string) {
    super("RATE_LIMITED", message, 429);
  }
}
```

**Route handler hata dönüşümü** — `src/app/api/assets/[id]/qr/route.ts:50` deseni:

```ts
catch (e) {
  if (e instanceof AppError) {
    return NextResponse.json({ error: e.code, detail: e.message }, { status: e.status });
  }
  throw e;
}
```

**Repository `tx` deseni** — `src/features/assets/repository.ts:53` deseni:

```ts
export async function findOpenReport(tx: Prisma.TransactionClient, assetId: string): Promise<Report | null> {
  return tx.report.findFirst({
    where: { assetId, status: { in: ["YENI", "ATANDI"] } },
    orderBy: { createdAt: "desc" },
  });
}
```

**Anti-desenler — yapma:**

- ❌ `sharp`'ı `serverExternalPackages`'a eklemeden kullanma — native modül, Turbopack paketlemeye çalışır ve hata verir
- ❌ `Object.fromEntries(formData)` ile doğrulama — `File` nesnesi bozulur; alanları tek tek `formData.get()` ile çek
- ❌ `.withMetadata()` çağırma — EXIF/GPS'in kalması KVKK ihlalidir; varsayılan davranış metadata'yı atar
- ❌ Fotoğrafı `public/uploads` dışına yazma veya kullanıcı dosya adını kullanma — path traversal; `randomUUID()` ad kullan
- ❌ `params`/`searchParams`'ı senkron kullanma — Next 16'da Promise
- ❌ Rate limit'i çerez/global değişken yerine veritabanına koyma — demo ölçeğinde bellek içi yeterli ve test edilebilir (enjekte edilebilir saatle)
- ❌ `code`'u serviste tekrar normalize etme — sınırda (`schemas.ts` transform) normalize edilir

---

## IMPLEMENTATION PLAN

### Phase 1: Temel (Foundation)

Veri modeli, config ve altyapı: `Report` şeması + migration, `UPLOAD_DIR` config, `RateLimitError`, `core/rate-limit.ts`, `sharp` kurulumu. Bu faz bitmeden özellik kodu yazılmaz.

### Phase 2: Çekirdek Uygulama (Core Implementation)

`features/reports` dilimi: constants, schemas, repository, photos (sharp boru hattı), service (tekilleştirme + hız sınırı). Tümü arayüzsüz test edilebilir.

### Phase 3: Entegrasyon (Integration)

`POST /api/public/reports` route handler, `/q/[code]` sayfası, `ReportForm`/`CodeLookupForm` client bileşenleri, ana sayfa kutusu, KVKK sayfası.

### Phase 4: Test ve Doğrulama

Birim + servis testleri, E2E tarayıcı doğrulaması, API curl doğrulaması, build.

---

## STEP-BY-STEP TASKS

Görevleri **sırayla, yukarıdan aşağıya** uygula. Her görev atomik ve bağımsız doğrulanabilir.

---

### 1. ADD — `sharp` bağımlılığı ve `next.config.ts`

- **IMPLEMENT**: `npm install sharp`; `next.config.ts` içindeki `serverExternalPackages` listesine `"sharp"` ekle.
- **PATTERN**: `next.config.ts:4` — `["@prisma/adapter-better-sqlite3", "better-sqlite3"]` listesinin sonuna ekle.
- **GOTCHA (kritik)**: sharp bir **native** modüldür. Listeye eklenmezse Turbopack paketlemeye çalışır ve `Module not found: Can't resolve 'sharp'` benzeri hata verir (Aşama 1 planının devir notu). Windows'ta sharp prebuild ikili indirir; Node 24 desteği mevcuttur, kurulum çıktısını izle.
- **VALIDATE**: `npm run build`

---

### 2. UPDATE — `prisma/schema.prisma` + migration

- **IMPLEMENT**: PRD Bölüm 7.1'deki `Report` modelini ekle (satır 313–335). **`ReportEvent` ve `User` Aşama 3'e aittir — EKLENMEZ.** `Asset` modeline `reports Report[]` back-relation ekle. Enum'lar: `IssueType`, `ReportStatus`, `ReporterType`.

  ```prisma
  model Asset {
    // ... mevcut alanlar
    reports   Report[]
  }

  model Report {
    id             String       @id @default(cuid())
    ticketNo       Int          @unique @default(autoincrement())
    asset          Asset        @relation(fields: [assetId], references: [id])
    assetId        String
    issueType      IssueType
    description    String?
    photoUrl       String
    reporterType   ReporterType @default(VATANDAS)
    reporterPhone  String?
    status         ReportStatus @default(YENI)
    duplicateCount Int          @default(1)
    resolutionNote String?
    resolvedPhoto  String?
    createdAt      DateTime     @default(now())
    closedAt       DateTime?

    @@index([assetId, status])
    @@index([status, createdAt])
  }

  enum IssueType   { KIRIK_HASARLI KIRLI BOYA_DOKUNTU TEHLIKELI EKSIK_CALINMIS DIGER }
  enum ReportStatus{ YENI ATANDI ONARILDI REDDEDILDI }
  enum ReporterType{ VATANDAS PERSONEL }
  ```
- **PATTERN**: Model İngilizce/PascalCase, enum değerleri Türkçe/SCREAMING_SNAKE (mevcut `schema.prisma` deseni). `resolutionNote`, `resolvedPhoto`, `closedAt` Aşama 3'te kullanılır ama şema zaten kanonik olduğu için şimdi eklenir — Aşama 3 migration yükünü azaltır.
- **GOTCHA**: Migration komutu `npm run db:migrate -- --name add_reports`. Migration sonrası `npm run db:generate` (veya migrate dev otomatik üretir) — `src/generated/prisma` yenilenir; `Report` ve yeni enum tipleri `@/generated/prisma/client` ve `@/generated/prisma/enums`'tan import edilir.
- **VALIDATE**: `npx prisma validate` ve `npx prisma migrate dev --name add_reports` (hata vermeden uygulanmalı)

---

### 3. UPDATE — `src/core/config.ts` + `.env` + `.env.example` + `.gitignore`

- **IMPLEMENT**: `UPLOAD_DIR` ortam değişkenini ekle.
  ```ts
  const schema = z.object({
    DATABASE_URL: z.string().min(1, { error: "DATABASE_URL tanımlı değil." }),
    APP_URL: z.url({ error: "APP_URL geçerli bir URL olmalı." }),
    MUNICIPALITY_NAME: z.string().min(1).default("Belediye"),
    UPLOAD_DIR: z.string().min(1).default("./public/uploads"),
  });
  ```
- **GOTCHA**: `.env` ve `.env.example`'a `UPLOAD_DIR="./public/uploads"` satırını ekle. `.gitignore`'a `public/uploads/` ve `tests/.uploads/` ekle (test fotoğrafları).
- **GOTCHA**: `UPLOAD_DIR` göreli yolu **proje köküne** göre çözülür (cwd). `savePhoto` `mkdir(..., { recursive: true })` yaptığı için dizinin önceden var olması gerekmez.
- **VALIDATE**: `npm run typecheck` ve `git check-ignore public/uploads/` çıktı vermeli

---

### 4. UPDATE — `src/core/errors.ts`

- **IMPLEMENT**: `RateLimitError` sınıfını ekle (yukarıdaki "Hata yönetimi" deseni).
- **PATTERN**: `src/core/errors.ts:12` — `NotFoundError`/`ValidationError` yapısı birebir.
- **VALIDATE**: `npm run typecheck`

---

### 5. CREATE — `src/core/rate-limit.ts`

- **IMPLEMENT**: Bellek içi, kova tabanlı hız sınırı. **Saati enjekte edilebilir yap** (`now` parametresi) — testlerde pencereden çıkış bu sayede doğrulanır.
  ```ts
  import { RateLimitError } from "@/core/errors";

  interface Bucket {
    count: number;
    windowStart: number;
  }

  const buckets = new Map<string, Bucket>();
  const MAX_BUCKETS = 10_000;

  export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
    now: () => number = Date.now,
  ): void {
    const current = now();
    const bucket = buckets.get(key);
    if (!bucket || current - bucket.windowStart >= windowMs) {
      buckets.set(key, { count: 1, windowStart: current });
      return;
    }
    if (bucket.count >= limit) {
      throw new RateLimitError(
        "Çok sık bildirim gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin.",
      );
    }
    bucket.count += 1;
  }

  export function _resetRateLimits(): void { buckets.clear(); } // testler için
  ```
- **GOTCHA**: `Map` tekil modüldür — `next dev` HMR'da modül yeniden yüklenince sayaçlar sıfırlanır; demo için kabul edilebilir, README'ye not düş.
- **GOTCHA**: Sınırsız büyümeyi önle: `buckets.size > MAX_BUCKETS` olduğunda süresi geçmiş kovaları süpür (veya `clear()`). Testlerde `_resetRateLimits` çağrısı zorunlu — aksi halde testler arası sayaç kalır.
- **VALIDATE**: Görev 6'nın testleriyle birlikte `npx vitest run src/core/rate-limit.test.ts`

---

### 6. CREATE — `src/core/rate-limit.test.ts`

- **IMPLEMENT**: Sahte saatle üç senaryo: (1) limit aşılınca `RateLimitError`, (2) pencere dolunca sıfırlanır, (3) farklı anahtarlar bağımsızdır. Her testte `_resetRateLimits()` çağır.
  ```ts
  let nowValue = 1_000_000;
  const now = () => nowValue;

  it("limit aşılınca RateLimitError fırlatır", () => {
    checkRateLimit("k", 1, 300_000, now);
    expect(() => checkRateLimit("k", 1, 300_000, now)).toThrow(RateLimitError);
  });

  it("pencere dolunca sayaç sıfırlanır", () => {
    checkRateLimit("k", 1, 300_000, now);
    nowValue += 300_001;
    expect(() => checkRateLimit("k", 1, 300_000, now)).not.toThrow();
  });
  ```
- **GOTCHA**: `beforeEach(() => _resetRateLimits())` koy — testler arası ortak Map durumu sızmasın.
- **VALIDATE**: `npx vitest run src/core/rate-limit.test.ts`

---

### 7. CREATE — `src/features/reports/constants.ts`

- **IMPLEMENT**: Sorun türleri ve etiketleri; durum etiketleri (Aşama 3 paneli için şimdiden).
  ```ts
  import type { IssueType, ReportStatus } from "@/generated/prisma/enums";

  export const ISSUE_TYPES = [
    "KIRIK_HASARLI", "KIRLI", "BOYA_DOKUNTU", "TEHLIKELI", "EKSIK_CALINMIS", "DIGER",
  ] as const satisfies readonly IssueType[];

  export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
    KIRIK_HASARLI: "Kırık / Hasarlı",
    KIRLI: "Kirli",
    BOYA_DOKUNTU: "Boya Döküntüsü",
    TEHLIKELI: "Tehlikeli",
    EKSIK_CALINMIS: "Eksik / Çalınmış",
    DIGER: "Diğer",
  };

  export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
    YENI: "Yeni", ATANDI: "Atandı", ONARILDI: "Onarıldı", REDDEDILDI: "Reddedildi",
  };
  ```
- **PATTERN**: `src/features/assets/constants.ts:3` — `as const satisfies readonly EnumType[]` ve `Record<EnumType, string>` (yeni enum değeri eklenince TypeScript eksik çeviriyi yakalar).
- **VALIDATE**: `npm run typecheck`

---

### 8. CREATE — `src/features/reports/schemas.ts`

- **IMPLEMENT**: Form doğrulama şeması + servis girdi tipi. Kod normalize etme işi **sınırda** yapılır (transform).
  ```ts
  import { z } from "zod";
  import { normalizeAssetCode } from "@/features/assets/codes";
  import { ISSUE_TYPES } from "@/features/reports/constants";

  export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
  export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

  function emptyToUndefined<T extends z.ZodType>(schema: T) {
    return z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
  }

  export const createReportSchema = z.object({
    assetCode: z
      .string({ error: "Kod gerekli." })
      .min(1, { error: "Kod gerekli." })
      .max(20, { error: "Kod çok uzun." })
      .transform((v) => normalizeAssetCode(v)),
    issueType: z.enum(ISSUE_TYPES, { error: "Geçerli bir sorun türü seçin." }),
    description: emptyToUndefined(
      z.string().max(500, { error: "Açıklama en fazla 500 karakter olabilir." }),
    ),
    reporterPhone: emptyToUndefined(
      z
        .string()
        .regex(/^(\+90|0)?[5-9]\d{9}$/, { error: "Geçerli bir telefon numarası girin." }),
    ),
    photo: z
      .instanceof(File, { error: "Fotoğraf zorunludur." })
      .refine((f) => ALLOWED_PHOTO_TYPES.includes(f.type), {
        error: "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz.",
      })
      .refine((f) => f.size <= MAX_PHOTO_BYTES, { error: "Fotoğraf en fazla 10 MB olabilir." }),
  });

  export type CreateReportForm = z.infer<typeof createReportSchema>;

  export interface CreateReportInput {
    assetCode: string;        // normalize edilmiş
    issueType: CreateReportForm["issueType"];
    description?: string;
    reporterPhone?: string;
    photo: Buffer;            // route File.arrayBuffer()'dan çevrilir; servis şemayı görmez
    clientIp: string;
  }
  ```
- **PATTERN**: `emptyToUndefined` — `src/features/assets/schemas.ts:4` kopyası (üç-özellik kuralı: 3. dilim gerekene kadar `shared/`'a taşınmaz).
- **GOTCHA (zod 4)**: Hata parametresi `{ error: "..." }`, `flatten` ise `z.flattenError(...)` (bkz. `actions.ts:16`).
- **GOTCHA**: `normalizeAssetCode` transform'u, servise **normalize edilmiş** kod gider — serviste tekrar normalize etme.
- **GOTCHA**: `photo` alanı `File` — form verisi `FormData`'dan `formData.get("photo")` ile gelir (Aşağıda Görev 12). `Object.fromEntries` **kullanma**.
- **VALIDATE**: `npm run typecheck`

---

### 9. CREATE — `src/features/reports/repository.ts`

- **IMPLEMENT**: Yalnızca Prisma sorguları; hepsi `tx` alır (transaction sınırını servis yönetir).
  ```ts
  import { Prisma, type Report } from "@/generated/prisma/client";

  export async function findOpenReport(
    tx: Prisma.TransactionClient,
    assetId: string,
  ): Promise<Report | null> {
    return tx.report.findFirst({
      where: { assetId, status: { in: ["YENI", "ATANDI"] } },
      orderBy: { createdAt: "desc" },
    });
  }

  export async function createReport(
    tx: Prisma.TransactionClient,
    data: Prisma.ReportCreateInput,
  ): Promise<Report> {
    return tx.report.create({ data });
  }

  export async function registerDuplicate(
    tx: Prisma.TransactionClient,
    reportId: string,
    photoUrl: string,
  ): Promise<Report> {
    return tx.report.update({
      where: { id: reportId },
      data: { duplicateCount: { increment: 1 }, photoUrl },
    });
  }
  ```
- **PATTERN**: `src/features/assets/repository.ts:53` — `tx` parametresi; iş kuralı yok.
- **GOTCHA**: `ticketNo` autoincrement'tir; SQLite + Prisma `create` dönen kaydı içinde `ticketNo` ile getirir (returning desteği) — ayrı sorgu gerekmez.
- **GOTCHA**: Tekilleştirme sorgusunda `status: { in: ["YENI", "ATANDI"] }` — kapalı kayıtlar (ONARILDI/REDDEDILDI) yeni kayıt açılmasını engellemez.
- **VALIDATE**: `npm run typecheck`

---

### 10. CREATE — `src/features/reports/photos.ts`

- **IMPLEMENT**: Sharp boru hattı: magic-byte doğrulama → EXIF yönünü uygula → maks. 1600px küçült → WebP çevir (metadata düşer) → diske yaz.
  ```ts
  import { randomUUID } from "node:crypto";
  import { mkdir, writeFile } from "node:fs/promises";
  import path from "node:path";
  import sharp from "sharp";
  import { config } from "@/core/config";
  import { ValidationError } from "@/core/errors";

  const MAX_DIMENSION = 1600;
  const WEBP_QUALITY = 80;

  export async function processPhoto(buffer: Buffer): Promise<Buffer> {
    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      throw new ValidationError("Yüklenen dosya geçerli bir görsel değil.");
    }
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new ValidationError("Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.");
    }
    // .rotate() EXIF yönünü piksele uygular; .withMetadata() çağrılmadığı için
    // EXIF/GPS dahil tüm metadata çıktıda yok olur (KVKK gereksinimi).
    return sharp(buffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  }

  export async function savePhoto(buffer: Buffer): Promise<string> {
    const filename = `${randomUUID()}.webp`;
    const filePath = path.join(config.UPLOAD_DIR, filename);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  }
  ```
- **GOTCHA (kritik)**: `.withMetadata()` **çağırma** — çağrılırsa EXIF/GPS kalır ve KVKK gereksinimi ihlal edilir. Varsayılan davranış metadata'yı atar.
- **GOTCHA**: `.rotate()` şart — WebP'de EXIF orientation desteği yok; rotate edilmezse telefon fotoğrafları döndürülmüş görünür (sharp issue #3867).
- **GOTCHA**: `withoutEnlargement: true` — küçük fotoğraflar büyütülmez.
- **GOTCHA**: `randomUUID()` dosya adı — kullanıcı dosya adını **asla** kullanma (path traversal + çakışma).
- **GOTCHA**: Dönüş değeri `/uploads/<ad>` — `UPLOAD_DIR` `./public/uploads` olduğu için bu URL doğrudan statik olarak servis edilir.
- **VALIDATE**: `npm run typecheck` (testleri Görev 15'te)

---

### 11. CREATE — `src/features/reports/service.ts`

- **IMPLEMENT**: İş kuralları. **Sıra önemli:** (1) demirbaş bul, (2) açık kayıt var mı — **varsa rate limit uygulanmaz**, sadece sayaç artar (PRD UH-2: aynı IP'den 6 kişi bildirirse hepsi "zaten bildirilmiş" görür), (3) yoksa rate limit kontrol et, (4) fotoğrafı işle + kaydet, (5) transaction.
  ```ts
  import { prisma } from "@/core/db";
  import { logger } from "@/core/logger";
  import { NotFoundError } from "@/core/errors";
  import * as assetService from "@/features/assets/service";
  import { checkRateLimit } from "@/core/rate-limit";
  import * as repository from "@/features/reports/repository";
  import { processPhoto, savePhoto } from "@/features/reports/photos";
  import type { CreateReportInput } from "@/features/reports/schemas";
  import type { Report } from "@/generated/prisma/client";

  const PER_ASSET_WINDOW_MS = 5 * 60 * 1000;  // 5 dakika
  const PER_IP_WINDOW_MS = 60 * 60 * 1000;    // 1 saat
  const PER_IP_LIMIT = 20;

  export interface CreateReportResult {
    report: Report;
    duplicate: boolean;
  }

  export async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
    logger.info("report.create.started", { code: input.assetCode, issueType: input.issueType });

    const asset = await assetService.getAssetByCode(input.assetCode); // NotFoundError("Demirbaş bulunamadı.")

    const openReport = await repository.findOpenReport(prisma, asset.id);
    const photoUrl = await savePhoto(await processPhoto(input.photo));

    if (openReport) {
      const updated = await repository.registerDuplicate(prisma, openReport.id, photoUrl);
      logger.info("report.create.duplicate", { ticketNo: updated.ticketNo, count: updated.duplicateCount });
      return { report: updated, duplicate: true };
    }

    checkRateLimit(`report:${input.clientIp}:${asset.id}`, 1, PER_ASSET_WINDOW_MS);
    checkRateLimit(`report:${input.clientIp}`, PER_IP_LIMIT, PER_IP_WINDOW_MS);

    const report = await prisma.$transaction(async (tx) => {
      const stillOpen = await repository.findOpenReport(tx, asset.id);
      if (stillOpen) return repository.registerDuplicate(tx, stillOpen.id, photoUrl);
      return repository.createReport(tx, {
        assetId: asset.id,
        issueType: input.issueType,
        description: input.description,
        reporterPhone: input.reporterPhone,
        reporterType: "VATANDAS",
        photoUrl,
      });
    });

    const duplicate = report.duplicateCount > 1;
    logger.info(duplicate ? "report.create.duplicate" : "report.create.success", {
      ticketNo: report.ticketNo,
    });
    return { report, duplicate };
  }

  export async function getOpenReport(assetId: string): Promise<Report | null> {
    return repository.findOpenReport(prisma, assetId);
  }
  ```
- **PATTERN**: `assetService.getAssetByCode` — `src/features/assets/service.ts:47`; çapraz dilim çağrısı **servis → servis** (repository'e atlamadan).
- **GOTCHA**: `repository.findOpenReport(prisma, ...)` — `prisma` bir `Prisma.TransactionClient` değildir ama aynı metot imzasına uyar; tip uyumu için `PrismaClient`'in tx client'a uyumluluğu TypeScript'te sorunsuzdur (Aşama 1'de `allocateSequence(tx, ...)` aynı şekilde çağrılıyor — kontrol et, gerekirse parametre tipini `Prisma.TransactionClient | PrismaClient` genişlet).
- **GOTCHA (tasarım kararı)**: Açık kayıt varken rate limit **uygulanmaz** — tekilleştirme hız sınırından önce gelir. Aksi halde aynı IP'den ikinci vatandaş 429 görürdü ve PRD UH-2 ("kaydınız eklendi") gerçekleşmezdi. Yeni kayıtlar için iki kısıt da işler.
- **GOTCHA**: Race window (open check → create arası) SQLite tek-yazıcı + transaction ile pratikte kapanır; iki eşzamanlı yeni kayıt nadir durumda iki kayıt açabilir — demo için kabul edilir, README'ye not.
- **GOTCHA**: `duplicate` bayrağını transaction içindeki yanıttan belirleme (üstteki kod transaction dışında `duplicateCount > 1` ile anlar; tekilleştirilen kayıtta da `duplicateCount > 1` doğrudur çünkü increment edildi). Alternatif: transaction dönüş değerini `{ report, isDuplicate }` nesnesi yap — okunabilirlik için bunu tercih et.
- **VALIDATE**: `npm run typecheck`

---

### 12. CREATE — `src/app/api/public/reports/route.ts`

- **IMPLEMENT**: Public POST ucu. `request.formData()` ile multipart oku; zod ile sınırda doğrula; `AppError` → JSON; başarı → 201 (yeni) / 200 (tekrar).
  ```ts
  import { NextResponse } from "next/server";
  import { z } from "zod";
  import { AppError } from "@/core/errors";
  import { createReportSchema } from "@/features/reports/schemas";
  import * as reportService from "@/features/reports/service";

  export async function POST(request: Request) {
    const formData = await request.formData();

    const parsed = createReportSchema.safeParse({
      assetCode: formData.get("assetCode"),
      issueType: formData.get("issueType"),
      description: formData.get("description") ?? undefined,
      reporterPhone: formData.get("reporterPhone") ?? undefined,
      photo: formData.get("photo"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          detail: "Form bilgileri hatalı.",
          fields: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }

    const { photo, ...fields } = parsed.data;
    const photoBuffer = Buffer.from(await photo.arrayBuffer());
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "bilinmeyen";

    try {
      const result = await reportService.createReport({ ...fields, photo: photoBuffer, clientIp });
      return NextResponse.json(
        {
          ticketNo: result.report.ticketNo,
          status: result.report.status,
          duplicate: result.duplicate,
          message: result.duplicate
            ? "Bu sorun zaten bildirilmiş. Kaydınız eklendi."
            : "Bildiriminiz Park ve Bahçeler Müdürlüğü'ne iletildi.",
        },
        { status: result.duplicate ? 200 : 201 },
      );
    } catch (e) {
      if (e instanceof AppError) {
        return NextResponse.json({ error: e.code, detail: e.message }, { status: e.status });
      }
      throw e;
    }
  }
  ```
- **PATTERN**: Hata biçimi `{ error, detail }` — `src/app/api/assets/[id]/qr/route.ts:50`; doğrulama hatası `fields` ile PRD 10.1'deki `VALIDATION_ERROR` biçimine uyar (PRD: 422).
- **GOTCHA (kritik)**: `Object.fromEntries(formData)` **kullanma** — `File` nesneleri bozulur (`[object Object]`). Alanları tek tek oku.
- **GOTCHA**: `formData.get("photo")` `null` dönebilir — `z.instanceof(File)` bunu "Fotoğraf zorunludur." ile yakalar.
- **GOTCHA**: `clientIp` — yerel geliştirmede `x-forwarded-for` yoksa tüm istekler "bilinmeyen" olur (tek IP). Demo için kabul edilir; farklı demirbaşlar farklı anahtar ürettiği için bildirim akışı etkilenmez.
- **GOTCHA**: App Router'da body limit config'i yoktur (`bodyParser` Pages Router'a aittir); 10MB `File` sınırı zod `refine` ile zaten uygulanıyor.
- **VALIDATE**: `npm run typegen && npm run typecheck`, sonra dev sunucuda curl (Level 4)

---

### 13. CREATE — `src/app/q/[code]/page.tsx`

- **IMPLEMENT**: QR açılış sayfası. Kod normalize et; normalize edilmiş farklıysa `redirect`. Demirbaş bulunamazsa **404 yerine** dostça "Bu kod bulunamadı" + arama kutusu (PRD 10.1). Açık kayıt varsa uyarı bandı.
  ```tsx
  import { redirect } from "next/navigation";
  import * as assetService from "@/features/assets/service";
  import { normalizeAssetCode } from "@/features/assets/codes";
  import { ASSET_TYPE_LABELS } from "@/features/assets/constants";
  import { getOpenReport } from "@/features/reports/service";
  import { ReportForm } from "@/features/reports/components/ReportForm";
  import { CodeLookupForm } from "@/features/reports/components/CodeLookupForm";

  export default async function QPage(props: PageProps<"/q/[code]">) {
    const { code } = await props.params;
    const normalized = normalizeAssetCode(code);
    if (normalized !== code) redirect(`/q/${normalized}`);

    let asset;
    try {
      asset = await assetService.getAssetByCode(normalized);
    } catch {
      return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Kod bulunamadı</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            "{normalized}" kodlu bir demirbaş bulunamadı. Etiketin üzerindeki kodu kontrol edip tekrar deneyin.
          </p>
          <CodeLookupForm />
        </main>
      );
    }

    const openReport = await getOpenReport(asset.id);

    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-8">
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset.park.name}</p>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {ASSET_TYPE_LABELS[asset.type]}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Kod: <span className="font-mono font-semibold">{asset.code}</span>
          </p>
        </section>

        <ReportForm
          assetCode={asset.code}
          parkName={asset.park.name}
          openReport={
            openReport
              ? { ticketNo: openReport.ticketNo, duplicateCount: openReport.duplicateCount }
              : null
          }
        />
      </main>
    );
  }
  ```
- **PATTERN**: `PageProps<"/q/[code]">` + `await props.params` — `src/app/panel/etiketler/page.tsx:6` deseni. `redirect` ile kanonik URL'e taşıma: `bank-147` → `/q/BANK-0147` (URL çubuğu kanonik olur, QR ile okunanla eşleşir).
- **GOTCHA**: `normalizeAssetCode` zaten `BANK-0147` döndürürse `redirect` tetiklenmez — sonsuz döngü riski yok.
- **GOTCHA**: `PageProps` tipi için önce `npm run typegen` gerekir (yeni rota).
- **GOTCHA**: HURDA durumundaki demirbaş da sayfayı gösterir — demirbaş fiziksel olarak hâlâ parktadır, bildirim anlamlıdır.
- **VALIDATE**: `npm run typegen && npm run typecheck`, sonra `/q/BANK-0001` ve `/q/olmayan-kod` manuel kontrol

---

### 14. CREATE — `src/features/reports/components/ReportForm.tsx`

- **IMPLEMENT**: Client Component. `fetch` ile `POST /api/public/reports` (multipart). Alan hataları 422 `fields`'tan, genel hata 429/404 `detail`'ten gelir. Başarıda form yerine teşekkür ekranı (takip numarası + mesaj). Sorun tipi seçimi ikonlu değil ama **en az 44px dokunma hedefi** olan radio kartlar. Fotoğraf `required`, önizleme göster, gönderimde "Gönderiliyor…" durumu.
- **PATTERN**: `useActionState` yerine burada `useState` + `fetch` — çünkü uç public API ve dosya yüklemeli; `src/features/assets/components/AssetForm.tsx`'in aksine Server Action kullanılmaz (Aşama 1 planı NOT: "Vatandaş bildirimi gerçek bir API ucu olacak").
- **Yapı** (Props):
  ```ts
  export interface ReportFormProps {
    assetCode: string;
    parkName: string;
    openReport: { ticketNo: number; duplicateCount: number } | null;
  }
  ```
  - `openReport` doluysa üstte sarı uyarı bandı: "Bu demirbaşta açık bildirim var (#2451 · 7 kişi bildirdi)". Yine de form gösterilir (kullanıcı tekrar bildirirse sayaç artar).
  - Alanlar: `issueType` (radio kartlar, `ISSUE_TYPE_LABELS`), `description` (textarea, max 500), `reporterPhone` (inputMode="tel", isteğe bağlı, yanında "ne için kullanılır" açıklaması), `photo` (file input, `accept="image/jpeg,image/png,image/webp"`, önizleme).
  - KVKK: form altında `/kvkk` bağlantısı: "Fotoğraf ve isteğe bağlı telefon bilginiz yalnızca bu bildirim için kullanılır. Aydınlatma metni için tıklayın."
  - Gönderim: `FormData` kur → `fetch("/api/public/reports", { method: "POST", body: formData })` → `res.status`'a göre 422 (fieldErrors state'e), 429/404 (genel mesaj), 200/201 (teşekkür görünümü: `#ticketNo` + `message` + "Başka bir sorun bildir" butonu sayfayı yeniler).
  - Erişilebilirlik: `role="status" aria-live="polite"` hata/başarı mesajları, `min-h-11` inputlar, dosya alanı zorunluluk mesajı Türkçe.
- **GOTCHA**: Fotoğraf önizlemesi `URL.createObjectURL(file)` — görüntüleme sonrası `revokeObjectURL` çağır (memory leak).
- **GOTCHA**: `required` attribute yalnızca tarayıcı tarafıdır; sunucu doğrulaması asıldır (zod) — gönderimde her zaman sunucu yanıtını işle.
- **VALIDATE**: `npm run typecheck`

---

### 15. CREATE — `src/features/reports/components/CodeLookupForm.tsx`

- **IMPLEMENT**: Küçük client bileşen — kod girişi + gönder → `router.push("/q/" + encodeURIComponent(kod))`. Ana sayfada ve "kod bulunamadı" ekranında kullanılır.
  ```tsx
  "use client";

  import { useState } from "react";
  import { useRouter } from "next/navigation";

  export function CodeLookupForm() {
    const router = useRouter();
    const [code, setCode] = useState("");

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = code.trim();
          if (trimmed) router.push(`/q/${encodeURIComponent(trimmed)}`);
        }}
        className="flex w-full max-w-sm gap-2"
      >
        <label htmlFor="code-lookup" className="sr-only">Demirbaş kodu</label>
        <input
          id="code-lookup"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Örn. BANK-0147"
          autoCapitalize="characters"
          className="min-h-11 flex-1 rounded-full border border-zinc-300 px-4 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button type="submit" className="min-h-11 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
          Bildir
        </button>
      </form>
    );
  }
  ```
- **PATTERN**: Client Component `"use client"` + `useRouter` — projedeki tek client örneği olan `AssetForm` stilinde.
- **GOTCHA**: Normalize etme **sunucuda** yapılır (`/q/[code]` → `redirect`) — client tarafında `normalizeAssetCode` import etme (kod istemciye taşınır; iş kuralı sunucuda kalsın).
- **VALIDATE**: `npm run typecheck`

---

### 16. UPDATE — `src/app/page.tsx` + CREATE — `src/app/kvkk/page.tsx`

- **IMPLEMENT (page.tsx)**: Ana sayfaya "Kod ile bildir" bölümü ekle — başlık + `CodeLookupForm` + açıklama ("Etiketinizdeki kodu yazın — örn. BANK-0147"). Mevcut "Yönetim Paneline Git" bağlantısı kalsın (demo için panel herkese açık — Aşama 3'te korunacak).
- **IMPLEMENT (kvkk/page.tsx)**: Statik aydınlatma metni. İçerik: hangi veriler toplanır (zorunlu fotoğraf, isteğe bağlı telefon), neden (arıza tespiti ve teyidi), kimin gördüğü (Park ve Bahçeler Müdürlüğü personeli), saklama süresi (bildirim kapanana kadar), **fotoğraflardan EXIF/GPS konum verisinin sunucuda silindiği** garantisi, ad-soyad/TC/adres istenmediği vurgusu, `MUNICIPALITY_NAME`'i kullan.
- **PATTERN**: `src/app/panel/page.tsx` tarzı basit server component; kök `layout.tsx` zaten `lang="tr"`.
- **VALIDATE**: `npm run dev` → `/` üzerinden "bank-1" yaz → `/q/BANK-0001`'e yönleniyor; `/kvkk` render ediyor

---

### 17. UPDATE — `tests/setup.ts`

- **IMPLEMENT**: Test ortamına `UPLOAD_DIR` ata ve `beforeEach` temizliğine `report` ekle (foreign key sırası önemli — önce report, sonra asset).
  ```ts
  process.env.DATABASE_URL = "file:./prisma/test.db";
  process.env.APP_URL = "http://localhost:3000";
  process.env.MUNICIPALITY_NAME = "Test Belediyesi";
  process.env.UPLOAD_DIR = "./tests/.uploads";

  // ... mevcut migrate deploy

  beforeEach(async () => {
    const { prisma } = await import("@/core/db");
    await prisma.report.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.park.deleteMany();
    await prisma.assetCodeCounter.deleteMany();
  });
  ```
- **GOTCHA (kritik)**: `report.deleteMany()` **önce** gelmeli — `Asset` üzerindeki FK kısıtı, önce asset silinirse hata verir.
- **GOTCHA**: `UPLOAD_DIR`'i modül üstünde, `core/config` import'undan önce ata (Aşama 1'deki `DATABASE_URL` notu birebir). `tests/.uploads` `.gitignore`'da (Görev 3).
- **VALIDATE**: `npm test` (mevcut testler hâlâ yeşil)

---

### 18. CREATE — `src/features/reports/photos.test.ts` ve `service.test.ts`

- **IMPLEMENT — photos.test.ts**: Görsel testleri için sharp ile gerçek görsel üret (`sharp({ create: ... })`):
  1. 2400×1800 JPEG üret → `processPhoto` → çıktı `webp`, `width ≤ 1600`, `height ≤ 1600` (orantı korunur), `metadata().exif === undefined` (EXIF temizlendi)
  2. EXIF orientation 6 içeren görsel üret (`.withMetadata({ orientation: 6 })`) → çıktıdaki `exif` yok, piksel yönü doğru (`rotate` uygulandı)
  3. Küçük görsel (300px) → büyütülmez (`width === 300`)
  4. Düz metin buffer → `ValidationError` ("geçerli bir görsel değil")
  5. `savePhoto` → dönen URL `/uploads/` ile başlıyor ve dosya diske yazıldı (fs.existsSync ile kontrol)
- **IMPLEMENT — service.test.ts**: Yardımcılar: `createTestPark()`, `createTestAsset()` (assetService.createAssets ile), `testPhoto()` (sharp ile 800×600 PNG buffer üret). Senaryolar:
  1. İlk bildirim → `ticketNo` 1, `status "YENI"`, `duplicate: false`, `photoUrl` `/uploads/` ile başlıyor
  2. Aynı demirbaşa ikinci bildirim → **aynı** `ticketNo`, `duplicateCount: 2`, `duplicate: true`
  3. Kapalı kayıt (testte `prisma.report.update({ status: "ONARILDI" })`) sonrası yeni bildirim → **yeni** ticketNo açılır
  4. Olmayan kod → `NotFoundError`
  5. Rate limit: kapalı kayıttan sonra 5 dk içinde aynı IP + aynı demirbaştan yeni bildirim → `RateLimitError`
  6. IP genel limit: 20 farklı demirbaşa bildirim → 21.'sinde `RateLimitError` (20 demirbaş `createAssets({ count: 20 })` ile)
  7. Geçersiz görsel buffer (düz metin) → `ValidationError`
- **PATTERN**: `src/features/assets/service.test.ts:1` — gerçek SQLite test veritabanı, Prisma mock yok.
- **GOTCHA**: Testler arası rate limit durumu — `beforeEach` içinde `_resetRateLimits()` çağır (Görev 5–6).
- **GOTCHA**: sharp Node ortamında vitest ile sorunsuz çalışır (native prebuild) — `server-only` stub'ından etkilenmez çünkü `photos.ts` `server-only` import etmez.
- **VALIDATE**: `npx vitest run src/features/reports/photos.test.ts` ve `npx vitest run src/features/reports/service.test.ts`

---

### 19. CREATE — `src/features/reports/README.md` + UPDATE — kök `README.md`

- **IMPLEMENT — reports/README.md**: Amaç, ana akışlar (bildirim gönderme, tekilleştirme, hız sınırı, fotoğraf boru hattı), iş kuralları (kod sınırda normalize edilir, tekilleştirme rate limit'ten önce gelir, fotoğraftan EXIF silinir), entegrasyon noktaları (Aşama 3: durum makinesi `Report.status` üzerinde; Aşama 4: analytics `Report` sayımlarını kullanır), test notu.
- **IMPLEMENT — kök README.md**: Aşama açıklamasını "Aşama 1 + 2" olarak güncelle; `/q/[code]` artık 404 değil; yeni tuzaklar: `sharp` `serverExternalPackages`'ta, `UPLOAD_DIR` göreli yol proje köküne, rate limit bellekte (sunucu yeniden başlayınca sıfırlanır), `Object.fromEntries(formData)` File'ı bozar.
- **PATTERN**: `src/features/assets/README.md` yapısı (akışlar, kurallar, entegrasyonlar, kararlar).
- **VALIDATE**: `Test-Path src/features/reports/README.md`

---

## TESTING STRATEGY

### Unit Tests

**Çerçeve:** Vitest 4.1 (node ortamı, tek iş parçacığı — `vitest.config.ts` zaten `fileParallelism: false`).
**Konum:** Kodun yanında — `src/core/rate-limit.test.ts`, `src/features/reports/photos.test.ts`, `src/features/reports/service.test.ts`.

- `rate-limit.test.ts` — sahte saat; kova mantığı arayüzden bağımsız test edilir
- `photos.test.ts` — sharp boru hattı; **gerçek** görsel buffer'ları (sharp ile üretilir)
- `service.test.ts` — gerçek SQLite test veritabanı; tekilleştirme + hız sınırı + hata yolları

Prisma mock'lanmaz (Aşama 1 kararı: gerçek kısıtlar test edilir).

### Integration Tests

`service.test.ts` zaten service → repository → Prisma zincirini kapsar. Route handler (multipart ayrıştırma, hata JSON'ları) E2E'de gerçek dev sunucusu üzerinden curl ile doğrulanır.

### Edge Cases

- Açık kayıt varken ikinci bildirim → yeni ticketNo **açılmaz**, sayaç artar
- Kapalı kayıt sonrası bildirim → yeni kayıt açılır (aynı 5 dk içinde olursa rate limit 429)
- Aynı IP + farklı demirbaş → rate limit etkilemez
- 21. bildirim (aynı IP, 1 saat içinde) → 429
- 10 MB üzeri fotoğraf → 422 "Fotoğraf en fazla 10 MB olabilir"
- Düz metin dosyası (`.txt` uzantılı, JPEG MIME) → `ValidationError` (magic-byte)
- EXIF orientation'lu telefon fotoğrafı → WebP çıktı doğru yönlü, metadata'sız
- `bank-147` / `BANK147` / ` bank 147 ` → hepsi `/q/BANK-0147`'ye yönlenir
- Olmayan kod → dostça "Kod bulunamadı" sayfası (çökme yok)

### E2E / Tarayıcı Doğrulaması

> **⚠️ Windows uyarısı:** `agent-browser`'ın Windows'ta bilinen Unix domain socket sorunu var (`.claude/skills/agent-browser/SKILL.md` satır 21–22). Önce `agent-browser open` dene; **çalışmazsa** aynı akışları manuel tarayıcıda yürüt ve API akışlarını `curl.exe` ile doğrula (Level 4). Ekran görüntülerini yine de `screenshots/` altına kaydet.

- **Mutlu yol:** `/q/BANK-0001` → park adı + tür görünüyor → sorun tipi seç → fotoğraf yükle → gönder → teşekkür ekranı `#` takip numarası + "Bildiriminiz Park ve Bahçeler Müdürlüğü'ne iletildi."
- **Tekilleştirme:** aynı demirbaşta ikinci gönderim → "Bu sorun zaten bildirilmiş. Kaydınız eklendi." (200)
- **Hata yolları:** fotoğrafsız gönderim → "Fotoğraf zorunludur."; `/q/olmayan-kod` → "Kod bulunamadı" + arama kutusu; ana sayfadan `bank-1` → `/q/BANK-0001` yönlenmesi; `/kvkk` sayfası açılıyor.
- **Zorunlu ekran görüntüleri** (`screenshots/`): `asama2-q-sayfasi.png`, `asama2-bildirim-basarili.png`, `asama2-tekrar-bildirildi.png`, `asama2-form-dogrulama-hatasi.png`, `asama2-kod-bulunamadi.png`
- Test sonunda `agent-browser errors` (konsol hatası yok) ve `agent-browser close`.

---

## VALIDATION COMMANDS

Her komutu çalıştır; sıfır hata ve tam işlevsellik hedefleniyor.

### Level 1: Sözdizimi ve Stil

```bash
npm run lint
npm run typegen
npm run typecheck
```

> `typegen` yeni rotalardan (`/q/[code]`, `/api/public/reports`) sonra zorunlu — `PageProps<>`/`RouteContext` tipleri yeniden üretilir.

### Level 2: Birim Testleri

```bash
npm test
```

### Level 3: Veritabanı Bütünlüğü

```bash
npx prisma validate
npm run db:migrate -- --name add_reports   # ilk çalıştırmada
npm run db:reset && npm run db:seed
```

### Level 4: Manuel Doğrulama (API)

Dev sunucusu çalışırken (`npm run dev`):

```bash
# Test görseli üret (PowerShell + Node)
node -e "require('sharp')({create:{width:800,height:600,channels:3,background:'#ccc'}}).jpeg().toFile('C:/Users/mypc/AppData/Local/Temp/opencode/test-foto.jpg')"

# 1) Yeni bildirim → 201 + ticketNo
curl.exe -s -X POST http://localhost:3000/api/public/reports -F "assetCode=BANK-0001" -F "issueType=KIRIK_HASARLI" -F "photo=@C:/Users/mypc/AppData/Local/Temp/opencode/test-foto.jpg;type=image/jpeg"

# 2) Aynı demirbaşta tekrar → 200 + duplicate:true + aynı ticketNo
curl.exe -s -X POST http://localhost:3000/api/public/reports -F "assetCode=BANK-0001" -F "issueType=KIRLI" -F "photo=@C:/Users/mypc/AppData/Local/Temp/opencode/test-foto.jpg;type=image/jpeg"

# 3) Fotoğrafsız → 422 + fields.photo
curl.exe -s -X POST http://localhost:3000/api/public/reports -F "assetCode=BANK-0001" -F "issueType=KIRLI"

# 4) Olmayan kod → 404 ASSET_NOT_FOUND
curl.exe -s -X POST http://localhost:3000/api/public/reports -F "assetCode=DGER-9999" -F "issueType=DIGER" -F "photo=@C:/Users/mypc/AppData/Local/Temp/opencode/test-foto.jpg;type=image/jpeg"
```

Ayrıca `/q/BANK-0001`, `/q/bank-1` (yönlenme), `/q/olmayan`, `/kvkk` sayfalarını tarayıcıda aç.

### Level 5: Tarayıcı Otomasyonu

```bash
npm run dev
agent-browser open http://localhost:3000/q/BANK-0001
agent-browser snapshot -i
# mutlu yol: tip seç → upload → submit → "iletil" metni ve #ticketNo doğrula
agent-browser screenshot screenshots/asama2-bildirim-basarili.png
# hata yolları + konsol kontrolü + close (yukarıdaki E2E bölümü)
```

Çalışmazsa (Windows bilinen sorunu): yukarıdaki akışları manuel tarayıcıda + `curl.exe` ile gerçekleştir, sonuçları tamamlanma listesine not et.

### Level 6: Üretim Derlemesi

```bash
npm run build
```

> Derleme `server-only` ihlallerini, Client/Server Component sınır hatalarını ve `sharp` paketleme sorunlarını yakalar.

---

## ACCEPTANCE CRITERIA

- [ ] `/q/[code]` demirbaş bilgisini (park, tür, kod) ve bildirim formunu gösteriyor; geçersiz kodda dostça hata sayfası
- [ ] `POST /api/public/reports` çalışıyor: 201 (yeni) / 200 (tekrar) / 404 / 422 / 429 — PRD 10.1 biçiminde
- [ ] Tekilleştirme: açık kayıt varken ikinci bildirim yeni kayıt açmıyor, `duplicateCount` artıyor (testle kanıtlı)
- [ ] Fotoğraf: maks. 1600px, WebP, EXIF/GPS silinmiş (testle kanıtlı), 10MB sınırı
- [ ] Rate limit: aynı IP + demirbaş 5 dk / aynı IP saatte 20 (testle kanıtlı)
- [ ] Teşekkür ekranı takip numarasını ve "Park ve Bahçeler Müdürlüğü'ne iletildi" mesajını gösteriyor
- [ ] Ana sayfada "Kod ile bildir" kutusu var; `bank-147` → `/q/BANK-0147` yönleniyor
- [ ] KVKK aydınlatma metni `/kvkk` üzerinden erişilebilir, form altında bağlantı var
- [ ] Tüm kullanıcıya görünen metinler Türkçe
- [ ] `npm run lint`, `npm run typegen`, `npm run typecheck`, `npm test`, `npm run build` — hepsi sıfır hatayla
- [ ] E2E ekran görüntüleri `screenshots/` altında; konsolda hata yok
- [ ] `src/features/reports/README.md` ve kök `README.md` güncellendi

---

## COMPLETION CHECKLIST

- [ ] Tüm görevler sırayla tamamlandı (1 → 19)
- [ ] Her görevin doğrulaması anında geçti
- [ ] Level 1–4 ve Level 6 komutları başarıyla çalıştırıldı
- [ ] Level 5 tarayıcı doğrulaması geçti (agent-browser veya manuel; ekran görüntüleri `screenshots/`)
- [ ] Rate limit ve tekilleştirme davranışı iki ayrı senaryoyla test edildi (yeni bildirim + tekrar)
- [ ] Tüm kabul kriterleri karşılandı
- [ ] Aşama 3'e devir notu: `Report.status` üzerinde durum makinesi, `ReportEvent`/`User` modelleri, panel listesi — `features/reports` dilimi hazır

---

## NOTES

### Tasarım kararları

**Neden `Report` modeli Aşama 2'de tam?** PRD 7.1'deki model kanoniktir; `resolutionNote`, `resolvedPhoto`, `closedAt` Aşama 3'te kullanılır ama şimdi eklemek bir migration tasarrufu. `ReportEvent` ve `User` **eklenmez** — User şema gerektirir (auth Aşama 3), ReportEvent ona bağlıdır. Tekilleştirme mantığı `YENI`/`ATANDI`'ya bakar; Aşama 3 durum makinesi bu kümeyi genişletmez.

**Neden tekilleştirme rate limit'ten önce?** PRD UH-2: "gün içinde 6 kişi daha bildirim gönderir; yeni kayıt açmaz, sayacı 7 yapar." Aynı IP'den gelen 2. bildirim 429 dönerse bu akış ölür. Sayaç artırma maliyeti ihmal edilebilir — spam kısıtı yalnızca **yeni** kayıt oluşturma yolunda uygulanır. Bu, PRD 9.2'deki "5 dakikada 1 bildirim"in tekilleştirmeyle çelişmediği tek tutarlı yorumdur.

**Neden rate limit bellek içi?** Demo ölçeği (tek park, tek makine) için yeterli; veritabanı yaklaşımı migration + temizlik işi ekler ve PRD'nin "harici servis yok" kuralıyla uyumlu. Bedeli: sunucu yeniden başlarken sayaçlar sıfırlanır — README'ye not düşüldü. Saat enjekte edilebilir tasarlandı ki testler pencereler arası davranışı kanıtlayabilsin.

**Neden photoFile `File` + `Buffer` ayrımı?** Şema (`File`) yalnızca route sınırında; servis `Buffer` alır — servis testleri `File` kurmak zorunda kalmaz, fotoğraf boru hattı izole test edilir.

### Bilinen riskler

| Risk | Etki | Azaltma |
|---|---|---|
| `sharp` native kurulum (Windows) | Orta — prebuild yoksa Build Tools gerekir | `npm install sharp` çıktısını izle; Node 24 prebuild'leri mevcut |
| sharp + Turbopack paketleme | Yüksek — eklenmezse derleme patlar | Görev 1: `serverExternalPackages` + `npm run build` doğrulaması |
| `agent-browser` Windows'ta çalışmaz | Düşük | E2E bölümündeki manuel + curl yedeği |
| Rate limit / tekilleştirme sıra hataları | Orta — yanlış sırada 429 ile UX bozulur | Görev 11 GOTCHA + testler (2., 5., 6. senaryo) |
| Eşzamanlı aynı demirbaş bildirimi | Düşük — nadiren çift kayıt | Transaction içinde yeniden kontrol (Görev 11); demo için kabul |

### Aşama 3'e devredilenler

Durum makinesi (`YENI → ATANDI → ONARILDI`, `REDDEDILDI`), `ReportEvent` olay kaydı, `User` + oturum, `Asset.status` otomatik senkronizasyonu (`ARIZALI`/`AKTIF`), `/panel/bildirimler`, `/q/[code]` personel görünümü. Bu aşamada `Report.status` yalnızca `YENI` üretir; `getOpenReport` Aşama 3'te panel tarafından da kullanılır.

### Sürüm notu

Plan 7 Ağustos 2026 itibarıyla doğrulandı: sharp **0.35.x** (npm registry), Next **16.3.0**, Prisma **7.9.1**, zod **4.4.3**, vitest **4.1.10**. Node **24.16.0** — sharp prebuild'leri Node 24'ü destekler.

**Confidence Score: 8/10** — Desenler Aşama 1'de oturmuş durumda (service/repository/tx/error desenleri kanıtlanmış); kalan riskler `sharp` kurulumu ve E2E tarayıcı aracının Windows uyumluluğu. Her ikisi de plan içinde yedekli doğrulama yoluna bağlandı.
