# Feature: fix-transition-photo-validation

Bu plan eksiksiz olacak şekilde yazıldı, ancak **uygulamaya başlamadan önce dokümantasyonu ve kod tabanındaki desenleri doğrula.** Next.js 16 ve Prisma 7 eğitim verisindeki kullanımdan farklı çalışıyor — planın "GOTCHA" notlarını atlama. Mevcut util, tip ve model isimlerine dikkat et; `@/features/reports` dilimi kanonik referanstır.

## Feature Description

Bir E2E test turunda tespit edilen bug: personel, bildirim detay sayfasındaki "Durum Güncelle" formunda (veya `/q/[code]`'daki "Onarıldı Olarak Kapat" formunda) **fotoğraf yüklemeden** formu gönderince işlem reddediliyor ve "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz." hatası gösteriliyor. Fotoğraf yüklenince aynı form başarıyla çalışıyor. Bug, form gönderimi sırasında **boş dosya input'unun `undefined` yerine boş bir `File` nesnesi** üretmesinden kaynaklanıyor.

## User Story

> **Saha görevlisi** olarak,
> bildirimi fotoğraf eklemeden de durum değiştirmek istiyorum
> ki **sahada hızlıca işi kapatıp yoluma devam edebileyim.**

## Problem Statement

`transitionReportSchema.photo` (`src/features/reports/schemas.ts:53-61`) `z.instanceof(File).optional()` kullanıyor. Browser'da boş `<input type="file">` içeren bir form gönderildiğinde `formData.get("photo")`:

- `undefined` **dönmüyor** — multipart gövdede `_1_photo` `filename=""` + `Content-Type: application/octet-stream` olarak iletilen **boş bir `File`** dönüyor (E2E ağ yakalamasında kanıtlandı).

Sonuç: `.optional()` devreye girmiyor (değer `File`), `z.instanceof(File)` geçiyor, ama `.refine((f) => !f || ALLOWED_PHOTO_TYPES.includes(f.type))`'de `f` truthy ve `type === "application/octet-stream"` listede olmadığından **doğrulama patlıyor**. `actions.ts`'deki `photo: formData.get("photo") ?? undefined` de bu durumu kurtarmıyor (değer `null` değil).

## Solution Statement

`schemas.ts` içine `emptyToUndefined` desenini taklit eden **`emptyFileToUndefined`** preprocess yardımcısı ekle; boş dosyayı (`File` + `size === 0`) `undefined`'a çevir. `transitionReportSchema.photo` alanını bu yardımcıyla sarmala. Böylece:

- Boş file input → `photo: undefined` → opsiyonel alan geçer, `resolvedPhoto` işlenmez.
- Gerçek görsel → mevcut `instanceof(File)` + type/size refine'ları aynen işler.
- Her iki form (`TransitionForm`, `CloseReportForm`) aynı action'ı kullandığı için tek nokta düzeltmesi yeterli.

## Feature Metadata

**Feature Type**: Bug Fix
**Estimated Complexity**: Low
**Primary Systems Affected**: `src/features/reports/schemas.ts`; test: `src/features/reports/schemas.test.ts` (yeni)
**Dependencies**: yok (mevcut: zod 4.4, Node 20+ global `File`)

---

## CONTEXT REFERENCES

### Okunması Zorunlu Proje Dosyaları

Bu dosyaları uygulamaya başlamadan **önce oku**:

- `src/features/reports/schemas.ts` (tam dosya, 81 satır) — **Ana düzenleme hedefi.** `emptyToUndefined` preprocess (satır 9-11), `transitionReportSchema` (satır 47-62). Bug satır 53-61'deki `photo` alanında.
- `src/features/reports/actions.ts` (tam dosya, 45 satır) — `transitionReportAction` (satır 12-44): `photo: formData.get("photo") ?? undefined` (satır 20), `resolvedPhoto = photo ? await processPhoto(...)` (satır 30). Fix sonrası burada değişiklik **gerekmez** — boş File `undefined`'a düşeceği için `photo` falsy kalır.
- `src/features/reports/components/TransitionForm.tsx` (satır 65-77) — `name="photo"` file input; doğrulama hatasını `errors.photo[0]` ile gösterir (satır 76).
- `src/features/reports/components/CloseReportForm.tsx` (satır 62-74) — aynı `transitionReportAction`'ı kullanır; aynı fix kapsar.
- `src/features/reports/photos.test.ts` (satır 1-63) — Test deseni örneği: `describe`/`it` Türkçe açıklamalar, `sharp` ile üretilen gerçek buffer.
- `src/features/assets/codes.test.ts` (satır 1-38) — Saf fonksiyon/schema test deseni örneği.
- `vitest.config.ts` (tam dosya) — `environment: "node"`, alias `@/`, `server-only` stub. `File` global'i Node 20+ çalıştığı için testte mevcuttur.

### Yeni Oluşturulacak Dosyalar

- `src/features/reports/schemas.test.ts` — `transitionReportSchema` için unit testler.

### Patterns to Follow

**Preprocess deseni** — `src/features/reports/schemas.ts:9-11`:

```ts
function emptyToUndefined<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v === "" ? undefined : v), schema.optional());
}
```

**Error mesajı deseni** — `schemas.ts:56-61`: `.refine((f) => !f || ALLOWED_PHOTO_TYPES.includes(f.type), { error: "..." })`.

**Zod 4 sözdizimi** — `{ error: "..." }` mesaj parametresi (string mesaj değil).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Schema'ya `emptyFileToUndefined` yardımcısını ekle (boş dosyayı `undefined`'a çeviren preprocess).

