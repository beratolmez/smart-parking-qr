# Feature: Aşama 1 — İskelet, Envanter ve QR Üretimi

Aşağıdaki plan eksiksiz olacak şekilde yazıldı, ancak **uygulamaya başlamadan önce dokümantasyonu ve paket sürümlerini doğrula.** Özellikle Prisma 7 ve Next.js 16, eğitim verisindeki kullanımdan farklı çalışıyor — bu planın "GOTCHA" notlarını atlama.

Mevcut util, tip ve model isimlerine dikkat et. Bu proje sıfırdan kuruluyor; henüz mevcut kod yok, dolayısıyla bu plandaki isimlendirmeler **kanonik referanstır** ve sonraki aşamalar bunlara dayanacak.

---

## Feature Description

ParkTakip'in birinci aşaması: projeyi sıfırdan ayağa kaldırmak, veri modelini oluşturmak, demirbaş (asset) envanterini yönetilebilir hale getirmek ve her demirbaş için A4 sayfaya basılabilecek QR etiketleri üretmek.

Aşamanın sonunda somut çıktı şudur: **yönetici parka 12 bank ekler, "Etiket Yazdır" der, A4 çıktı alır, çıktıdaki QR'ı gerçek bir telefonla okutur ve doğru URL'e gider.** Bu URL'in açtığı vatandaş formu Aşama 2'nin konusudur; Aşama 1'de o adres henüz 404 döner — bu beklenen davranıştır.

## User Story

**Birim yöneticisi** olarak
Parktaki demirbaşları sisteme girip QR etiketlerini toplu yazdırmak istiyorum
ki **sahaya çıkıp yapıştırabileyim ve her demirbaş benzersiz bir dijital kimlik kazansın.**

## Problem Statement

Belediyenin park demirbaşlarının dijital kaydı yok. Kaç bank olduğu, hangisinin ne zaman monte edildiği kimse tarafından kesin bilinmiyor. Kayıt olmadığı için bir demirbaşı benzersiz olarak adresleyecek bir kimlik de yok — bu, tüm ParkTakip fikrinin dayandığı temel eksiklik.

## Solution Statement

Park ve demirbaş kayıtlarını tutan bir veri modeli, demirbaş türüne göre çakışmasız benzersiz kod üreten (`BANK-0147`) bir servis, bu kodları yöneten bir panel arayüzü ve kodları QR'a çevirip A4 etiket sayfası olarak yazdıran bir görünüm.

Kod üretimi **atomik sayaç tablosu** üzerinden yapılır — toplu ekleme sırasında yarış koşulu (race condition) oluşmasını engeller. Bu, PRD Bölüm 11'deki "100 demirbaş eklendiğinde kodlar çakışmıyor" kriterinin doğrudan karşılığıdır.

## Feature Metadata

**Feature Type**: New Capability (greenfield — proje kurulumu dahil)
**Estimated Complexity**: Medium
**Primary Systems Affected**: Tüm proje (sıfırdan kurulum), `core/`, `features/assets`, `app/panel`
**Dependencies**: Next.js 16.3, React 19.2, Prisma 7.9, Tailwind 4.3, Zod 4.4, qrcode 1.5, better-sqlite3 (adapter üzerinden)

---

## CONTEXT REFERENCES

### Okunması Zorunlu Proje Dosyaları

Bu dosyaları uygulamaya başlamadan **önce oku**:

- `PRD.md` (Bölüm 6.2 — Dizin Yapısı) — Uyulacak dizin şeması. Bu plandaki her yeni dosya oraya denk gelir.
- `PRD.md` (Bölüm 7.1 — Veri Modeli) — Prisma şemasının kaynağı. **Aşama 1'de yalnızca `Park` ve `Asset` modelleri + enum'lar oluşturulur**; `Report`, `ReportEvent`, `User` Aşama 2–3'te eklenecek.
- `PRD.md` (Bölüm 12, Aşama 1) — Bu aşamanın çıktı listesi ve doğrulama kriteri.
- `.claude/references/vertical-slice-architecture.md` (satır 44–263) — `core/` vs `shared/` vs özellik dilimi karar çerçevesi. Üç-özellik kuralı burada.
- `.claude/references/frontend-component-best-practices.md` — Bileşen yapısı, props tipleme (`<ComponentName>Props`), erişilebilirlik (44px dokunma hedefi, semantik HTML, görünür focus ring).
- `.claude/references/backend-api-best-practices.md` (satır 22–45) — Hata gövdesi biçimi ve HTTP durum kodu tablosu. `GET /api/assets/[id]/qr` bunlara uyacak.

> **Not:** Depoda henüz kod yok — mevcut kod dosyası referansı verilemiyor. Bu plandaki desenler, sonraki aşamaların kopyalayacağı kanonik desenlerdir. Bu yüzden özensiz yazma; Aşama 2 ve 3 buradaki `service.ts` / `repository.ts` / `actions.ts` yapısını birebir taklit edecek.

### Oluşturulacak Yeni Dosyalar

**Proje kökü (yapılandırma)**
- `package.json`, `tsconfig.json` — create-next-app tarafından üretilir
- `next.config.ts` — `serverExternalPackages` ayarı (kritik, aşağıya bak)
- `prisma.config.ts` — Prisma 7'de **zorunlu**; datasource URL ve seed komutu burada
- `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`
- `.env`, `.env.example`, `.gitignore`

**Veritabanı**
- `prisma/schema.prisma` — Park, Asset, AssetCodeCounter + enum'lar
- `prisma/seed.ts` — 1 park + 35 demirbaş

**core/ — evrensel altyapı**
- `src/core/config.ts` — zod ile doğrulanmış ortam değişkenleri
- `src/core/db.ts` — Prisma client tekil örneği (adapter ile)
- `src/core/logger.ts` — yapılandırılmış log
- `src/core/errors.ts` — `AppError`, `NotFoundError`, `ValidationError`

