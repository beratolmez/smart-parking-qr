# Feature: Aşama 3 — Personel Paneli ve Döngü Kapanışı

Bu plan eksiksiz olacak şekilde yazıldı, ancak **uygulamaya başlamadan önce dokümantasyonu ve kod tabanındaki desenleri doğrula.** Next.js 16 ve Prisma 7 eğitim verisindeki kullanımdan farklı çalışıyor — bu planın "GOTCHA" notlarını atlama. Mevcut util, tip ve model isimlerine dikkat et; `@/features/assets` dilimindeki isimler ve katman akışı **kanonik referanstır**, `@/features/reports` ve `@/features/auth` bunları birebir taklit eder.

---

## Feature Description

Aşama 2'de vatandaş bildirim akışı tamamlandı: `Report` kaydı açılıyor ama **kapatan yok** — `YENI` durumundaki bildirimler sonsuza dek açık kalıyor. Aşama 3, PRD'nin ürün kalbini ekler: **kapanan döngü** (PRD Bölüm 2, İlke 2).

- `features/auth` dilimi: kullanıcı adı + şifre girişi, 2 rol (`SAHA_GOREVLISI`, `YONETICI`), httpOnly imzalı oturum çerezi (JWT, `jose`), `panel/layout.tsx` oturum koruması
- `/giris` giriş sayfası + seed'e 2 demo kullanıcı
- `/panel/bildirimler` — liste, filtreler (durum / park / geciken), tekrar sayacı ve gecikme rozetleri
- `/panel/bildirimler/[id]` — detay: fotoğraflar, demirbaş kartı, demirbaşın geçmiş bildirimleri (son 12 ay, UH-4), olay akışı (timeline), durum geçiş butonları
- **Durum makinesi** `YENI → ATANDI → ONARILDI` · `YENI/ATANDI → REDDEDILDI` — geçersiz geçiş servis katmanında reddedilir (409 `INVALID_TRANSITION`), her geçiş `ReportEvent` olarak kaydedilir (kim/ne zaman/not)
- **`Asset.status` otomatik senkronu**: bildirim açılınca `ARIZALI`, son açık kayıt kapanınca `AKTIF`
- `/q/[code]` personel görünümü — girişli kullanıcı QR okutunca "Onarıldı olarak kapat" ekranı görür (UH-3)
- Rol koruması: `YONETICI` yetkili ekranlar (demirbaş ekleme/düzenleme, etiketler) `SAHA_GOREVLISI`'ne kapalı

## User Story

> **Saha görevlisi** olarak,
> onarımı bitirdiğimde aynı QR'ı okutup kaydı kapatmak istiyorum
> ki **ofise dönüp form doldurmak zorunda kalmayayım ve çözüm süresi otomatik hesaplansın.**

> **Birim yöneticisi** olarak,
> açık bildirimleri filtreleyip demirbaş geçmişini görmek istiyorum
> ki **aynı sorunun tekrar edip etmediğini anlayıp veriyle karar verebileyim.**

## Problem Statement