### Phase 2: Core Implementation

`transitionReportSchema.photo` alanını `emptyFileToUndefined(...)` ile sarmala; içerideki `.optional()` ve `!f ||` guard'larını kaldır (preprocess zaten `undefined` döndürünce outer `.optional()` devreye girer).

### Phase 3: Integration

Değişiklik yok — `actions.ts`, `TransitionForm.tsx`, `CloseReportForm.tsx` zaten `transitionReportSchema` üzerinden çalışıyor.

### Phase 4: Testing & Validation

`schemas.test.ts` unit testleri + E2E browser doğrulaması (Level 5).

---

## STEP-BY-STEP TASKS

### 1. UPDATE `src/features/reports/schemas.ts` — `emptyFileToUndefined` ekle

- **IMPLEMENT**: `emptyToUndefined` fonksiyonunun (satır 9-11) hemen altına ekle:

```ts
// Boş file input'un FormData'da undefined yerine boş bir File (size 0) döndürmesini
// normalleştirir; opsiyonel fotoğraf alanı boş gönderildiğinde doğrulama patlamaz.
function emptyFileToUndefined<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (v instanceof File && v.size === 0 ? undefined : v), schema.optional());
}
```

- **PATTERN**: `src/features/reports/schemas.ts:9-11` (`emptyToUndefined`)
- **GOTCHA**: `File` global'i Node 20+'da ve tarayıcıda mevcut; `v instanceof File` güvenli.
- **VALIDATE**: `npx tsc --noEmit`

### 2. UPDATE `src/features/reports/schemas.ts` — `transitionReportSchema.photo`'yu sarmala

- **IMPLEMENT**: Satır 53-61'i değiştir:

```ts
  photo: emptyFileToUndefined(
    z
      .instanceof(File, { error: "Geçersiz dosya." })
      .refine((f) => ALLOWED_PHOTO_TYPES.includes(f.type), {
        error: "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz.",
      })
      .refine((f) => f.size <= MAX_PHOTO_BYTES, {
        error: "Fotoğraf en fazla 10 MB olabilir.",
      }),
  ),
```

- **PATTERN**: `emptyToUndefined` kullanımı `schemas.ts:20-27` (opsiyonel string alanlar)
- **GOTCHA**: İçerideki eski `.optional()`'ı ve `!f ||` guard'larını **kaldır** — artık dıştaki `emptyFileToUndefined` + `.optional()` bunu yönetiyor. Eski satırlar:
  ```ts
  photo: z
    .instanceof(File, { error: "Geçersiz dosya." })
    .optional()
    .refine((f) => !f || ALLOWED_PHOTO_TYPES.includes(f.type), {...})
    .refine((f) => !f || f.size <= MAX_PHOTO_BYTES, {...}),
  ```
- **VALIDATE**: `npx tsc --noEmit`

### 3. CREATE `src/features/reports/schemas.test.ts` — unit testler

- **IMPLEMENT**: Şu testleri ekle (`describe`/`it`, Türkçe açıklamalar — kod tabanı konvansiyonu):

```ts
import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, transitionReportSchema } from "@/features/reports/schemas";

function parse(photo?: File) {
  return transitionReportSchema.safeParse({
    reportId: "report-1",
    toStatus: "ATANDI",
    note: "Üstlendim",
    photo,
  });
}

describe("transitionReportSchema.photo", () => {
  it("boş dosya input'u (size 0 File) photo'yu undefined yapar, parse başarılı olur", () => {
    const result = parse(new File([], "bos.jpg", { type: "application/octet-stream" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.photo).toBeUndefined();
  });

  it("hiç fotoğraf gönderilmezse parse başarılı olur", () => {
    expect(parse().success).toBe(true);
  });

  it("geçerli görsel parse başarılı olur ve photo File olarak döner", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "foto.jpg", { type: "image/jpeg" });
    const result = parse(file);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.photo).toBe(file);
  });

  it("izinli olmayan MIME türü reddedilir", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "belge.txt", { type: "text/plain" });
    const result = parse(file);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.photo?.[0]).toBe("Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz.");
    }
  });

  it("10 MB'ı aşan görsel reddedilir", () => {
    const big = new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "buyuk.jpg", { type: "image/jpeg" });
    const result = parse(big);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.photo?.[0]).toBe("Fotoğraf en fazla 10 MB olabilir.");
    }
  });
});
```