**shared/**
- `src/shared/format.ts` — Türkçe tarih biçimlendirme
- `src/shared/ui/Button.tsx`, `Card.tsx`, `EmptyState.tsx`

**features/assets/ — özellik dilimi**
- `src/features/assets/constants.ts` — enum → Türkçe etiket eşlemeleri, tür → kod öneki
- `src/features/assets/codes.ts` — kod biçimlendirme (saf fonksiyonlar, test edilir)
- `src/features/assets/schemas.ts` — zod giriş şemaları
- `src/features/assets/repository.ts` — Prisma sorguları
- `src/features/assets/service.ts` — iş mantığı + atomik kod tahsisi
- `src/features/assets/actions.ts` — Server Action'lar
- `src/features/assets/qr.ts` — QR SVG/PNG üretimi
- `src/features/assets/components/AssetForm.tsx`, `AssetTable.tsx`, `LabelSheet.tsx`, `PrintButton.tsx`
- `src/features/assets/codes.test.ts`, `service.test.ts`
- `src/features/assets/README.md`

**app/ — yönlendirme**
- `src/app/layout.tsx`, `globals.css`, `page.tsx`
- `src/app/panel/layout.tsx`, `panel/page.tsx`
- `src/app/panel/demirbaslar/page.tsx`, `yeni/page.tsx`, `[id]/duzenle/page.tsx`
- `src/app/panel/etiketler/page.tsx`
- `src/app/api/assets/[id]/qr/route.ts`

**tests/**
- `tests/setup.ts` — test veritabanı hazırlığı

### Okunması Zorunlu Dokümantasyon

> Bu bağlantılar **uygulama öncesinde okunmalı.** Next.js 16 ve Prisma 7, eğitim verisindeki kullanımdan ciddi biçimde farklı.

- [Next.js 16 Yükseltme Rehberi](https://nextjs.org/docs/app/guides/upgrading/version-16#async-request-apis-breaking-change)
  - Bölüm: *Async Request APIs* ve *Turbopack by default*
  - Neden: `params` artık **Promise**. Senkron erişim Next 16'da tamamen kaldırıldı. `/panel/demirbaslar/[id]/duzenle` bundan etkileniyor.
- [Next.js `page.js` — Page Props Helper](https://nextjs.org/docs/app/api-reference/file-conventions/page#page-props-helper)
  - Bölüm: `PageProps<'/route'>` tip yardımcısı
  - Neden: `npx next typegen` sonrası tip güvenli async params erişimi.
- [Prisma 7'ye Yükseltme Rehberi](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
  - Bölüm: generator değişikliği, `prisma.config.ts`, driver adapter
  - Neden: `prisma-client-js` deprecated; `output` artık zorunlu; import yolu `@prisma/client` değil.
- [Prisma — SQLite driver adapter](https://www.prisma.io/docs/orm/overview/databases/sqlite)
  - Bölüm: `@prisma/adapter-better-sqlite3` kurulumu
  - Neden: Prisma 7'de PrismaClient artık adapter olmadan bağlanmıyor.
- [Prisma — Generators](https://www.prisma.io/docs/orm/prisma-schema/overview/generators)
  - Bölüm: `prisma-client` generator ve `output`
  - Neden: Doğru generator bloğu.
- [Tailwind CSS v4 — Next.js kurulumu](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
  - Neden: v4'te `tailwind.config.js` yok; `@import "tailwindcss"` ve `@tailwindcss/postcss` kullanılıyor.
- [node-qrcode API](https://github.com/soldair/node-qrcode#api)
  - Bölüm: `toString` (SVG) ve `toDataURL`
  - Neden: Yazdırma kalitesi için SVG üretilecek.

### Uyulacak Desenler

Depoda henüz kod olmadığı için bu desenler **bu plan tarafından tanımlanır** ve sonraki aşamalarda birebir tekrarlanır.

**İsimlendirme**

| Öğe | Kural | Örnek |
|---|---|---|
| Dosya (bileşen) | PascalCase | `AssetForm.tsx` |
| Dosya (diğer) | kebab-case veya tek kelime | `service.ts`, `rate-limit.ts` |
| Rota klasörü | Türkçe, kebab-case | `panel/demirbaslar`, `panel/etiketler` |
| Değişken/fonksiyon | camelCase, İngilizce | `createAssets`, `allocateCodes` |
| Prisma modeli | PascalCase, İngilizce tekil | `Asset`, `Park` |
| Enum değeri | SCREAMING_SNAKE, Türkçe | `BANK`, `OYUN_GRUBU`, `AKTIF` |
| Kullanıcıya görünen metin | **Türkçe** | `"Demirbaş eklendi"` |

**Katman akışı** — bu sıra bozulmaz:

```
page.tsx / route.ts / actions.ts   ← girdi burada zod'dan geçer
        ↓
     service.ts                    ← iş kuralları; Prisma'yı doğrudan çağırmaz
        ↓
   repository.ts                   ← yalnızca Prisma sorguları; iş kuralı yok
        ↓
     core/db.ts → Prisma
```

**Hata yönetimi** (`src/core/errors.ts`):

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,      // makine-okunur: "ASSET_NOT_FOUND"
    message: string,                    // Türkçe, kullanıcıya gösterilebilir
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) { super("NOT_FOUND", message, 404); }
}
```

Route handler'lar bunu `.claude/references/backend-api-best-practices.md` biçimine çevirir:
`{ "error": code, "detail": message }`

**Log deseni** — olay adı `{domain}.{action}.{status}`:

```ts
logger.info("asset.create.started", { type, count });
logger.info("asset.create.success", { codes });
logger.error("asset.create.failed", { error: String(e) });
```

**Server Action deseni** — Aşama 2 ve 3 bunu kopyalayacak:

```ts
"use server";
export async function createAssetsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createAssetsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  try {
    const assets = await assetService.createAssets(parsed.data);
    revalidatePath("/panel/demirbaslar");
    return { ok: true, message: `${assets.length} demirbaş eklendi.` };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message };
    throw e;
  }
}
```

> **GOTCHA (Zod 4):** `error.flatten()` deprecated. Zod 4'te `z.flattenError(error)` kullan. Ayrıca hata mesajı parametresi artık `{ message: "..." }` değil `{ error: "..." }` — `z.string({ error: "Zorunlu alan" })`.

**Anti-desenler — yapma:**

- ❌ `repository.ts` içine iş kuralı koyma (kod üretimi, doğrulama vb.)
- ❌ Sayfa bileşeninde doğrudan `prisma.asset.findMany()` çağırma — servisten geç
- ❌ `params` senkron kullanma — Next 16'da çalışmaz
- ❌ `core/` içine demirbaşa özgü herhangi bir şey koyma
- ❌ Kullanıcıya İngilizce hata mesajı gösterme
- ❌ `tailwind.config.js` oluşturma — Tailwind 4'te gereksiz

---

## IMPLEMENTATION PLAN

### Phase 1: Temel (Foundation)

Proje iskeleti, yapılandırma, veritabanı bağlantısı ve şema. Bu faz bitmeden hiçbir özellik kodu yazılmaz.

**Tasks:** create-next-app iskeleti · Prisma 7 + SQLite adapter kurulumu · `prisma.config.ts` · şema ve ilk migration · `core/` altyapısı · seed betiği

### Phase 2: Çekirdek Uygulama (Core Implementation)

Demirbaş dilimi: sabitler, kod üretimi, zod şemaları, repository, service, QR üretimi. Bu fazın tamamı arayüzsüz test edilebilir.

**Tasks:** `constants.ts` · `codes.ts` · `schemas.ts` · `repository.ts` · `service.ts` (atomik kod tahsisi) · `qr.ts`

### Phase 3: Entegrasyon (Integration)

Panel arayüzü, Server Action'lar, etiket yazdırma görünümü ve QR API ucu.

**Tasks:** panel layout · demirbaş listesi · ekleme formu (tekil + toplu) · düzenleme · etiket sayfası + yazdırma · QR route handler

### Phase 4: Test ve Doğrulama

Birim testleri, servis testleri, uçtan uca tarayıcı doğrulaması, gerçek telefonla QR okutma.

**Tasks:** vitest kurulumu · `codes.test.ts` · `service.test.ts` (çakışma testi dahil) · tarayıcı E2E · fiziksel QR doğrulaması

---

## STEP-BY-STEP TASKS

Görevleri **sırayla, yukarıdan aşağıya** uygula. Her görev atomik ve bağımsız doğrulanabilir.

---

### 1. CREATE — Next.js iskeleti

- **IMPLEMENT**: `create-next-app` ile proje iskeletini kur. Dizin boş olmadığı için (`.claude/`, `.mcp.json`, `PRD.md` var) doğrudan `.` içine kurulamaz — geçici klasöre kurup taşı.
- **KOMUT**:
  ```powershell
  npx create-next-app@latest .scaffold --typescript --eslint --app --src-dir --tailwind --import-alias "@/*" --use-npm --disable-git --yes
  Remove-Item .scaffold\.git -Recurse -Force -ErrorAction SilentlyContinue
  Get-ChildItem -Path .scaffold -Force | Move-Item -Destination . -Force
  Remove-Item .scaffold -Recurse -Force
  ```
- **GOTCHA**: `--disable-git` bayrağı desteklenmiyorsa `.scaffold/.git` klasörünü elle sil — aksi halde iç içe git deposu oluşur. Taşıma sonrası kök dizinde `.scaffold` kalıntısı olmadığını doğrula.
- **GOTCHA**: `package.json` scriptlerinde `--turbopack` bayrağı varsa **kaldır** — Next 16'da Turbopack zaten varsayılan (bkz. yükseltme rehberi, *Turbopack by default*).
- **VALIDATE**: `npm run build` (boş şablon derlenmeli) ve `Test-Path src/app/layout.tsx`

---

### 2. UPDATE — `package.json` scriptleri

- **IMPLEMENT**: Scriptleri projenin ihtiyacına göre düzenle.
  ```json
  {
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "eslint .",
      "typecheck": "tsc --noEmit",
      "typegen": "next typegen",
      "db:migrate": "prisma migrate dev",
      "db:generate": "prisma generate",
      "db:seed": "prisma db seed",
      "db:reset": "prisma migrate reset --force",
      "test": "vitest run",
      "test:watch": "vitest"
    }
  }
  ```
- **GOTCHA**: Next.js 16'da `next lint` **kaldırıldı** ve `next build` artık lint çalıştırmıyor. `lint` scripti doğrudan ESLint CLI'ı çağırmalı.
- **VALIDATE**: `npm run lint`

---

### 3. CREATE — Prisma 7 kurulumu ve `prisma.config.ts`

- **IMPLEMENT**: Prisma ve SQLite driver adapter'ı kur, kök dizine `prisma.config.ts` oluştur.
- **KOMUT**:
  ```bash
  npm install prisma@latest @prisma/client@latest @prisma/adapter-better-sqlite3@latest
  npm install -D tsx dotenv
  ```
- **DOSYA** `prisma.config.ts`:
  ```ts
  import "dotenv/config";
  import { defineConfig, env } from "prisma/config";

  export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
      path: "prisma/migrations",
      seed: "tsx prisma/seed.ts",
    },
    datasource: {
      url: env("DATABASE_URL"),
    },
  });
  ```
- **GOTCHA (kritik)**: Prisma 7'de `package.json` içindeki `prisma.seed` alanı **artık okunmuyor** — seed komutu `prisma.config.ts` içindeki `migrations.seed` alanında tanımlanır. Ayrıca migration sonrası **otomatik seed çalıştırma kaldırıldı**; `npm run db:seed` elle çağrılır.
- **GOTCHA**: `datasource.url`'in hem `prisma.config.ts` hem `schema.prisma` içinde olup olmayacağı konusunda dokümantasyonda tutarsızlık var. **Önce `schema.prisma`'daki `datasource` bloğuna `url` koymadan dene**; `prisma validate` hata verirse `url = env("DATABASE_URL")` satırını ekle. Hangi biçimin çalıştığını `features/assets/README.md`'ye not düş.
- **VALIDATE**: `npx prisma validate`

---

### 4. CREATE — `.env` ve `.env.example`

- **IMPLEMENT**: İki dosya da aynı anahtarları içersin; `.env` gerçek değerlerle, `.env.example` boş/örnek değerlerle.
  ```bash
  DATABASE_URL="file:./dev.db"
  APP_URL="http://localhost:3000"
  MUNICIPALITY_NAME="Örnek Belediyesi"
  ```
- **GOTCHA**: SQLite yolu `prisma/` klasörüne **göreli** çözülür — `file:./dev.db` veritabanını `prisma/dev.db` olarak oluşturur. Bu doğru davranıştır.
- **GOTCHA**: `.gitignore` içine `.env`, `prisma/dev.db*`, `prisma/test.db*`, `src/generated/` ekle. Üretilen Prisma client'ı depoya commit etme.
- **VALIDATE**: `Test-Path .env.example` ve `git check-ignore .env` çıktı vermeli

---

### 5. CREATE — `prisma/schema.prisma`

- **IMPLEMENT**: PRD Bölüm 7.1'deki modelin **Aşama 1 alt kümesi** — `Park`, `Asset`, `AssetCodeCounter` ve ilgili enum'lar. `Report`/`ReportEvent`/`User` **eklenmez**.
  ```prisma
  generator client {
    provider = "prisma-client"
    output   = "../src/generated/prisma"
  }

  datasource db {
    provider = "sqlite"
  }

  model Park {
    id        String   @id @default(cuid())
    name      String
    district  String
    latitude  Float?
    longitude Float?
    assets    Asset[]
    createdAt DateTime @default(now())
  }

  model Asset {
    id          String      @id @default(cuid())
    code        String      @unique
    type        AssetType
    park        Park        @relation(fields: [parkId], references: [id])
    parkId      String
    label       String?
    latitude    Float?
    longitude   Float?
    brand       String?
    installedAt DateTime?
    status      AssetStatus @default(AKTIF)
    photoUrl    String?
    createdAt   DateTime    @default(now())
    updatedAt   DateTime    @updatedAt

    @@index([parkId, status])
  }

  /// Kod tahsisinde yarış koşulunu engelleyen atomik sayaç.
  model AssetCodeCounter {
    type      AssetType @id
    lastValue Int       @default(0)
  }

  enum AssetType   { BANK OYUN_GRUBU SALINCAK KAYDIRAK TAHTEREVALLI SPOR_ALETI COP_KUTUSU AYDINLATMA CESME DIGER }
  enum AssetStatus { AKTIF ARIZALI BAKIMDA HURDA }
  ```
- **PATTERN**: Model isimleri İngilizce/PascalCase, enum değerleri Türkçe/SCREAMING_SNAKE — Desenler tablosuna uygun.
- **GOTCHA (kritik)**: `output` alanı Prisma 7'de **zorunlu**. `../src/generated/prisma` yolu `prisma/` klasörüne görelidir, yani proje kökünden `src/generated/prisma` olur.
- **GOTCHA**: `provider = "prisma-client"` — `prisma-client-js` **kullanma**, deprecated.
- **GOTCHA**: SQLite enum'ları yerel olarak desteklemez; Prisma bunları `TEXT` + CHECK kısıtı olarak üretir. Davranış aynıdır, Postgres'e geçişte sorun çıkmaz.
- **VALIDATE**: `npx prisma validate` ve `npx prisma migrate dev --name init` ardından `Test-Path src/generated/prisma`

---

### 6. UPDATE — `next.config.ts`

- **IMPLEMENT**: Native modülleri sunucu tarafında dışarıda bırak.
  ```ts
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
  };

  export default nextConfig;
  ```
- **GOTCHA (kritik)**: `better-sqlite3` bir **native** (`.node`) modüldür. Turbopack bunu paketlemeye çalışırsa `Module not found` veya `invalid ELF header` benzeri hata alırsın. `serverExternalPackages` bunu engeller. Aşama 2'de `sharp` eklendiğinde onu da bu listeye ekle.
- **GOTCHA**: Windows'ta `better-sqlite3` derlenmiş ikili (prebuild) indirir. `npm install` sırasında derleme hatası çıkarsa Node 24 için prebuild bulunmadığı anlamına gelir — bu durumda Visual Studio Build Tools gerekir. Kurulum çıktısını kontrol et.
- **VALIDATE**: `npm run build`

---

### 7. CREATE — `src/core/config.ts`

- **IMPLEMENT**: Ortam değişkenlerini zod ile doğrula; eksikse uygulama açılışta anlaşılır hata versin.
  ```ts
  import "server-only";
  import { z } from "zod";

  const schema = z.object({
    DATABASE_URL: z.string().min(1, { error: "DATABASE_URL tanımlı değil." }),
    APP_URL: z.url({ error: "APP_URL geçerli bir URL olmalı." }),
    MUNICIPALITY_NAME: z.string().min(1).default("Belediye"),
  });

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      "Ortam değişkenleri hatalı:\n" +
        JSON.stringify(z.flattenError(parsed.error).fieldErrors, null, 2),
    );
  }

  export const config = parsed.data;
  ```
- **IMPORTS**: `npm install server-only`
- **GOTCHA (Zod 4)**: `z.string().url()` deprecated → `z.url()`. Hata mesajı parametresi `{ message }` değil `{ error }`. `error.flatten()` → `z.flattenError(error)`.
- **GOTCHA**: `import "server-only"` sayesinde bu modül yanlışlıkla bir Client Component'ten import edilirse derleme hatası verir — sırların istemciye sızmasını engeller.
- **VALIDATE**: `npm run typecheck`

---

### 8. CREATE — `src/core/db.ts`

- **IMPLEMENT**: Adapter'lı Prisma client; geliştirme sırasında HMR'ın bağlantı sızdırmaması için `globalThis` koruması.
  ```ts
  import "server-only";
  import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
  import { PrismaClient } from "@/generated/prisma/client";
  import { config } from "@/core/config";

  const createClient = () =>
    new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: config.DATABASE_URL }),
    });

  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

  export const prisma = globalForPrisma.prisma ?? createClient();

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  ```
- **GOTCHA (kritik)**: Import yolu `@prisma/client` **değil** — Prisma 7'de generator `output` ne ise oradan import edilir. Burada `@/generated/prisma/client`.
- **GOTCHA**: Adapter olmadan `new PrismaClient()` Prisma 7'de bağlanamaz.
- **GOTCHA**: `globalThis` koruması olmadan `next dev` her sıcak yeniden yüklemede yeni bağlantı açar ve SQLite dosya kilidi hatası verir.
- **VALIDATE**: `npm run typecheck`

---

### 9. CREATE — `src/core/logger.ts` ve `src/core/errors.ts`

- **IMPLEMENT**: `logger` — `info/warn/error` metotları, JSON çıktı, olay adı + bağlam nesnesi. `errors` — yukarıdaki "Hata yönetimi" desenindeki `AppError`, `NotFoundError`, `ValidationError`.
- **PATTERN**: Olay adı `{domain}.{action}.{status}` (bkz. Desenler bölümü).
- **GOTCHA**: Harici log kütüphanesi kurma — `console.log(JSON.stringify(...))` bu ölçekte yeterli ve bağımlılık eklemez.
- **VALIDATE**: `npm run typecheck`

---

### 10. CREATE — `src/features/assets/constants.ts`

- **IMPLEMENT**: Enum → Türkçe etiket ve tür → kod öneki eşlemeleri. Tek kaynak burası; arayüzde hiçbir yerde Türkçe tür adı elle yazılmaz.
  ```ts
  import type { AssetType, AssetStatus } from "@/generated/prisma/client";

  export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
    BANK: "Bank",
    OYUN_GRUBU: "Oyun Grubu",
    SALINCAK: "Salıncak",
    KAYDIRAK: "Kaydırak",
    TAHTEREVALLI: "Tahterevalli",
    SPOR_ALETI: "Spor Aleti",
    COP_KUTUSU: "Çöp Kutusu",
    AYDINLATMA: "Aydınlatma",
    CESME: "Çeşme",
    DIGER: "Diğer",
  };

  export const ASSET_TYPE_PREFIXES: Record<AssetType, string> = {
    BANK: "BANK", OYUN_GRUBU: "OYUN", SALINCAK: "SALN", KAYDIRAK: "KAYD",
    TAHTEREVALLI: "THTR", SPOR_ALETI: "SPOR", COP_KUTUSU: "COPK",
    AYDINLATMA: "AYDN", CESME: "CSME", DIGER: "DGER",
  };

  export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
    AKTIF: "Aktif", ARIZALI: "Arızalı", BAKIMDA: "Bakımda", HURDA: "Hurda",
  };
  ```
- **GOTCHA**: `Record<AssetType, string>` kullan — yeni bir enum değeri eklendiğinde TypeScript eksik çeviriyi derleme zamanında yakalar.
- **GOTCHA**: Önekler ASCII olmalı (Türkçe karakter yok) — QR içeriğinde URL kodlaması sorununu önler.
- **VALIDATE**: `npm run typecheck`

---

### 11. CREATE — `src/features/assets/codes.ts`

- **IMPLEMENT**: Saf, yan etkisiz fonksiyonlar (bu yüzden ayrı dosya — test edilmesi kolay).
  ```ts
  export function formatAssetCode(type: AssetType, sequence: number): string  // BANK, 147 → "BANK-0147"
  export function parseAssetCode(code: string): { prefix: string; sequence: number } | null
  export function normalizeAssetCode(input: string): string  // " bank-147 " → "BANK-0147"
  ```
- **PATTERN**: `${prefix}-${String(sequence).padStart(4, "0")}`
- **GOTCHA**: `normalizeAssetCode` Aşama 2'deki "kod ile bildir" kutusu için gerekli — kullanıcı `bank-147`, `BANK147`, ` bank 147 ` yazabilir. Şimdiden yaz ve test et.
- **GOTCHA**: Türkçe büyük harf dönüşümü tuzağı — `"i".toUpperCase()` Türkçe yerelde `"İ"` verir. `toUpperCase()` yerine `toLocaleUpperCase("en-US")` kullan.
- **VALIDATE**: `npx vitest run src/features/assets/codes.test.ts` (Görev 22'den sonra)

---

### 12. CREATE — `src/features/assets/schemas.ts`

- **IMPLEMENT**: Zod şemaları — `createAssetsSchema` (toplu ekleme için `count` alanı dahil), `updateAssetSchema`, `assetFilterSchema`.
  ```ts
  export const createAssetsSchema = z.object({
    parkId: z.string().min(1, { error: "Park seçilmelidir." }),
    type: z.enum(ASSET_TYPES, { error: "Geçerli bir tür seçin." }),
    count: z.coerce.number().int().min(1).max(100).default(1),
    label: z.string().max(120).optional(),
    brand: z.string().max(120).optional(),
    installedAt: z.coerce.date().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  });
  ```
- **GOTCHA**: Form verisi `FormData`'dan gelir ve **her alan string'dir**. Sayı ve tarih alanlarında `z.coerce` kullanmazsan doğrulama her seferinde patlar.
- **GOTCHA**: Boş string (`""`) opsiyonel alanlarda `undefined` değildir. `.transform(v => v === "" ? undefined : v)` veya `z.preprocess` ile temizle.
- **GOTCHA**: `count` üst sınırı 100 — kullanıcı yanlışlıkla 10.000 yazıp veritabanını şişirmesin.
- **VALIDATE**: `npm run typecheck`

---

### 13. CREATE — `src/features/assets/repository.ts`

- **IMPLEMENT**: Yalnızca Prisma sorguları, iş kuralı yok.
  ```ts
  listAssets(filter): Promise<AssetWithPark[]>
  getAssetById(id): Promise<AssetWithPark | null>
  getAssetByCode(code): Promise<AssetWithPark | null>
  createManyAssets(data: Prisma.AssetCreateManyInput[]): Promise<number>
  updateAsset(id, data): Promise<Asset>
  listParks(): Promise<Park[]>
  allocateSequence(tx, type, count): Promise<number>   // sayaç tablosunu atomik artırır, başlangıç değerini döner
  ```
- **PATTERN**: `allocateSequence` **transaction client** (`tx`) alır — servis katmanı transaction sınırını yönetir.
  ```ts
  export async function allocateSequence(tx: Prisma.TransactionClient, type: AssetType, count: number) {
    const counter = await tx.assetCodeCounter.upsert({
      where: { type },
      create: { type, lastValue: count },
      update: { lastValue: { increment: count } },
    });
    return counter.lastValue - count + 1;   // tahsis edilen ilk sıra numarası
  }
  ```
- **GOTCHA (kritik)**: Kod üretimi için `SELECT MAX(code)` **kullanma**. Toplu eklemede ve eşzamanlı isteklerde çakışma üretir. Sayaç tablosu + `increment` atomiktir.
- **GOTCHA**: `createMany` SQLite'ta desteklenir ama oluşturulan kayıtları döndürmez. Kodları zaten önceden bildiğin için sonrasında `findMany({ where: { code: { in: codes } } })` ile çek.
- **VALIDATE**: `npm run typecheck`

---

### 14. CREATE — `src/features/assets/service.ts`

- **IMPLEMENT**: İş mantığı. `createAssets` tüm işi tek transaction içinde yapar.
  ```ts
  export async function createAssets(input: CreateAssetsInput): Promise<Asset[]> {
    logger.info("asset.create.started", { type: input.type, count: input.count });

    const park = await repository.getParkById(input.parkId);
    if (!park) throw new NotFoundError("Seçilen park bulunamadı.");

    const assets = await prisma.$transaction(async (tx) => {
      const start = await repository.allocateSequence(tx, input.type, input.count);
      const codes = Array.from({ length: input.count }, (_, i) =>
        formatAssetCode(input.type, start + i),
      );
      await tx.asset.createMany({ data: codes.map((code) => ({ ...rest, code })) });
      return tx.asset.findMany({ where: { code: { in: codes } }, orderBy: { code: "asc" } });
    });

    logger.info("asset.create.success", { codes: assets.map((a) => a.code) });
    return assets;
  }
  ```
  Ayrıca: `listAssets`, `getAsset` (yoksa `NotFoundError`), `updateAsset`, `archiveAsset` (`status = HURDA`, **silme yok**).
- **GOTCHA**: `updateAsset` **`code` alanını değiştirmesine izin verme** — kod fiziksel etikete basılıdır, değişirse etiket geçersiz olur. Şema seviyesinde `code`'u update girdisinden çıkar.
- **GOTCHA**: Silme yok. Demirbaş `HURDA` statüsüne alınır; geçmiş bildirimlerin (Aşama 2) yetim kalmaması için gerekli.
- **VALIDATE**: `npx vitest run src/features/assets/service.test.ts` (Görev 23'ten sonra)

---

### 15. CREATE — `src/features/assets/qr.ts`

- **IMPLEMENT**: QR üretimi.
  ```ts
  import QRCode from "qrcode";
  import { config } from "@/core/config";

  export function assetUrl(code: string): string {
    return `${config.APP_URL.replace(/\/$/, "")}/q/${code}`;
  }

  export async function qrSvg(code: string): Promise<string> {
    return QRCode.toString(assetUrl(code), {
      type: "svg", errorCorrectionLevel: "M", margin: 1, width: 240,
    });
  }

  export async function qrPngDataUrl(code: string): Promise<string> { /* toDataURL */ }
  ```
- **IMPORTS**: `npm install qrcode` + `npm install -D @types/qrcode`
- **GOTCHA**: `qrcode` paketi TypeScript tipleri **içermez** — `@types/qrcode`'u ayrıca kur, yoksa `npm run typecheck` patlar.
- **GOTCHA**: `errorCorrectionLevel: "M"` seçildi — dış mekânda etiket kısmen kirlense/çizilse bile okunabilirlik sağlar. `"L"` kullanma.
- **GOTCHA**: `APP_URL` sonundaki eğik çizgi çift `//` üretebilir; yukarıdaki `replace` bunu temizler.
- **GOTCHA**: Yazdırma için **SVG** kullan — PNG A4 çıktısında bulanıklaşır ve telefon okuyamayabilir.
- **VALIDATE**: `npm run typecheck`