Aşama 2'nin `Report` kayıtları terminal duruma geçemiyor: `YENI → ... → ONARILDI` makinesi, `ReportEvent` kaydı, personel kimliği ve panel arayüzü yok. PRD'nin temel vaadi — "şikâyeti değil, varlığı kaydediyoruz; onarım QR ile doğrulanır" — ancak döngü kapandığında gerçekleşir. Ayrıca `/panel/*` şu an herkese açık (`src/app/panel/layout.tsx:11` TODO'su) — bu bir güvenlik açığıdır.

## Solution Statement

`features/auth` dikey dilimi (repository/service/session/dal/actions/components) + `ReportEvent` ve `User` modelleri (Prisma migration) + `features/reports` içinde durum makinesi (`transitionReport`) + panel sayfaları (`/panel/bildirimler`, `/panel/bildirimler/[id]`, `/giris`) + `/q/[code]` personel görünümü. Panel CRUD'u **Server Component + Server Action** deseniyle yazılır (kod tabanı konvansiyonu; PRD 10.2'deki `/api/reports*` route'larına **gerek yoktur** — bkz. NOTES). İş kuralları servis katmanında; rol kontrolü hem UI'da hem serviste tekrarlanır (PRD 9.1).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: `prisma/schema.prisma`, `src/core/` (config, errors), `src/features/auth/` (yeni dilim), `src/features/reports/` (durum makinesi), `src/app/panel/*`, `src/app/q/[code]`, `src/app/giris`, `prisma/seed.ts`, `tests/setup.ts`, `package.json`
**Dependencies**: `bcryptjs@^3.0.3` (yeni), `jose@^6.2.8` (yeni); mevcut: zod 4.4, Prisma 7.9, Next 16.3, `server-only`

---

## CONTEXT REFERENCES

### Okunması Zorunlu Proje Dosyaları

Bu dosyaları uygulamaya başlamadan **önce oku**:

- `src/features/assets/actions.ts` (tam dosya, 67 satır) — Server Action deseni: `"use server"`, `z.flattenError(parsed.error).fieldErrors` (satır 16), `AppError` yakalama (satır 25–28), `revalidatePath`. `createAssetsAction`/`updateAssetAction`/`archiveAssetAction`'a rol kontrolü **eklenecek**.
- `src/features/assets/service.ts` (tam dosya, 84 satır) — Servis deseni: `logger.info("domain.action.started")`, `NotFoundError`, transaction'ı servis yönetir (satır 22–31), Prisma'yı doğrudan çağırmaz.
- `src/features/assets/repository.ts` (satır 1–5, 53–64) — Repository deseni: `Prisma.TransactionClient` alan `tx` parametreli fonksiyonlar; `prisma` importu `@/core/db`'den; tip re-export deseni `AssetWithPark` (satır 5).
- `src/features/reports/service.ts` (tam dosya, 67 satır) — `createReport` (satır 19–63): `getAssetByCode` → `findOpenReport` → tekilleştirme/hız sınırı → transaction. **Buraya `transitionReport` eklenecek; `createReport` asset senkronu alacak.**
- `src/features/reports/repository.ts` (tam dosya, 39 satır) — Mevcut `tx` deseni; yeni fonksiyonlar buraya eklenir.
- `src/features/reports/schemas.ts` (satır 1–44) — Zod 4 sözdizimi `{ error: "..." }`, `emptyToUndefined` preprocess (satır 8–10), `CreateReportInput` tipi (satır 37–44). `transitionReportSchema` buraya eklenir.
- `src/features/reports/constants.ts` (tam dosya, 26 satır) — `ISSUE_TYPES as const satisfies readonly IssueType[]` deseni (satır 3–10); `REPORT_STATUSES` listesi buraya eklenir.
- `src/features/reports/photos.ts` (satır 11–36) — `processPhoto` + `savePhoto`; onarım fotoğrafı için **aynen yeniden kullanılır**.
- `src/features/reports/service.test.ts` (tam dosya, 108 satır) — Test deseni: gerçek SQLite, `createTestPark`/`createTestAsset` yardımcıları, `_resetRateLimits()` (satır 35–37), sharp ile test fotoğrafı (satır 19–23).
- `src/app/api/public/reports/route.ts` (satır 28–34) — `File` → `Buffer.from(await file.arrayBuffer())` dönüşümü; Server Action'da aynen tekrarlanır.
- `src/app/panel/layout.tsx` (tam dosya, 35 satır) — `NAV_ITEMS` (satır 4–8), **satır 11'deki `// TODO Aşama 3: oturum kontrolü` burada gerçekleşir**.
- `src/app/panel/demirbaslar/page.tsx` (satır 9–97) — `PageProps<...>` + async `searchParams` (satır 10), GET filtre formu deseni (satır 36–97), `EmptyState` kullanımı. `/panel/bildirimler` bunu taklit eder.
- `src/app/q/[code]/page.tsx` (tam dosya, 57 satır) — Şu an yalnızca vatandaş görünümü; `getOpenReport` (satır 32) ve `ReportForm` (satır 46). **Personel görünümü buraya eklenir.**
- `src/core/config.ts` (satır 4–9) — Zod ile doğrulanmış env; `SESSION_SECRET` buraya eklenir.
- `src/core/errors.ts` (tam dosya, 28 satır) — `AppError` hiyerarşisi; `ForbiddenError` (403) ve `TransitionError` (409) buraya eklenir.
- `tests/setup.ts` (tam dosya, 18 satır) — env ataması + `migrate deploy` + `beforeEach` temizliği. **`SESSION_SECRET` buraya eklenir; `reportEvent` ve `user` temizliği foreign key sırasıyla eklenir.**
- `prisma/schema.prisma` (tam dosya, 112 satır) — `Report` modeli (satır 40–59); `ReportEvent` ve `User` **bu aşamada** eklenir, `Report`'a `events ReportEvent[]` back-relation.
- `prisma/seed.ts` (tam dosya, 66 satır) — `deleteMany` sırası (satır 27–30); kullanıcı + bildirim + olay verisi buraya eklenir.
- `src/shared/format.ts` (tam dosya, 5 satır) — `formatDateTR`; `formatDurationTR` buraya eklenir.
- `src/features/assets/types.ts` (tam dosya, 5 satır) — `ActionState`; **üç-dilim kuralı gereği `src/shared/types.ts`'e taşınır** (assets + reports + auth kullanacak).
- `next.config.ts` (satır 4) — `serverExternalPackages`. `bcryptjs` ve `jose` saf JS'tir — **buraya eklenmez**.
- `vitest.config.ts` (satır 5–10) — `server-only` alias'ı; auth/session testleri bu sayede düz Node'da çalışır.
- `PRD.md` (Bölüm 7.1, satır 347–360) — `User`/`ReportEvent`/`Role` modellerinin kanonik tanımı.
- `PRD.md` (Bölüm 7.2, satır 380–398) — `features/reports` durum makinesi + rol yetki tablosu; `features/auth` rolleri (satır 387–398).
- `PRD.md` (Bölüm 9.1, satır 460–463) — oturum çerezi, panel koruması, "rol kontrolü serviste tekrarlanır".
- `PRD.md` (Bölüm 10.2, satır 549–558) — `PATCH /api/reports/[id]/status` yanıt sözleşmesi: `{ id, ticketNo, status, closedAt, resolutionHours }` ve 409 `INVALID_TRANSITION`.
- `PRD.md` (Bölüm 12, Aşama 3, satır 661–674) — Bu aşamanın çıktıları ve doğrulama kriterleri.
- `PRD.md` (Bölüm 11.2, satır 590–602) — İşlevsel gereksinimler (rol erişimi, kapanma sonrası `AKTIF`).

### Oluşturulacak Yeni Dosyalar

**features/auth/**
- `src/features/auth/constants.ts` — `ROLES`, `ROLE_LABELS`
- `src/features/auth/schemas.ts` — `loginSchema`
- `src/features/auth/repository.ts` — `getUserByUsername`, `getUserById`
- `src/features/auth/service.ts` — `hashPassword` (bcryptjs, cost 12), `authenticate`
- `src/features/auth/session.ts` — `SESSION_COOKIE`, `createSessionToken`/`verifySessionToken` (jose), `createSession`/`destroySession` — `server-only`
- `src/features/auth/dal.ts` — `getCurrentUser` (React `cache` + DB), `requireUser`, `requireRole` — `server-only`
- `src/features/auth/actions.ts` — `loginAction`, `logoutAction`
- `src/features/auth/components/LoginForm.tsx` — giriş formu (Client, `useActionState`)
- `src/features/auth/service.test.ts` — şifre karma + kimlik doğrulama
- `src/features/auth/session.test.ts` — JWT üretme/doğrulama, süre dolumu, kurcalama
- `src/features/auth/README.md`

**features/reports/**
- `src/features/reports/actions.ts` — `transitionReportAction` (Server Action)
- `src/features/reports/components/StatusBadge.tsx` — durum rozeti
- `src/features/reports/components/ReportTable.tsx` — liste tablosu
- `src/features/reports/components/TransitionForm.tsx` — durum geçiş formu (Client, `useActionState`; not + opsiyonel fotoğraf)
- `src/features/reports/components/CloseReportForm.tsx` — QR kapatma formu (Client; TransitionForm'un daraltılmış hali — toStatus sabit `ONARILDI`)

**app/**
- `src/app/giris/page.tsx` — giriş sayfası
- `src/app/panel/bildirimler/page.tsx` — bildirim listesi + filtreler
- `src/app/panel/bildirimler/[id]/page.tsx` — bildirim detayı

**güncellemeler:** `prisma/schema.prisma` (+User, +ReportEvent, +Role enum, Report'e `events`), migration, `src/core/config.ts` (+SESSION_SECRET), `src/core/errors.ts` (+ForbiddenError, +TransitionError), `src/shared/types.ts` (ActionState taşınır), `src/features/assets/types.ts` (silinir), `src/features/assets/actions.ts` (rol kontrolü), `src/features/reports/{constants,schemas,repository,service,service.test}.ts`, `src/app/panel/layout.tsx`, `src/app/q/[code]/page.tsx`, `src/app/panel/demirbaslar/yeni|duzenle|etiketler` (rol kontrolü), `src/shared/format.ts`, `tests/setup.ts`, `prisma/seed.ts`, `.env`, `.env.example`, kök `README.md`, `src/features/reports/README.md`, `package.json` (+bcryptjs, +jose)

### Okunması Zorunlu Dokümantasyon

- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
  - Bölüm "Stateless Sessions" (satır 528–595): jose ile `SignJWT`/`jwtVerify` (HS256), `server-only` kullanımı.
  - Bölüm "Setting cookies" (satır 625–653): `(await cookies()).set('session', ...)` — `httpOnly`, `sameSite: 'lax'`, `path: '/'`.
  - Bölüm "Deleting the session" (satır 773–806): `cookieStore.delete('session')`.
  - Bölüm "Server Actions" (satır 1459–1497): her mutation'da oturum/rol doğrulaması zorunlu.
  - Neden: Bu aşamanın oturum yönetimi birebir bu deseni izler.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` (satır 6, 67–74, 153–194)
  - `cookies()` **async**: `await cookies()` zorunlu; `.set`/`.delete` yalnızca Server Function/Route Handler'da.
  - Neden: `session.ts` bu API'yi kullanır.
- `node_modules/next/dist/docs/01-app/04-functions/forbidden.md` — `forbidden()` ile 403 sayfası (rol korumalı sayfalar için).
- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md` — Server Action'da `File` içeren `FormData` okuma (resim yükleme örneği).
- [jose API — SignJWT / jwtVerify](https://github.com/panva/jose/blob/main/docs/functions/jwt_sign.SignJWT.md)
  - Neden: `setProtectedHeader({ alg: 'HS256' })`, `setExpirationTime('7d')`, `TextEncoder` key.
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — `bcrypt.hash(password, 12)`, `bcrypt.compare` (async). Saf JS, native modül değil.

### Uyulacak Desenler

**Katman akışı** (mevcut kanonik yapı — bozulmaz):

```
page.tsx / actions.ts (Server Action)   ← girdi zod'dan geçer; oturum DAL'dan doğrulanır
        ↓
     service.ts                          ← iş kuralları (durum makinesi, rol); Prisma çağırmaz
        ↓
    repository.ts                        ← yalnızca Prisma; `tx: Prisma.TransactionClient` alan fonksiyonlar
        ↓
     core/db.ts → Prisma
```

**İsimlendirme:** dosya kebab-case, bileşen PascalCase, fonksiyon camelCase İngilizce (`transitionReport`, `getCurrentUser`), enum değerleri SCREAMING_SNAKE Türkçe (`SAHA_GOREVLISI`), kullanıcı metni Türkçe. Log olay adı `{domain}.{action}.{status}`: `auth.login.started`, `report.transition.success`.

**Hata yönetimi** — `src/core/errors.ts`'e eklenir (mevcut `AppError` hiyerarşisi, `errors.ts:1-28`):

```ts
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super("FORBIDDEN", message, 403);
  }
}

export class TransitionError extends AppError {
  constructor(message: string) {
    super("INVALID_TRANSITION", message, 409);
  }
}
```

**Server Action deseni** — `src/features/assets/actions.ts:10-29`:

```ts
"use server";
export async function someAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({ ... });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await service.doSomething(parsed.data);
    revalidatePath("/panel/...");
    return { ok: true, message: "..." };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, message: e.message };
    throw e;
  }
}
```

**Transaction deseni** — servis `prisma.$transaction` yönetir, repository `tx` alır (`assets/repository.ts:53-64`):

```ts
const result = await prisma.$transaction(async (tx) => {
  const report = await repository.getReportById(tx, id);
  // ... doğrulama, rol kontrolü
  const updated = await repository.updateReportStatus(tx, id, data);
  await repository.createReportEvent(tx, { reportId, fromStatus, toStatus, note, actorId });
  return updated;
});
```

**Oturum deseni** — Next.js auth rehberi (satır 566–654) birebir:

```ts
// session.ts — server-only
const encodedKey = new TextEncoder().encode(config.SESSION_SECRET);
export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(encodedKey);
}
export async function verifySessionToken(token: string | undefined) {
  try { const { payload } = await jwtVerify(token ?? "", encodedKey, { algorithms: ["HS256"] }); return payload; } catch { return null; }
}
export async function createSession(user: User) {
  const token = await createSessionToken({ userId: user.id, role: user.role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}
```

**DAL deseni** — Next.js auth rehberi (satır 1137–1153) + role varyantı:

```ts
import { cache } from "react";
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return authRepository.getUserById(payload.userId); // güncel rol DB'den
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

export async function requireRole(role: Role): Promise<User> {
  const user = await requireUser();
  if (user.role !== role) forbidden(); // Next 16 `forbidden()` → 403 sayfası
  return user;
}
```

**Filtre formu deseni** — `src/app/panel/demirbaslar/page.tsx:36-97` (GET form + `select` + `PageProps` searchParams).

**Anti-desenler — yapma:**

- ❌ `cookies()`'i `await` etmeden kullanma — Next 16'da async; senkron erişim çalışmaz
- ❌ Çerezi Server Component render'ı sırasında `.set`/`.delete` ile değiştirme — yalnızca Server Action/Route Handler'da (cookies.md satır 81)
- ❌ Şifreyi düz metin tutma/loglama — `bcryptjs` cost 12; kullanıcıya "kullanıcı adı veya şifre hatalı" genel mesajı (hangisinin yanlış olduğu söylenmez)
- ❌ JWT payload'ına şifre/telefon koyma — yalnızca `{ userId, role }` minimum veri (auth rehberi satır 623)
- ❌ Durum geçişini UI'da doğrulayıp servise güvenme — makine servis katmanında; UI'a güvenilmez (PRD 6.4)
- ❌ `bcryptjs`/`jose`'i `serverExternalPackages`'a ekleme — saf JS, gereksiz
- ❌ `Object.fromEntries(formData)` ile File doğrulama — File bozulur; alanları tek tek `formData.get()` ile çek (public reports route:10-16 deseni)
- ❌ `params`/`searchParams`'ı senkron kullanma — Next 16'da Promise
- ❌ Bildirim silme ekleme — `REDDEDILDI` bile silmez, istatistikte ayrı tutulur (PRD 9.2)
- ❌ `createdAt`'i elle set etme — Prisma `@default(now())`; seed'de geçmiş tarih gerekiyorsa `createMany` data'sında `createdAt` alanına değer verilir

---

## IMPLEMENTATION PLAN

### Phase 1: Temel (Foundation)

Veri modeli (`User`, `ReportEvent`, `Role`), migration, config (`SESSION_SECRET`), hata sınıfları, `ActionState` taşıma, `formatDurationTR`, test setup güncellemesi, bağımlılık kurulumu. Bu faz bitmeden özellik kodu yazılmaz.

### Phase 2: Çekirdek Uygulama — `features/auth`

constants → schemas → repository → service (bcrypt) → session (jose) → dal → actions → LoginForm + testler. Tümü arayüzsüz test edilebilir.

### Phase 3: Çekirdek Uygulama — `features/reports` durum makinesi

constants/schemas güncellemesi → repository fonksiyonları → `transitionReport` servisi + `createReport` asset senkronu → servis testleri.

### Phase 4: Entegrasyon (UI)

`panel/layout.tsx` koruma + nav, `/giris`, `/panel/bildirimler`, `/panel/bildirimler/[id]`, `reports/actions.ts`, `/q/[code]` personel görünümü, rol kapıları (demirbaş sayfaları + asset actions).

### Phase 5: Seed ve Dokümantasyon

Seed'e kullanıcı + bildirim + olay + fotoğraf verisi; README'ler.

### Phase 6: Doğrulama

`typegen`, lint, typecheck, test, build, E2E (agent-browser).

---

## STEP-BY-STEP TASKS

IMPORTANT: Her görevi sırayla, yukarıdan aşağıya uygula. Her görev atomiktir ve bağımsız doğrulanabilir.

---

### T1 — CREATE `src/features/auth/constants.ts`

- **IMPLEMENT**: `ROLES` listesi + `ROLE_LABELS` haritası. `as const satisfies readonly Role[]` deseni.
- **PATTERN**: `src/features/reports/constants.ts:3-10` (enum liste deseni).
- **IMPORTS**: `import type { Role } from "@/generated/prisma/enums";`
- **GOTCHA**: `Role` enum'ı ancak T2 migration'ından sonra generated client'ta olur — dosya yazılabilir ama T3'e kadar typecheck geçmez; sıralama bilinçlidir.
- **VALIDATE**: `npm run typecheck` (T2'den sonra geçer)

### T2 — UPDATE `prisma/schema.prisma` + migration

- **IMPLEMENT**: PRD 7.1'deki kanonik modeller (PRD.md:347-360):

```prisma
model User {
  id           String        @id @default(cuid())
  username     String        @unique
  passwordHash String
  fullName     String
  role         Role
  events       ReportEvent[]
  createdAt    DateTime      @default(now())
}

model ReportEvent {
  id         String        @id @default(cuid())
  report     Report        @relation(fields: [reportId], references: [id])
  reportId   String
  fromStatus ReportStatus?
  toStatus   ReportStatus
  note       String?
  actor      User?         @relation(fields: [actorId], references: [id])
  actorId    String?
  createdAt  DateTime      @default(now())
}

enum Role { SAHA_GOREVLISI YONETICI }
```

- **IMPLEMENT**: `Report` modeline `events ReportEvent[]` back-relation ekle (`schema.prisma:40-59` içine).
- **IMPLEMENT**: Migration'ı üret: `npx prisma migrate dev --name add_auth` (ve `npm run db:generate`).
- **GOTCHA**: Prisma 7 — `prisma.config.ts` datasource'tan gelir; `schema.prisma`'da `url` YOKTUR.
- **VALIDATE**: `npx prisma validate && npm run typecheck`

### T3 — UPDATE `src/core/config.ts`

- **IMPLEMENT**: `SESSION_SECRET` ekle (zorunlu, min 32):

```ts
SESSION_SECRET: z.string().min(32, { error: "SESSION_SECRET en az 32 karakter olmalı." }),
```

- **GOTCHA**: Zorunlu alan — eksikse uygulama açılışta patlar (PRD 9.4). `.env` ve `.env.example`'a da ekle (örnek: `openssl rand -base64 32` çıktısı).
- **VALIDATE**: `npm run typecheck`

### T4 — UPDATE `src/core/errors.ts`

- **IMPLEMENT**: `ForbiddenError` (403 `FORBIDDEN`) ve `TransitionError` (409 `INVALID_TRANSITION`) ekle — "Uyulacak Desenler" bölümündeki snippet birebir.
- **VALIDATE**: `npm run typecheck`

### T5 — UPDATE `tests/setup.ts`

- **IMPLEMENT**: Env bloklarına `process.env.SESSION_SECRET = "test-session-secret-32-karakter-minimum"` ekle (satır 4-7 arasına).
- **IMPLEMENT**: `beforeEach` temizliğini foreign key sırasıyla genişlet (satır 11-17):

```ts
await prisma.reportEvent.deleteMany();
await prisma.report.deleteMany();
await prisma.user.deleteMany();
await prisma.reportCounter.deleteMany();
await prisma.asset.deleteMany();
await prisma.park.deleteMany();
await prisma.assetCodeCounter.deleteMany();
```

- **GOTCHA**: Sıra kritik — `reportEvent` → `report` → `user` (user'a bağlanan `actorId`'ler önce silinir).
- **VALIDATE**: `npm test` (mevcut testler geçmeli)

### T6 — UPDATE `src/shared/format.ts` (+ActionState taşıma)

- **IMPLEMENT**: `formatDurationTR(ms: number): string` ekle — `"2 gün 4 saat"`, `"3 gün"`, `"5 saat"`, `"45 dakika"` (gün ≥ 1 ise saat kısmı yuvarlanır/atlanır; dakika altı `"1 saatten az"`). `resolutionHours`/çözüm süresi gösterimi için.
- **IMPLEMENT**: `src/shared/types.ts` oluştur: `ActionState` arayüzünü `src/features/assets/types.ts`'ten taşı (3. dilim olan auth/reports kullanacak).
- **IMPLEMENT**: `src/features/assets/types.ts`'i sil; `src/features/assets/actions.ts` ve `AssetForm.tsx` importlarını `@/shared/types`'a çevir.
- **PATTERN**: importlar `@/shared/...` yolunu kullanır (`src/shared/ui/Button.tsx`).
- **VALIDATE**: `npm run typecheck && npm test`

### T7 — CREATE `src/features/auth/schemas.ts`

- **IMPLEMENT**: `loginSchema`:

```ts
export const loginSchema = z.object({
  username: z.string({ error: "Kullanıcı adı gerekli." }).min(1, { error: "Kullanıcı adı gerekli." }).max(50, { error: "Kullanıcı adı çok uzun." }),
  password: z.string({ error: "Şifre gerekli." }).min(1, { error: "Şifre gerekli." }).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;
```

- **VALIDATE**: `npm run typecheck`

### T8 — CREATE `src/features/auth/repository.ts`

- **IMPLEMENT**: `getUserByUsername(username): Promise<User | null>`, `getUserById(id): Promise<User | null>` — `prisma.user.findUnique`.
- **PATTERN**: `src/features/assets/repository.ts:19-25` (findUnique deseni).
- **IMPORTS**: `import { prisma } from "@/core/db"; import type { User } from "@/generated/prisma/client";`
- **VALIDATE**: `npm run typecheck`

### T9 — CREATE `src/features/auth/service.ts`

- **IMPLEMENT**: `hashPassword(plain: string): Promise<string>` — `bcrypt.hash(plain, BCRYPT_COST)`; `authenticate(username, password): Promise<User>` — kullanıcıyı bul, `bcrypt.compare`, başarısızsa `ValidationError("Kullanıcı adı veya şifre hatalı.")` (hangi alanın yanlış olduğu söylenmez). Loglar: `auth.login.started` / `auth.login.success` / `auth.login.failed`.
- **PATTERN**: `src/features/reports/service.ts:19-20` (log deseni); `NotFoundError` yerine `ValidationError` — kullanıcı var/yok bilgisi sızdırılmaz.
- **IMPORTS**: `import bcrypt from "bcryptjs";` — v3'te varsayılan export; ESM'de `import bcrypt from "bcryptjs"` çalışır (CJS interop, `esModuleInterop: true` tsconfig'de).
- **GOTCHA**: cost 12 ~300-500ms — kabul edilir (demo + güvenlik). Testlerde az sayıda hash çağrısı var, süre sorun değil.
- **VALIDATE**: `npm run typecheck`

### T10 — CREATE `src/features/auth/session.ts`

- **IMPLEMENT**: `import "server-only";` → `SESSION_COOKIE = "session"`; `SessionPayload = { userId: string; role: Role }`; `createSessionToken`/`verifySessionToken` (jose, HS256, 7 gün); `createSession(user)` → `(await cookies()).set(...)` httpOnly/sameSite lax/secure prod; `destroySession()` → `cookieStore.delete(SESSION_COOKIE)`.
- **PATTERN**: "Uyulacak Desenler" → Oturum deseni snippet'i birebir (Next auth rehberi satır 566-654, 781-784).
- **IMPORTS**: `import { SignJWT, jwtVerify } from "jose"; import { cookies } from "next/headers"; import { config } from "@/core/config";`
- **GOTCHA**: `jwtVerify` hata fırlatır — `try/catch` ile `null` döndür (rehber satır 582-591). `verifySessionToken` asla throw etmez.
- **VALIDATE**: `npm run typecheck` (vitest testleri T12'de)

### T11 — CREATE `src/features/auth/dal.ts`

- **IMPLEMENT**: `import "server-only";` → `getCurrentUser` (React `cache`, çerezi oku → token doğrula → `authRepository.getUserById`), `requireUser` (yoksa `redirect("/giris")`), `requireRole(role)` (rol uymazsa `forbidden()`).
- **PATTERN**: "Uyulacak Desenler" → DAL deseni snippet'i (Next auth rehberi satır 1137-1153).
- **IMPORTS**: `import { cache } from "react"; import { redirect, forbidden } from "next/navigation";`
- **GOTCHA**: `forbidden()` Next 16'da mevcut (403 sayfası üretir) — docs'a bak: `node_modules/next/dist/docs/01-app/04-functions/forbidden.md`. `getCurrentUser` rolü DB'den tazeler (JWT rolüne güvenilmez) — kullanıcı rolü değişirse oturum anında etki eder.
- **VALIDATE**: `npm run typecheck`

### T12 — CREATE `src/features/auth/service.test.ts` + `session.test.ts`

- **IMPLEMENT** `service.test.ts`: `hashPassword` + `authenticate` başarılı (doğru şifre → user döner, rol doğru), yanlış şifre → `ValidationError`, olmayan kullanıcı → `ValidationError` (aynı mesaj), `authenticate` sonrası `bcrypt.compare` ile doğrula.
- **IMPLEMENT** `session.test.ts`: `createSessionToken`/`verifySessionToken` roundtrip (userId/role korunur), süresi dolmuş token (`setExpirationTime("1s")` + gerçek bekleyiş yerine — **saat enjeksiyonu yoksa basit yol**: payload'ı elle üretip `jwtVerify`'a bozuk imza/geçersiz token vererek `null` dönüşü test et; tam süre testi için `new SignJWT(payload).setExpirationTime("-1s")` ile geçmiş süreli token üret), kurcalanmış token → `null`.
- **PATTERN**: `src/features/reports/service.test.ts:1-8` (importlar, `describe`/`it`); test DB'de kullanıcı oluşturmak için `prisma.user.create` kullanılır (servisi değil — `hashPassword`'u çağırıp hash'i yaz).
- **GOTCHA**: `session.test.ts` yalnızca jose + config kullanır — `next/headers` import etmez (vitest'te çalışmaz); `createSession`/`destroySession` (cookies çağıranlar) test EDİLMEZ, sadece token fonksiyonları. `beforeEach`'te `prisma.user.deleteMany()` zaten setup'ta.
- **VALIDATE**: `npx vitest run src/features/auth/service.test.ts src/features/auth/session.test.ts`

### T13 — CREATE `src/features/auth/actions.ts`

- **IMPLEMENT**: `"use server";` → `loginAction(_prev, formData)` — `loginSchema.safeParse` → `authService.authenticate` → `session.createSession(user)` → `redirect("/panel")`. Başarıda `ActionState` dönülmez (redirect). `logoutAction()` — `destroySession()` → `redirect("/giris")`.
- **PATTERN**: `src/features/assets/actions.ts:10-29` (parse + flattenError + AppError yakalama).
- **IMPORTS**: `import { redirect } from "next/navigation";` `import type { ActionState } from "@/shared/types";`
- **GOTCHA**: login'de kullanıcı bilgisi sızdıran mesaj verme — `ValidationError`'ın Türkçe mesajı doğrudan gösterilir.
- **VALIDATE**: `npm run typecheck`

### T14 — CREATE `src/features/auth/components/LoginForm.tsx`

- **IMPLEMENT**: Client Component; `useActionState(loginAction, INITIAL_STATE)`; username + password input (`min-h-11`, `type="password"`), submit (`pending` iken "Giriş yapılıyor…"); hata `<p role="status" aria-live="polite">`.
- **PATTERN**: `src/features/assets/components/AssetForm.tsx:30-36,214-222` (useActionState + hata mesajı deseni).
- **VALIDATE**: `npm run typecheck`

### T15 — CREATE `src/app/giris/page.tsx`

- **IMPLEMENT**: Sunucu bileşeni. `const user = await getCurrentUser(); if (user) redirect("/panel");` → başlık + `LoginForm` + ana sayfaya dön linki.
- **PATTERN**: `src/app/panel/demirbaslar/yeni/page.tsx` (basit sayfa deseni).
- **VALIDATE**: `npm run typecheck`

### T16 — UPDATE `src/features/reports/constants.ts`

- **IMPLEMENT**: `REPORT_STATUSES = ["YENI", "ATANDI", "ONARILDI", "REDDEDILDI"] as const satisfies readonly ReportStatus[]`; `OVERDUE_DAYS = 7`; `ALLOWED_TRANSITIONS` haritası:

```ts
export const ALLOWED_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  YENI: ["ATANDI", "REDDEDILDI"],
  ATANDI: ["ONARILDI", "REDDEDILDI"],
  ONARILDI: [],
  REDDEDILDI: [],
};
```

- **VALIDATE**: `npm run typecheck`

### T17 — UPDATE `src/features/reports/schemas.ts`

- **IMPLEMENT**: `transitionReportSchema` (multipart form alanları):

```ts
export const transitionReportSchema = z.object({
  reportId: z.string().min(1, { error: "Geçersiz istek." }),
  toStatus: z.enum(REPORT_STATUSES, { error: "Geçerli bir durum seçin." }),
  note: emptyToUndefined(z.string().max(500, { error: "Not en fazla 500 karakter olabilir." })),
  photo: z.instanceof(File, { error: "Geçersiz dosya." }).optional()
    .refine((f) => !f || ALLOWED_PHOTO_TYPES.includes(f.type), { error: "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz." })
    .refine((f) => !f || f.size <= MAX_PHOTO_BYTES, { error: "Fotoğraf en fazla 10 MB olabilir." }),
});
export type TransitionReportForm = z.infer<typeof transitionReportSchema>;

export interface TransitionReportInput {
  toStatus: ReportStatus;
  note?: string;
  resolvedPhoto?: Buffer;
}

export const reportFilterSchema = z.object({
  status: emptyToUndefined(z.enum(REPORT_STATUSES)),
  parkId: emptyToUndefined(z.string()),
  overdue: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});
export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
```

- **GOTCHA**: `photo` File optional — `formData.get("photo")` null dönünce `?? undefined` ile parse'a ver (public reports route:10-16 deseni). `emptyToUndefined`'ı bu dosyaya kopyala (zaten var — satır 8-10).
- **VALIDATE**: `npm run typecheck`

### T18 — UPDATE `src/features/reports/repository.ts`

- **IMPLEMENT** (hepsi mevcut dosyaya; `tx` alanlar transaction içinde):

```ts
export async function listReports(filter: ReportFilterInput): Promise<ReportWithAsset[]> // prisma.report.findMany, where: { status, asset: { parkId } }, overdue → { status: { in: ["YENI","ATANDI"] }, createdAt: { lt: now-7d } }, include: { asset: { include: { park: true } } }, orderBy: { createdAt: "desc" }

export async function getReportById(tx: Prisma.TransactionClient, id: string) // include asset.park + events(actor), events orderBy createdAt asc

export async function listReportsByAsset(assetId: string, since: Date) // report.findMany({ where: { assetId, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } })

export async function updateReportStatus(tx, id, data: Prisma.ReportUpdateInput) // tx.report.update

export async function createReportEvent(tx, data: { reportId, fromStatus?, toStatus, note?, actorId? }) // tx.reportEvent.create

export async function countOpenReports(tx, assetId) // count where { assetId, status: { in: ["YENI","ATANDI"] } }

export async function setAssetStatus(tx, assetId, status: AssetStatus) // tx.asset.update — senkron için
```

- **IMPLEMENT**: `ReportWithAsset = Report & { asset: AssetWithPark }` tipi (`assets/repository.ts:5` deseninden; `AssetWithPark`'ı `@/features/assets/repository`'den import etme — çapraz dilim tip bağımlılığını önlemek için `{ asset: Asset & { park: Park } }` inline tanımla).
- **PATTERN**: `src/features/assets/repository.ts:53-64` (tx parametre deseni); `Prisma.TransactionClient` importu `@/generated/prisma/client`'tan.
- **GOTCHA**: `getReportById`'nin `events.actor` include'u — `actor: { select: { id: true, fullName: true, username: true } }` (şifre sızmaz; DTO prensibi).
- **VALIDATE**: `npm run typecheck`

### T19 — UPDATE `src/features/reports/service.ts` — durum makinesi

- **IMPLEMENT**: `transitionReport(reportId, input: TransitionReportInput, actor: User): Promise<Report>`:

```ts
export async function transitionReport(reportId: string, input: TransitionReportInput, actor: User): Promise<Report> {
  logger.info("report.transition.started", { reportId, toStatus: input.toStatus });
  return prisma.$transaction(async (tx) => {
    const report = await repository.getReportById(tx, reportId);
    if (!report) throw new NotFoundError("Bildirim bulunamadı.");
    if (!ALLOWED_TRANSITIONS[report.status].includes(input.toStatus)) {
      throw new TransitionError(`${report.status} durumundaki bir kayıt ${input.toStatus} yapılamaz.`);
    }
    if (input.toStatus === "REDDEDILDI" && actor.role !== "YONETICI") {
      throw new ForbiddenError("Yalnızca yönetici bildirimi reddedebilir.");
    }

    let resolvedPhoto: string | undefined;
    if (input.resolvedPhoto) resolvedPhoto = await savePhoto(input.resolvedPhoto); // processPhoto çağıran: route/action buffer'ı hazırlar — SADECE Buffer geldiyse; photos.ts deseni

    const closedAt = input.toStatus === "ONARILDI" || input.toStatus === "REDDEDILDI" ? new Date() : undefined;
    const updated = await repository.updateReportStatus(tx, reportId, {
      status: input.toStatus, resolutionNote: input.note, resolvedPhoto, closedAt,
    });
    await repository.createReportEvent(tx, {
      reportId, fromStatus: report.status, toStatus: input.toStatus,
      note: input.note, actorId: actor.id,
    });
    // Asset senkronu: son açık kayıt kapandıysa ve şu an ARIZALI ise → AKTIF
    const openCount = await repository.countOpenReports(tx, report.assetId);
    if (openCount === 0) {
      await tx.asset.updateMany({ where: { id: report.assetId, status: "ARIZALI" }, data: { status: "AKTIF" } });
    }
    logger.info("report.transition.success", { reportId, toStatus: input.toStatus, eventId: "created" });
    return updated;
  });
}
```

- **IMPLEMENT**: `listReports(filter: ReportFilterInput)`, `getReport(id)` (NotFound), `getReportAssetHistory(assetId, months = 12)` → `repository.listReportsByAsset(assetId, new Date(Date.now() - months*30*24*60*60*1000))`.
- **IMPLEMENT**: `createReport` içinde **yeni kayıt** dalında asset'i `ARIZALI` yap — transaction içinde `repository.setAssetStatus(tx, asset.id, "ARIZALI")` (mevcut `service.ts:39-56` transaction bloğunun içine; duplicate dalı zaten açık kayıt olduğu için asset zaten ARIZALI'dır).
- **GOTCHA**: `resolutionNote`/`resolvedPhoto` **kapalı durumlarda** set edilir; `closedAt` yalnızca terminal durumlarda. `updateMany` + `status: "ARIZALI"` koşulu: personelin elle verdiği `BAKIMDA`/`HURDA` durumunu ezmez (NOTES'e bak).
- **VALIDATE**: `npm run typecheck`

### T20 — UPDATE `src/features/reports/service.test.ts` — durum makinesi testleri

- **IMPLEMENT** yeni `describe("reportService.transitionReport")` blokları:
  - `YENI → ATANDI`: geçerli, `ReportEvent` oluşur (`fromStatus YENI`, `toStatus ATANDI`, `actorId` doğru), `status` güncellenir
  - `ATANDI → ONARILDI`: `closedAt` set olur, `resolutionNote` yazılır, asset `AKTIF`'e döner, 2. event (`YENI→ATANDI` + `ATANDI→ONARILDI`) kayıtlıdır
  - `YENI → ONARILDI` (geçersiz): `TransitionError` fırlar, event oluşmaz
  - `ONARILDI → YENI` (geçersiz): `TransitionError`
  - `YENI → REDDEDILDI` `SAHA_GOREVLISI` actor ile: `ForbiddenError`
  - `YENI → REDDEDILDI` `YONETICI` actor ile: başarılı, asset `AKTIF`'e döner
  - Olmayan reportId: `NotFoundError`
- **IMPLEMENT** `describe("reportService.createReport")`'e: yeni kayıt sonrası `asset.status === "ARIZALI"` doğrulaması (1 test).
- **IMPLEMENT** yardımcılar: `createTestUser(role)` (bcryptsiz — `passwordHash`'e `"hash"` yaz, zaten kullanılmıyor), `createTestReport()` (servis üzerinden `createReport`).
- **GOTCHA**: `transitionReport`'u çağıran testler `_resetRateLimits()`'e ihtiyaç duymaz ama mevcut `beforeEach` (satır 35-37) korunur. Fotoğraflı geçiş testi için `testPhoto()` (satır 19-23) yeniden kullanılır.
- **VALIDATE**: `npx vitest run src/features/reports/service.test.ts`

### T21 — CREATE `src/features/reports/actions.ts`

- **IMPLEMENT**: `"use server";` → `transitionReportAction(_prev, formData)`:

```ts
const parsed = transitionReportSchema.safeParse({
  reportId: formData.get("reportId"),
  toStatus: formData.get("toStatus"),
  note: formData.get("note") ?? undefined,
  photo: formData.get("photo") ?? undefined,
});
```

- **IMPLEMENT**: parse → `const actor = await requireUser();` → `photo` varsa `Buffer.from(await photo.arrayBuffer())` + `processPhoto` (photos.ts:11-28) → `service.transitionReport(...)` → `revalidatePath("/panel/bildirimler")`; `toStatus === "ONARILDI" || "REDDEDILDI"` ise `revalidatePath("/panel/bildirimler/" + id)` ve q sayfası için ilgili asset kodu: `getReport(id)` → `revalidatePath(\`/q/${report.asset.code}\`)` → `{ ok: true, message: "Bildirim durumu güncellendi." }`.
- **PATTERN**: `src/features/assets/actions.ts:10-29` + `src/app/api/public/reports/route.ts:28-29` (File→Buffer).
- **GOTCHA**: `getReport`'un döndürdüğü `report.asset` tipi `ReportWithAsset` — `asset.code` erişimi için include doğru olmalı (T18). AppError → `{ ok: false, message }`; **hiçbir hata rethrow edilmez** (auth'suz çağrıda `redirect` zaten halletmiş olur — `requireUser` redirect fırlatır; `redirect` hatası yakalanmaz çünkü `AppError` değil).
- **VALIDATE**: `npm run typecheck`

### T22 — CREATE `src/features/reports/components/StatusBadge.tsx`

- **IMPLEMENT**: Server-bileşen (client gerekmez) — `status: ReportStatus` prop, `REPORT_STATUS_LABELS` ile etiket, renk sınıfları: YENI → amber, ATANDI → blue, ONARILDI → green, REDDEDILDI → red (zincir: `bg-amber-100 text-amber-800` tarzı, dark varyantlarıyla).
- **VALIDATE**: `npm run typecheck`

### T23 — CREATE `src/features/reports/components/ReportTable.tsx`

- **IMPLEMENT**: `reports: ReportWithAsset[]` — kolonlar: Takip No (`#123`), Demirbaş (`asset.code` + tür etiketi), Park, Sorun (`ISSUE_TYPE_LABELS`), Durum (`StatusBadge`), Tekrar rozeti (`duplicateCount > 1` → "N kişi bildirdi" amber rozet), Gecikme rozeti (`isOverdue` prop olarak alınır — 7+ gün), Tarih (`formatDateTR`), satır linki → `/panel/bildirimler/[id]`.
- **PATTERN**: `src/features/assets/components/AssetTable.tsx` (tablo yapısı, `overflow-x-auto`, `min-w-max`, koyu mod sınıfları).
- **IMPORTS**: `formatDateTR` `@/shared/format`.
- **VALIDATE**: `npm run typecheck`

### T24 — CREATE `src/app/panel/bildirimler/page.tsx`

- **IMPLEMENT**: `PageProps<"/panel/bildirimler">`; `await props.searchParams`; `reportFilterSchema.parse(...)` (parklar için `assetService.listParks()`); `Promise.all([reportService.listReports(filter), ...])`; GET filtre formu (durum select + park select + "Gecikenler" checkbox + Filtrele butonu); sonuç: `EmptyState("Henüz bildirim yok.")` veya `ReportTable` (+ her satıra `isOverdue` hesabı: `status in (YENI, ATANDI) && Date.now() - createdAt > 7*24*60*60*1000`).
- **PATTERN**: `src/app/panel/demirbaslar/page.tsx:9-105` (sayfa iskeleti, filtre formu, EmptyState).
- **GOTCHA**: checkbox `overdue` value'su `"true"` — `reportFilterSchema` transform'u (T17) zaten `boolean` yapar.
- **VALIDATE**: `npm run typegen && npm run typecheck`

### T25 — CREATE `src/app/panel/bildirimler/[id]/page.tsx`

- **IMPLEMENT**: `PageProps<"/panel/bildirimler/[id]">`; `await props.params`; `const [report, history] = await Promise.all([reportService.getReport(id).catch(NotFound→null), reportService.getReportAssetHistory(assetId)])` — `report` null ise `notFound()`. Bölümler:
  - Üst: `#ticketNo` başlık + `StatusBadge` + tekrar sayacı + oluşturma/kapanma tarihi (`formatDateTR`) + çözüm süresi (ONARILDI ise `formatDurationTR(closedAt - createdAt)`)
  - Fotoğraflar: `report.photoUrl` ve `report.resolvedPhoto` (`<img>` ile, eslint-disable comment — `ReportForm.tsx:202-204` deseni)
  - Demirbaş kartı: `asset.code`, tür, `asset.park.name`, `asset.status` (asset dilimi label'ları), konum (lat/long varsa Google Maps linki)
  - Geçmiş bildirimler (son 12 ay): `history.map` — tarih + `ISSUE_TYPE_LABELS` + `StatusBadge` ("Bu demirbaş için son 12 ayda N bildirim" başlığı)
  - Olay akışı (timeline): `report.events` — `actor.fullName`, `fromStatus→toStatus` (`REPORT_STATUS_LABELS`), `note`, tarih
  - Geçiş butonları: `TransitionForm` (T26) — `report.status`'a göre `ALLOWED_TRANSITIONS` üzerinden butonlar: `ATANDI` → "Üstlen", `ONARILDI` → "Onarıldı olarak kapat", REDDEDILDI → "Reddet" (yalnızca `actor.role === "YONETICI"` ise; `getCurrentUser()` ile)
- **PATTERN**: `src/app/panel/demirbaslar/[id]/duzenle/page.tsx:6-17` (params + NotFoundError → notFound deseni).
- **GOTCHA**: `getReport`'un include'unda `asset` ve `events.actor` eksikse UI kırılır — T18'in `ReportWithAsset` tanımına sadık kal.
- **VALIDATE**: `npm run typegen && npm run typecheck`

### T26 — CREATE `src/features/reports/components/TransitionForm.tsx`

- **IMPLEMENT**: Client Component. Props: `reportId`, `status`, `canReject: boolean`, `assetCode` (başarı sonrası link için). `useActionState(transitionReportAction, INITIAL_STATE)`; `hidden input` reportId; `select` (hedef durumlar `ALLOWED_TRANSITIONS[status]` filtreli — `REDDEDILDI` yalnızca `canReject`), `textarea` not (opsiyonel), `input type="file"` (opsiyonel, `accept="image/jpeg,image/png,image/webp"`), submit (`pending` "Kaydediliyor…"); başarı mesajı yeşil (`state.ok`).
- **PATTERN**: `src/features/assets/components/AssetForm.tsx:30-36,214-227`; dosya inputu `src/features/reports/components/ReportForm.tsx:193-211`.
- **VALIDATE**: `npm run typecheck`

### T27 — CREATE `src/features/reports/components/CloseReportForm.tsx`

- **IMPLEMENT**: Client Component — `TransitionForm`'un sabit `ONARILDI` varyantı: props `{ reportId, ticketNo }`; görünür text: "Açık bildirim: #{ticketNo} — Onarıldı olarak kapat"; not textarea + opsiyonel onarım fotoğrafı + submit; hidden `toStatus=ONARILDI`. FormData'yı `transitionReportAction`'a gönderir (ayrı action yok).
- **PATTERN**: `src/features/reports/components/ReportForm.tsx:121-233` (form yapısı).
- **VALIDATE**: `npm run typecheck`

### T28 — UPDATE `src/app/q/[code]/page.tsx` — personel görünümü

- **IMPLEMENT**: `getCurrentUser()` çağır. `user` yoksa mevcut vatandaş görünümü; **user varsa** ve `openReport` mevcutsa: demirbaş kartı + `CloseReportForm reportId={openReport.id} ticketNo={openReport.ticketNo}`; açık kayıt yoksa "Bu demirbaşta açık bildirim yok." + asset bilgisi (akış: `src/app/q/[code]/page.tsx:32-54` korunur, yeni dal eklenir).
- **GOTCHA**: `getOpenReport` (reports/service.ts:65) yeniden kullanılır. Sayfa cookie okuduğu için dynamic render olur — cache sorunu yok.
- **VALIDATE**: `npm run typecheck`

### T29 — UPDATE `src/app/panel/layout.tsx`

- **IMPLEMENT**: `const user = await requireUser();` (TODO satır 11'i değiştirir). Header'a: `user.fullName` + `ROLE_LABELS[user.role]` + `<form action={logoutAction}><button>Çıkış</button></form>` (Server Component'te form action direkt çalışır). `NAV_ITEMS`'e `{ href: "/panel/bildirimler", label: "Bildirimler" }` ekle (satır 4-8).
- **PATTERN**: `src/app/panel/layout.tsx:10-34` (mevcut iskelet korunur).
- **GOTCHA**: Layout `cookies()` okur → tüm `/panel/*` dinamik olur (kabul — Next auth rehberi satır 1348-1358'deki layout uyarısı MVP için kabul edilir; veri erişimi yine de sayfada). Logout butonu için ayrı client bileşen gerekmez — `<form action={serverAction}>` server bileşende geçerli.
- **VALIDATE**: `npm run typecheck`

### T30 — UPDATE rol kapıları (demirbaş sayfaları + asset actions)

- **IMPLEMENT** `src/app/panel/demirbaslar/yeni/page.tsx` (satır 1-13): en üste `await requireRole("YONETICI");`
- **IMPLEMENT** `src/app/panel/demirbaslar/[id]/duzenle/page.tsx` (satır 6-17): en üste `await requireRole("YONETICI");`
- **IMPLEMENT** `src/app/panel/etiketler/page.tsx` (satır 6-17): en üste `await requireRole("YONETICI");`
- **IMPLEMENT** `src/features/assets/actions.ts`: `createAssetsAction`, `updateAssetAction`, `archiveAssetAction` başlarına `await requireRole("YONETICI");` (satır 10, 31, 53) — PRD 9.1 "rol kontrolü serviste de tekrarlanır" ilkesi; `requireRole` `forbidden()` fırlatır → action çağrısında 403 sayfası. `import { requireRole } from "@/features/auth/dal";`
- **GOTCHA**: `requireRole` (dal.ts) `redirect`/`forbidden` kullanır — bunlar `AppError` değildir; mevcut `catch (e instanceof AppError)` blokları bunları yakalamaz (zaten istenen davranış). assets dilimi artık auth'a bağımlı — dairesel import YOKTUR (auth, assets'i import etmez).
- **VALIDATE**: `npm run typecheck && npm test`

### T31 — UPDATE `prisma/seed.ts`

- **IMPLEMENT**: Temizlik sırası (satır 27-30) şuna genişler: `reportEvent`, `report`, `user`, `reportCounter`, `asset`, `park`, `assetCodeCounter` (deleteMany, FK sırası!). `UPLOAD_DIR` altındaki eski dosyaları temizle (`fs.rm(config.UPLOAD_DIR, { recursive: true, force: true })` + tekrar mkdir).
- **IMPLEMENT**: Kullanıcılar (T9'un `hashPassword`'u ile — `authService.hashPassword`):

```ts
const users = await prisma.user.createMany({ data: [
  { username: "yonetici", passwordHash: await hashPassword("yonetici123"), fullName: "Yönetici", role: "YONETICI" },
  { username: "personel", passwordHash: await hashPassword("personel123"), fullName: "Saha Personeli", role: "SAHA_GOREVLISI" },
] });
```

- **IMPLEMENT**: Demirbaşlar oluştuktan sonra ~20 bildirim: 1 parkta seçili demirbaşlara dağıt; `ticketNo` için `repository.allocateTicketNo` benzeri doğrudan `reportCounter` upsert kullan (transaction değil — sıralı seed); durum dağılımı: `YENI` ×5, `ATANDI` ×5, `ONARILDI` ×8, `REDDEDILDI` ×2; tarihler geçmişe yayılır (`createdAt`'e `new Date(Date.now() - N gün)` — createMany data'sına açık değer); `ONARILDI` kayıtlarına `closedAt` + `resolutionNote`; fotoğraflar `sharp({ create })` ile üretilip `savePhoto`'ya yazılır (photos.test.ts:19-23 deseni — her bildirim için tek düz renkli webp).
- **IMPLEMENT**: `ReportEvent` kayıtları: `YENI→ATANDI` (personel actor) + `ATANDI→ONARILDI` (personel actor, note) ONARILDI'lar için; `YENI→REDDEDILDI` (yonetici actor, note) REDDEDILDI'ler için; `YENI→ATANDI` ATANDI'ler için. `createdAt`'ler report `createdAt` sonrasına.
- **IMPLEMENT**: Asset senkronu — açık bildirim (YENI/ATANDI) olan demirbaşları `ARIZALI`, kapalı olanları `AKTIF` yap (T19'daki servis çağrılmaz, doğrudan `prisma.asset.updateMany` — seed'de servisin rol/oturum bağımlılığı yoktur ama assetService yeniden kullanılabilir).
- **GOTCHA**: Seed `tsx --conditions=react-server` ile çalışır (prisma.config.ts:8) — `server-only` paketi bu koşulda no-op olur (README tuzakları); `bcryptjs`/`sharp` düz Node'da çalışır. `import "dotenv/config"` satırı korunur. `savePhoto` `UPLOAD_DIR`'e yazar — config'den gelir.
- **VALIDATE**: `npm run db:seed && npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM Report;"` yerine görsel kontrol: `npm run db:seed` sonrası `npm run dev`'de panelde veriler görünür (T34'te E2E doğrular)

### T32 — UPDATE dokümantasyon

- **IMPLEMENT** kök `README.md`: "Bu depo ... Aşama 3 çıktılarını içerir" başlığına güncelle; `http://localhost:3000` bölümüne `/panel/bildirimler`; "Demo kullanıcılar" bölümü: `yonetici`/`yonetici123`, `personel`/`personel123`; "Prisma/Next tuzakları"na jose/bcryptjs notu gerekmez (saf JS).
- **IMPLEMENT** `src/features/reports/README.md`: "Aşama 3 (durum makinesi)" bölümünü (satır 59-61) gerçekleşmiş haliyle değiştir: `transitionReport` akışı, `ALLOWED_TRANSITIONS`, rol kuralları, `ReportEvent`, asset senkronu, `closedAt` semantiği, "API yerine Server Action" kararı.
- **CREATE** `src/features/auth/README.md`: akışlar (giriş/çıkış, oturum), rol tablosu, güvenlik notları (bcrypt cost 12, JWT 7 gün, DTO), test notu (session.test.ts neden cookies test etmez).
- **VALIDATE**: `npm run typecheck`

### T33 — UPDATE `.env` / `.env.example`

- **IMPLEMENT**: `.env.example`'a `SESSION_SECRET="..."` (satır 4'e) — açıklama "min. 32 karakter, `openssl rand -base64 32` ile üret". Yerel `.env`'e gerçek değer (örnek: uzun rastgele dize). `.gitignore` zaten `.env`'i kapsıyor (doğrula).
- **GOTCHA**: `SESSION_SECRET` boşsa `core/config.ts` (T3) uygulamayı açılışta durdurur — bu bilinçli davranıştır.
- **VALIDATE**: `npm run dev` açılışta hata vermez

---

## TESTING STRATEGY

### Unit Tests

- `src/features/auth/service.test.ts` — bcrypt roundtrip, `authenticate` başarı/başarısızlık, kullanıcı bilgisi sızdırmayan hata mesajı.
- `src/features/auth/session.test.ts` — JWT roundtrip, geçmiş süreli token → null, kurcalanmış token → null.
- `src/features/reports/service.test.ts` (mevcut + yeni) — durum makinesi: geçerli geçişler, geçersiz geçişler, rol kısıtı (`REDDEDILDI`), event kaydı, asset senkronu (ARIZALI→AKTIF), `createReport` → ARIZALI. Mevcut testlerin tamamı yeşil kalmalı.

### Integration Tests

Mevcut desende (gerçek SQLite + `tests/setup.ts`) servis testleri zaten entegrasyon niteliğindedir. Ayrı API route testi yoktur — panel akışı E2E ile doğrulanır.

### Edge Cases

- Aynı asset'te 2 açık kayıt olamayacağı garantisi (tekilleştirme) üzerinden asset senkronunun doğruluğu
- `ONARILDI`/`REDDEDILDI` terminal durumlarına geçiş denemesi → 409
- `REDDEDILDI`'yi `SAHA_GOREVLISI`'nin denemesi → 403
- Olmayan reportId → 404
- Onarım fotoğrafı yokken geçiş (note'suz, fotoğrafsız kapatma) — geçerli olmalı
- Fotoğraf 10 MB üstü / yanlış MIME → 422 (schema refine)
- `overdue` filtresi: 7 günden eski açık kayıt listelenir, yeni açık kayıt listelenmez

### E2E / Browser Automation

`agent-browser` skill'i ile doğrulanacak akışlar (`screenshots/asama3-*.png`):

- **Happy path:** `npm run db:seed` sonrası `http://localhost:3000/giris` → yanlış şifreyle hata mesajı → `yonetici`/`yonetici123` ile giriş → `/panel` (gösterge paneli) → `/panel/bildirimler` (listede açık/geciken kayıtlar, rozetler) → bir kaydın detayı → "Üstlen" → "Onarıldı olarak kapat" (not ile) → durum `ONARILDI` rozeti
- **QR kapatma akışı:** girişli iken `http://localhost:3000/q/BANK-0001` → açık bildirim varsa "Onarıldı olarak kapat" formu görünür → kapat
- **Error paths:** oturumsuz `/panel` → `/giris`'e yönlenir; `personel` ile `/panel/demirbaslar/yeni` → 403; geçersiz şifre → hata metni
- **Screenshots:** `screenshots/asama3-giris.png`, `asama3-panel-bildirimler.png`, `asama3-detail-transition.png`, `asama3-q-close.png`, `asama3-role-gate.png`, `asama3-login-error.png`
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
npx vitest run src/features/auth/service.test.ts src/features/auth/session.test.ts
npx vitest run src/features/reports/service.test.ts
```

### Level 3: Build

```bash
npm run typegen   # yeni route'lar için PageProps/RouteContext tipleri
npm run build
```

### Level 4: Manual Validation

1. `npm run db:reset && npm run db:seed` → `npm run dev`
2. `/giris` — `yonetici`/`yonetici123` giriş → `/panel`
3. `/panel/bildirimler` — filtreler çalışır (durum, park, gecikenler)
4. Detayda geçiş yap → DB'de `ReportEvent` oluştuğunu `npx prisma studio` ile kontrol et
5. `personel` ile `/panel/demirbaslar/yeni` → 403; `/panel` erişimi açık
6. Oturumsuz tarayıcıda `/panel` → `/giris`
7. `/q/BANK-0001` — girişli iken kapatma formu, oturumsuz iken vatandaş formu

### Level 5: E2E / Browser Automation

```bash
npm run db:seed
npm run dev   # http://localhost:3000

agent-browser open http://localhost:3000/giris
agent-browser snapshot -i
# giriş hatası → screenshot, doğru giriş → /panel
agent-browser screenshot screenshots/asama3-giris.png
# /panel/bildirimler → list + rozetler
agent-browser screenshot screenshots/asama3-panel-bildirimler.png
# detay → geçiş akışı
agent-browser screenshot screenshots/asama3-detail-transition.png
# /q/BANK-0001 personel görünümü
agent-browser screenshot screenshots/asama3-q-close.png
# personel rolüyle /panel/demirbaslar/yeni → 403
agent-browser screenshot screenshots/asama3-role-gate.png
# oturumsuz /panel → /giris yönlenmesi
agent-browser screenshot screenshots/asama3-unauthenticated-redirect.png

agent-browser errors
agent-browser close
```

**NOT:** `agent-browser` Windows'ta Unix socket sorunu yaşayabilir (`node_modules/...` SKILL.md satır 22) — WSL veya Linux container kullan; mevcut `screenshots/asama2-*.png` örnekleri bu ortamda üretildiği için yerel ortamda çalışıyor olmalı.

### Level 6: Additional Validation

- `npx prisma validate` — şema geçerli
- `npx prisma studio` — `ReportEvent` satırlarının ve `asset.status` senkronunun elle doğrulanması

---

## ACCEPTANCE CRITERIA

- [ ] `features/auth`: `yonetici` ve `personel` kullanıcılarıyla `/giris` girişi çalışır; yanlış şifre genel hata mesajı döner
- [ ] `/panel/*` oturumsuz erişimde `/giris`'e yönlenir
- [ ] `SAHA_GOREVLISI` `/panel/demirbaslar/yeni`, `/panel/demirbaslar/[id]/duzenle`, `/panel/etiketler` erişemez (403)
- [ ] Durum makinesi: `YENI → ATANDI → ONARILDI` · `YENI/ATANDI → REDDEDILDI` (yalnızca YONETICI); geçersiz geçiş 409 `INVALID_TRANSITION`
- [ ] Her geçiş `ReportEvent` kaydı oluşturur (kim, ne zaman, from/to, not)
- [ ] `ONARILDI`'da `closedAt` set olur; detayda çözüm süresi görünür (`formatDurationTR`)
- [ ] Bildirim açılınca `Asset.status = ARIZALI`; son açık kayıt kapanınca `AKTIF`
- [ ] `/q/[code]` girişli personelde kapatma formu gösterir; vatandaşta mevcut formu korur
- [ ] `/panel/bildirimler` filtreleri (durum/park/geciken) ve rozetleri (tekrar sayacı, gecikme) çalışır
- [ ] Detay sayfası: fotoğraflar, demirbaş kartı, son 12 ay geçmişi, olay akışı
- [ ] Seed: 2 kullanıcı + 20 bildirim (çeşitli durum/tarih) + olay kayıtları; `npm run db:seed` idempotent
- [ ] Tüm mevcut testler yeşil (regresyon yok)
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` sıfır hata
- [ ] E2E akışları ekran görüntüleriyle doğrulanmış (`screenshots/asama3-*.png`)

---

## COMPLETION CHECKLIST

- [ ] Tüm görevler sırayla tamamlandı (T1 → T33)
- [ ] Her görevin VALIDATE komutu geçti
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` başarılı
- [ ] Level 5 agent-browser E2E doğrulaması geçti (screenshots/ kaydedildi)
- [ ] Manual doğrulama (Level 4) tamamlandı
- [ ] Kabul kriterlerinin tümü sağlandı
- [ ] Kod gözden geçirildi (desen tutarlılığı, <300 satır kuralı — `service.ts`/`page.tsx`'ler fazlasıyla büyürse bölünmeli)

---

## NOTES

**Tasarım kararları:**

1. **API route yerine Server Action.** PRD 10.2, `GET /api/reports`, `GET /api/reports/[id]`, `PATCH /api/reports/[id]/status` tanımlar; kod tabanı konvansiyonu (Aşama 1-2) panel CRUD'unu Server Component + Server Action ile yapar (ör. `actions.ts` deseni). Tüketicisi olmayan route yazmak dead code üretir; bu yüzden panel akışı Server Action kullanır. `{ error, detail }` hata sözleşmesi ve 409 `INVALID_TRANSITION` yine de korunur (servis katmanında `TransitionError`). Bu sapma `src/features/reports/README.md`'de belgelenir.
2. **`closedAt` her terminal durumda set edilir** (`ONARILDI` ve `REDDEDILDI`). Aşama 4'teki ortalama çözüm süresi yalnızca `ONARILDI` kayıtlarını sayar; `REDDEDILDI`'nin `closedAt`'i tutarlılık içindir.
3. **Asset senkronu koşulludur.** Kapatmada `updateMany({ where: { id, status: "ARIZALI" } })` — personelin elle verdiği `BAKIMDA`/`HURDA` durumu ezilmez. Açmada ise koşulsuz `ARIZALI` (yeni bildirim açılan demirbaş fiilen arızalıdır).
4. **JWT'ye rol gömülür ama güvenilmez.** `getCurrentUser` her istekte kullanıcıyı DB'den çeker — rol değişiklikleri anında yansır (Next auth rehberi "secure checks" bölümü). SQLite demo ölçeğinde maliyet önemsiz.
5. **`ActionState` `shared/types.ts`'e taşınır** — üç-dilim kuralı: assets + reports + auth kullanacak (vertical-slice-architecture.md satır 141-171).
6. **Layout koruması + sayfa koruması.** `panel/layout.tsx` `requireUser` ile kimlik doğrular (PRD 9.1'in öngördüğü yer); rol kapıları `requireRole` ile sayfa/action seviyesinde. Next docs'un layout uyarısı (satır 1348-1358) MVP ölçeğinde kabul edilir çünkü tüm veri erişimi zaten sayfada ve Server Action'larda yeniden doğrulanır.
7. **Oturum süresi 7 gün**, sliding expiration yok (demo ölçeği). `updateSession` (rehber satır 716-744) MVP'de gerekmez.
8. **Login hız sınırı yok** — PRD 9.2 yalnızca bildirimleri kapsar; giriş denemesi kısıtı Aşama 4 sonrası değerlendirilir.

**Bilinen riskler:**
- `bcryptjs` cost 12: E2E'de her giriş ~0,5 sn — kabul edilebilir; test süresini artırmaz (testlerde hash sayısı az).
- `forbidden()` (Next 16) davranışı dokümanla doğrulanmalı (T11 GOTCHA).
- `transitionReport` servisinin `savePhoto`'yu transaction içinde çağırması: dosya yazımı hata verirse transaction geri alınır ama dosya diske yazılmış kalır (orphan). Demo ölçeğinde kabul edilir; fotoğraf boru hattının transaction dışına alınması da mevcut `createReport` deseniyle uyumludur (createReport da `savePhoto`'yu transaction öncesi yapar — **T19'da bu deseni izle: fotoğrafı transaction DIŞINDA işle/yaz**, dosya yazımını servis `transitionReport`'un başında yap).

**Devir (Aşama 4'e):** `ReportEvent` ve `closedAt` zaten şemada; gösterge paneli metrikleri (ortalama çözüm süresi, en çok arıza veren 5 demirbaş, park/tür dağılımı) `features/analytics` diliminde bu veriden üretilir. `seed` tarih dağılımı Aşama 4 için zaten geçmişe yayılmış olacak.

**Confidence Score: 8/10**