- **PATTERN**: `src/features/assets/codes.test.ts` (saf parse testi, `result.error.flatten()`), `photos.test.ts` (Türkçe it açıklamaları)
- **GOTCHA**: `File` global'i Node 20+'da var (runtime Node 24.16). `new File([], ...)` size 0 üretir — **bug'ı birebir taklit eder**. `MAX_PHOTO_BYTES` importu `schemas.ts`'ten.
- **VALIDATE**: `npx vitest run src/features/reports/schemas.test.ts`

### 4. RUN doğrulama komutları (sırayla, her biri geçmeli)

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build` (opsiyonel ama tam kalite kapısı için)

### 5. LEVEL 5 E2E browser doğrulaması (agent-browser / Playwright MCP)

Dev server `http://localhost:3000` zaten ayakta (önceki E2E turundan). Sıralama:

1. Personel girişi yap (`personel/personel123`) — veya mevcut oturum sürer.
2. `/panel/bildirimler/cmsj68jnd0018j0twrib824te` (#1, BANK-0001, YENI) detayına git.
3. "Yeni durum" → `ATANDI` seç; **fotoğraf bırakma boş**; "Güncelle" gönder.
4. Yeşil "Bildirim durumu güncellendi." mesajı assert et; kırmızı "Yalnızca JPEG..." hatası **olmamalı**.
5. DB'de `Report.status === "ATANDI"` ve `ReportEvent` (YENI→ATANDI) doğrula (peek script deseni).
6. Screenshot kaydet: `screenshots/fix-photo-optional-success.png`.
7. Console'da hata olmadığını doğrula.

> NOT: #1'i ATANDI yapmak test DB'sini kirletir. İstersen önce `scripts/` altında geçici peek script ile başka bir YENI bildirimi de kullanabilirsin (ör. `cmsj68jrt001bj0twczk3lf00` #4). Fark etmez — amaç formun fotoğrafsız submit'inin çalıştığını kanıtlamak.

---

## TESTING STRATEGY

### Unit Tests

`src/features/reports/schemas.test.ts` (Task 3): boş File, hiç File yok, geçerli görsel, izinsiz MIME, 10MB+ — 5 senaryo.

### Edge Cases

- Boş file input'un `size === 0` File üretmesi (bug'ın kendisi) — covered.
- `photo` alanının formdan tamamen yokluğu — covered.
- 10 MB tam sınır (`MAX_PHOTO_BYTES` + 1) — covered.

### E2E / Browser Automation

- **Happy path**: personel girişi → YENI bildirim detayı → ATANDI seç → fotoğrafsız "Güncelle" → yeşil mesaj + durum DB'de `ATANDI` + `ReportEvent`.
- **Regression**: aynı formda fotoğraf seçilerek gönderim hâlâ çalışıyor (önceki turda doğrulandı; tekrar hızlıca doğrula).
- **Screenshot**: `screenshots/fix-photo-optional-success.png`

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
`npm run lint`

### Level 2: Typecheck
`npm run typecheck`

### Level 3: Unit Tests
`npm test` (hepsi: `service.test.ts`, `photos.test.ts`, `schemas.test.ts`, auth/assets/analytics testleri)
Tekil: `npx vitest run src/features/reports/schemas.test.ts`

### Level 4: Manual / DB
Peek script deseni (`src/core/db.ts` import) ile `Report.status` + `ReportEvent` doğrula.

### Level 5: E2E / Browser
Playwright MCP (agent-browser) ile Task 5 akışı.

---

## ACCEPTANCE CRITERIA

- [ ] Fotoğrafsız "Durum Güncelle" submit'i **başarılı**: yeşil mesaj, DB'de `status: ATANDI`, `ReportEvent` oluştu
- [ ] Fotoğraflı submit hâlâ çalışıyor (regression yok)
- [ ] Gerçekten geçersiz dosya (izinsiz MIME, >10MB) hâlâ reddediliyor
- [ ] `npm run lint`, `npm run typecheck`, `npm test` sıfır hata
- [ ] Kod tabanı konvansiyonlarına uygun (Türkçe açıklamalar, `{ error }` zod sözdizimi)

---

## COMPLETION CHECKLIST

- [ ] Task 1-5 sırayla tamamlandı
- [ ] Her task'ın VALIDATE komutu geçti
- [ ] `npm test` tamamı yeşil
- [ ] `npm run build` geçti
- [ ] E2E doğrulaması yapıldı, screenshot `screenshots/` altında
- [ ] Acceptance criteria tamamı sağlandı

---

## NOTES

- **Kapsam dışı**: `createReportSchema.photo` (vatandaş formu, satır 28-33) — orada fotoğraf **zorunlu** ve native `required` + `z.instanceof(File)` ile doğru çalışıyor. E2E'de "fotoğrafsız bildirim engellendi" zaten doğrulanmıştı. Dokunma.
- `actions.ts:20` (`photo: formData.get("photo") ?? undefined`) değişmedi — boş File artık schema'da `undefined`'a düşüyor, action `photo` falsy görür, `resolvedPhoto` undefined kalır.
- Fix'in tek noktası `schemas.ts`; hem `TransitionForm` hem `CloseReportForm` bundan faydalanır.