---

### 16. CREATE — `prisma/seed.ts`

- **IMPLEMENT**: 1 park ("Cumhuriyet Parkı", "Merkez Mahallesi") ve ~35 demirbaş. Dağılım: 14 BANK, 6 COP_KUTUSU, 4 SPOR_ALETI, 3 SALINCAK, 2 KAYDIRAK, 2 OYUN_GRUBU, 2 AYDINLATMA, 1 TAHTEREVALLI, 1 CESME.
- **PATTERN**: Kodları elle yazma — `assetService.createAssets()` çağır. Böylece sayaç tablosu doğru dolar ve seed, üretim yolunu test etmiş olur.
- **GOTCHA**: Seed **idempotent** olmalı. Başında `deleteMany` ile temizle (`asset` → `park` → `assetCodeCounter` sırasıyla, foreign key nedeniyle) ki tekrar çalıştırıldığında 70 demirbaş oluşmasın.
- **GOTCHA**: `installedAt` tarihlerini geçmişe yay (son 3 yıl) — Aşama 4'teki raporlar gerçekçi görünsün.
- **VALIDATE**: `npm run db:reset` sonra `npm run db:seed`, ardından `npx prisma studio` veya bir sayım sorgusuyla 35 kayıt doğrula

---

### 17. CREATE — `src/app/panel/layout.tsx` ve panel iskeleti

- **IMPLEMENT**: Panel kabuk düzeni — üstte başlık (`config.MUNICIPALITY_NAME`), yan/üst gezinme: Gösterge Paneli · Demirbaşlar · Etiketler. `src/app/panel/page.tsx` şimdilik "Aşama 4'te gelecek" yer tutucusu.
- **PATTERN**: Semantik HTML (`<nav>`, `<main>`), görünür focus ring — `.claude/references/frontend-component-best-practices.md` erişilebilirlik bölümü.
- **GOTCHA**: Aşama 1'de **kimlik doğrulama yok** — panel herkese açık. Bu bilinçli; auth Aşama 3'te gelecek. `panel/layout.tsx` içine `{/* TODO Aşama 3: oturum kontrolü */}` yorumu bırak.
- **GOTCHA**: Gezinme öğelerine `print:hidden` sınıfı ekle — etiket sayfası yazdırılırken menü çıktıya girmesin.
- **VALIDATE**: `npm run dev` → `http://localhost:3000/panel` açılıyor

---

### 18. CREATE — `src/app/panel/demirbaslar/page.tsx` + `AssetTable.tsx`

- **IMPLEMENT**: Server Component; `assetService.listAssets()` ile veriyi çeker. Tablo sütunları: Kod · Tür · Park · Etiket · Durum · Montaj · İşlemler (Düzenle / QR indir). Park, tür ve durum filtreleri (`searchParams` ile).
- **PATTERN**: Boş durum mesajı — `EmptyState` bileşeni, metin: "Henüz demirbaş eklenmemiş."
- **GOTCHA**: `searchParams` Next 16'da **Promise**. `const filters = await props.searchParams;` şeklinde bekle.
- **GOTCHA**: Türkçe alfabetik sıralama için `localeCompare(b, "tr")` kullan — aksi halde "Ç" ve "İ" yanlış sıralanır.
- **VALIDATE**: `npm run dev` → `/panel/demirbaslar` 35 seed kaydını listeliyor

---

### 19. CREATE — `src/features/assets/actions.ts` + `AssetForm.tsx` + `yeni/page.tsx`

- **IMPLEMENT**: `createAssetsAction`, `updateAssetAction`, `archiveAssetAction` Server Action'ları (Desenler bölümündeki şablona birebir uy). `AssetForm` bir Client Component; `useActionState` ile hata ve başarı durumunu gösterir. `/panel/demirbaslar/yeni` bu formu render eder; `count > 1` girildiğinde toplu ekleme yapar.
- **PATTERN**: Alan hataları `z.flattenError(...).fieldErrors` üzerinden ilgili input'un altında Türkçe gösterilir.
- **GOTCHA**: `"use server"` direktifi dosyanın **en üstünde** olmalı ve dosyadaki tüm export'lar async fonksiyon olmalı — sabit export edersen derleme hatası alırsın. `ActionState` tipini ayrı bir `types.ts`'e koy.
- **GOTCHA**: Başarıdan sonra `revalidatePath("/panel/demirbaslar")` çağır, yoksa liste eski veriyi gösterir.
- **GOTCHA**: Toplu eklemede başarı mesajı üretilen kod aralığını göstersin: "12 demirbaş eklendi (BANK-0148 – BANK-0159)". Kullanıcı hangi etiketleri basacağını bilmeli.
- **VALIDATE**: `/panel/demirbaslar/yeni` üzerinden `count=12` ile bank ekle; kodların ardışık ve çakışmasız olduğunu doğrula

---

### 20. CREATE — `src/app/panel/demirbaslar/[id]/duzenle/page.tsx`

- **IMPLEMENT**: Mevcut demirbaşı yükleyip `AssetForm`'u dolu modda render eder.
  ```tsx
  export default async function Page(props: PageProps<'/panel/demirbaslar/[id]/duzenle'>) {
    const { id } = await props.params;
    const asset = await assetService.getAsset(id);
    // ...
  }
  ```
- **GOTCHA (kritik)**: `params` Next 16'da Promise — `await props.params` zorunlu. Senkron erişim derlenmez.
- **GOTCHA**: `PageProps<'...'>` tipini kullanmadan önce `npm run typegen` çalıştır, aksi halde tip bulunamaz.
- **GOTCHA**: `code` alanı formda **salt okunur** gösterilsin (disabled input) — değiştirilemez olduğu görünür olmalı.
- **VALIDATE**: `npm run typegen && npm run typecheck`, ardından bir demirbaşı düzenle ve kaydet

---

### 21. CREATE — `src/app/panel/etiketler/page.tsx` + `LabelSheet.tsx` + `PrintButton.tsx`

- **IMPLEMENT**: Yazdırılabilir A4 etiket sayfası. `?ids=a,b,c` veya `?parkId=x` ile demirbaş seçilir; her biri için sunucuda QR SVG üretilir. Düzen: 3 sütun × 4 satır = sayfa başına 12 etiket. Etiket boyutu **63,5mm × 72mm** (Avery L7164 uyumlu).
  Her etikette: QR (yaklaşık 35mm) · insan-okunur kod büyük punto · tür adı · `MUNICIPALITY_NAME` · "Arıza bildirmek için okutun".
- **PATTERN**: Yazdırma CSS'i `globals.css` içine:
  ```css
  @media print {
    @page { size: A4; margin: 8mm; }
    .no-print { display: none !important; }
    .label-sheet { break-inside: avoid; }
  }
  ```
- **GOTCHA (kritik)**: QR'ı `<img src="/api/...">` ile çekme — 12 ayrı HTTP isteği yazdırma anında tamamlanmayabilir ve boş kareler basılır. SVG'yi sunucuda üretip `dangerouslySetInnerHTML` ile satır içi göm.
- **GOTCHA**: `dangerouslySetInnerHTML` kullanımı burada güvenlidir çünkü içerik `qrcode` kütüphanesinin ürettiği SVG'dir, kullanıcı girdisi değil. Yorum satırıyla gerekçelendir.
- **GOTCHA**: Milimetre ölçüleri için Tailwind'in rem tabanlı sınıflarını değil, satır içi `style={{ width: "63.5mm" }}` kullan — yazdırmada fiziksel ölçü tutarlılığı için gerekli.
- **GOTCHA**: `PrintButton` bir Client Component olmalı (`window.print()`); sayfanın geri kalanı Server Component kalsın.
- **GOTCHA**: `break-inside: avoid` olmadan etiketler sayfa sınırında ikiye bölünür.
- **VALIDATE**: `/panel/etiketler?parkId=<id>` → tarayıcı yazdırma önizlemesinde 3×4 düzen görünüyor, etiketler bölünmüyor

---

### 22. CREATE — `src/app/api/assets/[id]/qr/route.ts`

- **IMPLEMENT**: Tek demirbaşın QR görselini döner. `?format=svg|png` (varsayılan `svg`), `?size=` (varsayılan 240).
  ```ts
  export async function GET(request: Request, ctx: RouteContext<'/api/assets/[id]/qr'>) {
    const { id } = await ctx.params;
    // ...
  }
  ```
  Yanıt başlıkları: `Content-Type: image/svg+xml`, `Content-Disposition: inline; filename="BANK-0147.svg"`.
- **PATTERN**: Hata gövdesi `.claude/references/backend-api-best-practices.md` biçiminde: `{ "error": "ASSET_NOT_FOUND", "detail": "..." }`, durum 404.
- **GOTCHA**: Route handler'da `ctx.params` de **Promise** — `await` gerekli.
- **GOTCHA**: `size` parametresini `z.coerce.number().int().min(64).max(1024)` ile sınırla — sınırsız büyük değer sunucuyu zorlar.
- **VALIDATE**: `curl -s "http://localhost:3000/api/assets/<id>/qr" | Select-String "<svg"` ve geçersiz id ile 404 JSON dönüyor

---

### 23. CREATE — Vitest kurulumu ve `codes.test.ts`

- **IMPLEMENT**: Vitest'i kur ve saf fonksiyon testlerini yaz.
  ```bash
  npm install -D vitest
  ```
  `vitest.config.ts`: `test: { environment: "node", setupFiles: ["tests/setup.ts"] }`, `resolve.alias` ile `@` → `./src`.
  Test kapsamı: `formatAssetCode` sıfır dolgusu · `parseAssetCode` geçerli/geçersiz girdi · `normalizeAssetCode` boşluk, küçük harf, eksik tire, **Türkçe "i" tuzağı** (`"bank-1"` → `"BANK-0001"`, `"İ"` üretmemeli).
- **GOTCHA**: `vitest.config.ts` içinde `@` alias'ını tanımlamazsan testler `@/core/...` import'unu çözemez.
- **VALIDATE**: `npx vitest run src/features/assets/codes.test.ts`

---

### 24. CREATE — `tests/setup.ts` ve `service.test.ts`

- **IMPLEMENT**: Servis testleri gerçek bir SQLite test veritabanına karşı çalışır.
  `tests/setup.ts`: `process.env.DATABASE_URL = "file:./test.db"` ata, `execSync("npx prisma migrate deploy")` ile şemayı kur, her testten önce tabloları temizle.
  `service.test.ts` kapsamı:
  1. `createAssets` tek demirbaş → kod formatı doğru
  2. `createAssets` count=100 → **100 benzersiz, ardışık kod** (PRD Bölüm 11 kriteri)
  3. Art arda iki `createAssets` çağrısı → ikinci parti birincinin bittiği yerden devam ediyor
  4. Geçersiz `parkId` → `NotFoundError`
  5. `updateAsset` `code`'u değiştiremiyor
  6. `archiveAsset` kaydı silmiyor, `HURDA` yapıyor
- **GOTCHA**: `DATABASE_URL`'i setup dosyasında, `core/config` **import edilmeden önce** ata. Modül üstü değerlendirme sırası önemli.
- **GOTCHA**: `prisma/test.db`'yi `.gitignore`'a ekle.
- **GOTCHA**: SQLite testleri paralel çalışırsa dosya kilidi çakışır. `vitest.config.ts` içinde `poolOptions: { threads: { singleThread: true } }` ayarla.
- **VALIDATE**: `npm test`

---

### 25. CREATE — `src/features/assets/README.md` ve kök `README.md`

- **IMPLEMENT**: Özellik README'si: amaç, ana akışlar (kod tahsisi, toplu ekleme, etiket yazdırma), iş kuralları (kod değişmez, silme yok, sayaç atomiktir), entegrasyon noktaları (Aşama 2'de `reports` bu dilimden `getAssetByCode` kullanacak). Kök README: kurulum, komutlar, mimari özeti, **Prisma 7 / Next 16 tuzakları**.
- **PATTERN**: `.claude/references/vertical-slice-architecture.md` satır 665–705'teki özellik README şablonu.
- **GOTCHA**: Görev 3'te çözülen `datasource.url` belirsizliğinin sonucunu README'ye yaz — sonraki aşamalar aynı soruyu tekrar araştırmasın.
- **VALIDATE**: `Test-Path src/features/assets/README.md`

---

## TESTING STRATEGY

### Unit Tests

**Çerçeve:** Vitest 4.1 (node ortamı, tek iş parçacığı)
**Konum:** Özellik dizininde, kodun yanında (`src/features/assets/*.test.ts`)

- `codes.test.ts` — saf fonksiyonlar, veritabanı yok, hızlı
- `service.test.ts` — gerçek SQLite test veritabanına karşı; iş kurallarını doğrular

Prisma **mock'lanmaz**. Bu ölçekte gerçek SQLite dosyası hem daha hızlı kurulur hem de gerçek kısıtları (unique index, foreign key) test eder — kod çakışması testinin anlamlı olması için şart.

### Integration Tests

Aşama 1'de ayrı entegrasyon testi yok — `service.test.ts` zaten servis + repository + Prisma zincirini uçtan uca kapsıyor. Çapraz dilim testleri Aşama 3'te (bildirim → demirbaş durumu senkronizasyonu) anlamlı olacak.

### Edge Cases

Bunlar mutlaka test edilecek:

- `count = 100` toplu ekleme → 100 benzersiz kod, atlama yok
- Art arda iki toplu ekleme → sayaç kaldığı yerden devam ediyor
- Aynı türden farklı parklara ekleme → kodlar yine küresel olarak benzersiz
- `normalizeAssetCode("bank-1")` → `"BANK-0001"` (Türkçe `toUpperCase` tuzağı)
- `parseAssetCode("GEÇERSİZ")` → `null`, istisna fırlatmıyor
- Geçersiz `parkId` → `NotFoundError`, ham Prisma hatası değil
- `updateAsset` ile `code` değiştirme denemesi → yok sayılıyor
- Etiket sayfası 0 demirbaşla → boş durum mesajı, boş A4 değil
- Etiket sayfası 13 demirbaşla → ikinci sayfaya taşıyor, etiket bölünmüyor

### E2E / Tarayıcı Doğrulaması

> **⚠️ Windows uyarısı:** `.claude/skills/agent-browser/SKILL.md` (satır 20–23) `agent-browser`'ın Windows'ta Unix domain socket sorunu olduğunu belirtiyor. Bu makine Windows 10 ve WSL kullanılmıyor. **`agent-browser` yerine yerleşik tarayıcı MCP araçlarını kullan** (`mcp__Claude_Browser__preview_start`, `navigate`, `read_page`, `computer`, `read_console_messages`). Aynı doğrulamayı yapar ve bu ortamda çalışır. Önce `agent-browser`'ı denemeye kalkma.

**Mutlu yol**
1. `/panel/demirbaslar` → 35 seed kaydı listeleniyor
2. `/panel/demirbaslar/yeni` → park + tür seç, `count=12`, gönder
3. Başarı mesajında kod aralığı görünüyor ("BANK-0148 – BANK-0159")
4. Listeye dönüldüğünde 47 kayıt var
5. `/panel/etiketler?parkId=<id>` → etiket ızgarası render ediliyor, her etikette QR SVG'si var

**Hata yolları**
- Boş form gönderimi → alan altında Türkçe hata mesajları, sunucu hatası yok
- `count=0` ve `count=101` → doğrulama hatası
- `/panel/demirbaslar/olmayan-id/duzenle` → 404 sayfası, çökme yok
- `/api/assets/olmayan-id/qr` → 404 JSON, HTML hata sayfası değil

**Zorunlu ekran görüntüleri** (`screenshots/` altına kaydet)
- `asama1-demirbas-listesi.png`
- `asama1-toplu-ekleme-basarili.png`
- `asama1-etiket-sayfasi.png`
- `asama1-form-dogrulama-hatasi.png`

**Fiziksel doğrulama (otomatikleştirilemez — kullanıcıya bırak)**
Etiket sayfasını **gerçekten yazdır** ve çıktıdaki QR'ı **gerçek bir telefonla okut.** Doğru URL'e gitmeli. Bu, Aşama 1'in asıl kabul kriteridir ve hiçbir tarayıcı testi yerini tutmaz. Telefon `localhost`'a erişemeyeceği için test sırasında `.env` içindeki `APP_URL`'i makinenin yerel ağ IP'sine ayarla (`http://192.168.x.x:3000`) ve `next dev -H 0.0.0.0` ile çalıştır.

---

## VALIDATION COMMANDS

Her komutu çalıştır; sıfır hata ve tam işlevsellik hedefleniyor.

### Level 1: Sözdizimi ve Stil

```bash
npm run lint
```

```bash
npm run typecheck
```

> `next lint` Next 16'da kaldırıldı — `lint` scripti doğrudan `eslint .` çağırır. `typecheck` öncesinde `npm run typegen` çalıştırılmış olmalı.

### Level 2: Birim Testleri

```bash
npm test
```

### Level 3: Veritabanı ve Seed Bütünlüğü

```bash
npm run db:reset && npm run db:seed
```

```bash
npx prisma validate
```

### Level 4: Manuel Doğrulama

```bash
npm run dev
```

Sırasıyla kontrol et:
1. `http://localhost:3000/panel/demirbaslar` → 35 kayıt
2. `/panel/demirbaslar/yeni` → 12 bank ekle, kod aralığını doğrula
3. `/panel/etiketler?parkId=<id>` → Ctrl+P yazdırma önizlemesi, 3×4 düzen
4. `/api/assets/<id>/qr` → SVG dönüyor
5. Yazdırılan çıktıdaki QR'ı telefonla okut

### Level 5: Tarayıcı Otomasyonu

`agent-browser` **kullanma** (Windows uyumsuzluğu — yukarıdaki E2E bölümüne bak). Bunun yerine:

```
mcp__Claude_Browser__preview_start  → .claude/launch.json içinde "dev" yapılandırması (npm run dev, port 3000)
mcp__Claude_Browser__navigate       → http://localhost:3000/panel/demirbaslar
mcp__Claude_Browser__read_page      → etkileşimli öğeleri listele
mcp__Claude_Browser__computer       → form doldur, gönder
mcp__Claude_Browser__read_console_messages (onlyErrors: true) → konsol hatası olmamalı
```

Ekran görüntülerini `screenshots/` altına kaydet ve yollarını tamamlanma listesine yaz.

### Level 6: Üretim Derlemesi

```bash
npm run build
```

> Derleme, geliştirme sırasında görünmeyen sorunları yakalar: `server-only` ihlalleri, Client/Server Component sınır hataları, native modül paketleme sorunları.

---

## ACCEPTANCE CRITERIA

- [ ] `npm install && npm run db:migrate && npm run db:seed && npm run dev` temiz bir kopyada çalışıyor
- [ ] Seed 1 park ve 35 demirbaş oluşturuyor, tekrar çalıştırıldığında çoğaltmıyor
- [ ] Demirbaş listesi, filtreler ve boş durum mesajı çalışıyor
- [ ] Tekil ve toplu (`count`) ekleme çalışıyor; başarı mesajı kod aralığını gösteriyor
- [ ] 100'lük toplu eklemede kodlar benzersiz, ardışık ve atlamasız — testle kanıtlı
- [ ] Düzenleme çalışıyor; `code` alanı değiştirilemiyor
- [ ] Etiket sayfası A4'te sayfa başına 12 etiket üretiyor, etiketler bölünmüyor
- [ ] Yazdırılan çıktıdaki QR gerçek bir telefonla okunuyor ve `/q/<kod>` adresine gidiyor
- [ ] `GET /api/assets/[id]/qr` SVG dönüyor; geçersiz id'de 404 JSON
- [ ] Tüm kullanıcıya görünen metinler Türkçe
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — hepsi sıfır hatayla geçiyor
- [ ] `src/features/assets/README.md` ve kök `README.md` yazıldı
- [ ] Tarayıcı konsolunda hata yok

---

## COMPLETION CHECKLIST

- [ ] Tüm görevler sırayla tamamlandı
- [ ] Her görevin doğrulaması anında geçti
- [ ] Level 1–4 ve Level 6 komutları başarıyla çalıştırıldı
- [ ] Level 5 tarayıcı doğrulaması geçti (ekran görüntüleri `screenshots/` altında)
- [ ] Fiziksel QR okutma testi yapıldı (kullanıcı onayı gerekli)
- [ ] Tüm kabul kriterleri karşılandı
- [ ] Görev 3'teki `datasource.url` belirsizliğinin çözümü README'ye yazıldı
- [ ] Aşama 2'ye devir notu: `reports` diliminin kullanacağı `getAssetByCode` ve `normalizeAssetCode` hazır

---

## NOTES

### Tasarım kararları

**Neden sayaç tablosu?** `SELECT MAX(code)` yaklaşımı tek kullanıcılı demoda çalışır ama 100'lük toplu eklemede ve eşzamanlı isteklerde çakışır. PRD Bölüm 11 bunu açık bir başarı kriteri yaptığı için doğru çözüm baştan kuruldu. Maliyeti ~15 satır ve bir tablo.

**Neden Server Action, API route değil?** Panel formları için Server Action daha az kod (fetch, JSON serileştirme, hata yakalama yok) ve Next 16'da olgun. Vatandaş bildirimi (Aşama 2) ise gerçek bir API ucu olacak — dış istemciden çağrılabilir olması ve hata sözleşmesinin net olması gerektiği için.

**Neden `HURDA` statüsü, silme değil?** Aşama 2'de bildirimler demirbaşa bağlanacak. Silme, geçmiş bildirimleri yetim bırakır ve PRD'nin temel vaadi olan "demirbaş geçmişi"ni yok eder.

**Neden Prisma mock'lanmıyor?** Test edilen şeyin özü veritabanı davranışı — unique kısıt, atomik increment, transaction. Mock'lanan Prisma bunların hiçbirini doğrulamaz; test yeşil yanar ama üretimde çakışma olur.

### Bilinen riskler

| Risk | Etki | Azaltma |
|---|---|---|
| Prisma 7 kurulum sürtünmesi (`prisma.config.ts`, adapter, import yolu) | Yüksek — v6 alışkanlığıyla yazılırsa hiçbir şey çalışmaz | Görev 3, 5, 8'deki GOTCHA'lar; dokümantasyonu önce oku |
| `better-sqlite3` Windows'ta native derleme | Orta — prebuild yoksa Build Tools gerekir | `npm install` çıktısını izle; başarısızsa Node 22 LTS'e düşmeyi değerlendir |
| Next 16 async `params` | Orta — sessiz tip hataları | `npm run typegen` + `PageProps<>` kullan |
| Yazdırma düzeni tarayıcıya göre kayabilir | Düşük | Chrome'da doğrula; fiziksel çıktı testi zorunlu |
| `agent-browser` Windows'ta çalışmaz | Düşük | Yerleşik tarayıcı MCP araçları kullanılacak (Level 5) |

### Aşama 2'ye devredilenler

`/q/[code]` rotası Aşama 1'de **oluşturulmuyor** — QR'lar bu adrese işaret eder ama sayfa Aşama 2'de yazılır. Aşama 1 doğrulamasında telefonla okutulan QR 404 sayfası gösterecek; bu **beklenen ve doğru** davranıştır. Doğrulanan şey, URL'in doğru kodu taşıdığıdır.

### Sürüm notu

Bu plan şu sürümlere göre doğrulandı (7 Ağustos 2026 itibarıyla npm registry'den okundu): Next.js **16.3.0**, Prisma **7.9.1**, Tailwind **4.3.3**, Zod **4.4.3**, Vitest **4.1.10**, sharp **0.35.3**, qrcode **1.5.4**. Yerel ortam: Node **24.16.0**, npm **11.13.0** — tüm gereksinimleri karşılıyor.

**Confidence Score: 7/10** — Desenler ve görev sırası net, ancak Prisma 7 ve Next.js 16 her ikisi de yakın tarihli büyük sürümler ve eğitim verisindeki kullanımdan belirgin şekilde farklı. Kurulum fazında (Görev 1–8) sürtünme beklenmeli. Kurulum bir kez oturduktan sonra kalan görevlerin ilk denemede geçme olasılığı yüksek.
