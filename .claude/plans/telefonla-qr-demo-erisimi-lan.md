# Feature: Telefonla QR Demo Erişimi (LAN) — QR Okutmanın Telefondan Çalışır Hale Getirilmesi

Bu plan eksiksiz olacak şekilde yazıldı, ancak **uygulamaya başlamadan önce dokümantasyonu ve kod tabanındaki desenleri doğrula.** Aşama 1–4 planlarındaki GOTCHA'ların tamamı geçerli (Next 16 async `params`, Prisma 7, Zod 4 `{ error }` sözdizimi). Mevcut util, tip ve model isimlerine dikkat et; `src/core/config.ts` ortam değişkenlerinin tek doğrulama noktasıdır.

---

## Feature Description

Sunum senaryosunun kalbi (`docs/sunum-senaryosu.md` 3–5' dilimi) **telefonla canlı QR okutmadır**. Ancak bugün bu akış çalışmaz: `.env` içinde `APP_URL="http://localhost:3000"` olduğundan, QR görselleri `http://localhost:3000/q/SALN-0001` içeriğini kodlar (`src/features/assets/qr.ts:5`). Telefon QR'ı okutunca **kendi** localhost'una bağlanmaya çalışır → "localhost bağlanmayı reddetti" hatası. Bu, ağ yapılandırması değil, **QR içeriği sorunudur**.

Bu plan şunları ekler:

- `scripts/lan-ip.mjs` — makinenin LAN IPv4 adresini bulan sıfır bağımlılıklı Node betiği (saf fonksiyon + CLI), `npm run lan-ip` ile çağrılır
- `scripts/demo-firewall.ps1` — Windows Firewall'da TCP 3000'e gelen bağlantıya izin veren idempotent PowerShell betiği (admin gerektirir), `npm run demo:firewall`
- `scripts/lan-ip.test.ts` — saf fonksiyonun vitest birim testi
- `package.json` script'leri + README "Telefonla Canlı Demo" bölümü + `docs/sunum-senaryosu.md` hazırlık listesi güncellemesi + `.env.example` açıklaması
- `.env` içinde `APP_URL`'in makinenin LAN IP'sine çevrilmesi (git'e girmez — `.env*` gitignore'da, `.gitignore:34`)

**Değişmez ilke:** Uygulamanın çalışma zamanı davranışı değişmez. Kodlanmış QR URL'leri zaten `config.APP_URL`'den üretiliyor; sadece bu değer LAN IP olur. `allowedDevOrigins`/host binding/rate limit/session dahil hiçbir Next.js yapılandırması değişmez (gerekçe: aşağıda GOTCHA).

## User Story

> **Sunum yapan** olarak,
> basılmış etiketteki QR'ı telefonumla okutmak istiyorum
> ki **canlı demo senaryosunun 3–5' dilimi (QR → bildirim → panele yansıma) sunum günü çalışsın.**

> **Sunum yapan** olarak,
> LAN IP'yi tek komutla öğrenip firewall'ı tek komutla açmak istiyorum
> ki **sunum öncesi hazırlık adımları hata riski taşımasın.**

## Problem Statement

1. `APP_URL="http://localhost:3000"` → QR içeriği telefonun kendi localhost'u → "bağlanmayı reddetti" (doğrulanmış: `src/features/assets/qr.ts:5` + `.env`)
2. Windows Firewall, Node.js'e gelen 3000 portunu varsayılan olarak engelleyebilir (özellikle **Genel (Public)** ağ profili)
3. LAN IP'yi bulma (ipconfig) ve firewall açma adımları elle yapılıyor → sunum öncesi tekrar edilebilir değil
4. `docs/sunum-senaryosu.md` hazırlık listesi telefon erişimi derken QR içeriğinin **yeniden üretilmesi gerektiğini** söylemiyor — basılmış etiketler localhost URL'ini gömülü tutar

## Solution Statement

Kod tarafında üç küçük betik + dokümantasyon; çalışma zamanında sıfır değişiklik:

1. `scripts/lan-ip.mjs`: `os.networkInterfaces()` ile ilk geçerli (non-internal, IPv4, APIPA olmayan) adresi seçen saf `pickLanIp()` fonksiyonu + doğrudan çalıştırma korumalı CLI (`--all` tüm adayları listeler). Sıfır bağımlılık — Node 18+ yerleşikleri.
2. `scripts/demo-firewall.ps1`: mevcut kuralı kontrol eden (idempotent), yoksa `netsh advfirewall` ile TCP 3000 inbound kuralı ekleyen betik. Admin kontrolü, `-Force` yeniden oluşturma, `-Profile` parametresi (varsayılan `Private`). ASCII-only içerik (PowerShell 5.1 UTF-8 no-BOM tuzakları).
3. `package.json`: `lan-ip` ve `demo:firewall` script'leri.
4. `.env` → `APP_URL="http://<LAN-IP>:3000"` + dev sunucusu yeniden başlatma (config modülü import anında okur — hot reload güvenilmez).
5. Dokümantasyon: README'ye "Telefonla Canlı Demo" bölümü, `docs/sunum-senaryosu.md` hazırlık listesine somut adımlar, `.env.example`'a APP_URL açıklaması.
6. Doğrulama: birim test + lint + typecheck + build + agent-browser E2E + telefonla manuel QR okutma.

## Feature Metadata

**Feature Type**: Bug Fix (demo engeli) + küçük Developer Tooling
**Estimated Complexity**: Low
**Primary Systems Affected**: `scripts/` (yeni dizin), `package.json`, `.env.example`, `README.md`, `docs/sunum-senaryosu.md`, `.env` (lokal, git'e girmez)
**Dependencies**: Sıfır yeni bağımlılık. Mevcut: Node 18+ (`os`, `node:url`), vitest 4.1, PowerShell 5.1 (Windows tarafı)

---

## CONTEXT REFERENCES

### Okunması Zorunlu Proje Dosyaları

Bu dosyaları uygulamaya başlamadan **önce oku**:

- `src/features/assets/qr.ts` (tam dosya, 23 satır) — `assetUrl()` (satır 4–6) QR içeriğinin tek üretim noktası: `` `${config.APP_URL.replace(/\/$/, "")}/q/${code}` ``. Bu fonksiyon **değişmeyecek** — APP_URL değeri değişiyor.
- `src/core/config.ts` (tam dosya, 20 satır) — APP_URL `z.url()` ile doğrulanır (satır 6); `http://192.168.1.42:3000` geçerli bir URL'dir. Modül import anında `process.env` okur → `.env` değişince **dev sunucusu yeniden başlatılmalı**.
- `package.json` (satır 5–18) — scripts deseni; `lan-ip` ve `demo:firewall` buraya eklenir.
- `.env.example` (satır 2) — `APP_URL="http://localhost:3000"` satırı; açıklama buraya eklenir. `.env` git'te **yok** (`.gitignore:34` — yalnız `.env.example` izlenir).
- `README.md` (satır 16–27 Kurulum, satır 39–51 Komutlar tablosu) — yeni bölüm bu ikisinin arasına/near bölümüne eklenir.
- `docs/sunum-senaryosu.md` (satır 9–22 Hazırlık Kontrol Listesi) — telefon erişim maddeleri somut adımlara bağlanır.
- `vitest.config.ts` (tam dosya, 17 satır) — varsayılan test include deseni `**/*.test.ts`; `scripts/lan-ip.test.ts` otomatik yakalanır (setup `tests/setup.ts` her test dosyasında çalışır — mevcut davranış, sorun değil).
- `tests/setup.ts` (satır 4–8) — testler APP_URL'i kendisi sabitler (`http://localhost:3000`); bu özellik testleri **etkilemez** — dokunma.

### Yeni Dosyalar

- `scripts/lan-ip.mjs` — saf `pickLanIp()` + CLI (ESM, sıfır bağımlılık)
- `scripts/lan-ip.test.ts` — `pickLanIp` birim testleri (vitest)
- `scripts/demo-firewall.ps1` — Windows Firewall kuralı (idempotent, ASCII-only)

### İlgili Dokümantasyon

- [Next.js CLI reference — dev](https://nextjs.org/docs/app/api-reference/cli/next) (`-H, --hostname`, default `0.0.0.0` — doğrulanmış: `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md:71`)
  - Neden: `next dev` zaten tüm arayüzlere bağlanır → host binding değişikliği GEREKMEZ
- [Next.js allowedDevOrigins](https://nextjs.org/docs/app/api-reference/next-config-js/allowedDevOrigins) (doğrulanmış: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.md`)
  - Neden: dev sunucusuna farklı origin'den gelen istekler engellenir; telefonla **doğrudan gezinme** engellenmez, ama aşağıdaki GOTCHA'yı bil — sadece sorun görülürse eklenir
- [Node.js os.networkInterfaces](https://nodejs.org/api/os.html#osnetworkinterfaces) — LAN IP tespitinin kaynağı
- [netsh advfirewall firewall](https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-advfirewall-firewall) — firewall kural yönetimi (Windows 7+ her sürümde çalışır, PS 5.1 güvenli)

### İzlenecek Desenler

**CLI betiği deseni (ESM + doğrudan çalıştırma koruması):**

```js
// scripts/lan-ip.mjs
import { networkInterfaces } from "node:os";
import { pathToFileURL } from "node:url";

export function pickLanIp(interfaces) { /* saf fonksiyon — test edilebilir */ }

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) { main(); }
```

**Vitest test deseni** — `src/shared/format.test.ts` ve `tests/setup.ts`'teki mevcut desen: `import { describe, it, expect } from "vitest"`, Türkçe test adları (`it("şifreyi bcrypt ile hashler...")` — bkz. `src/features/auth/service.test.ts:20`).

**package.json script deseni** — mevcut `"db:seed": "prisma db seed"` biçiminde; Windows komutu için `powershell -NoProfile -ExecutionPolicy Bypass -File` çağrısı.

**Dokümantasyon deseni** — README'de Türkçe, tablolu, kod bloklu; `docs/sunum-senaryosu.md`'de `- [ ]` checklist maddeleri.

**GOTCHA'lar:**

- **PowerShell 5.1 UTF-8 no-BOM okumaz**: `.ps1` dosyasına Türkçe karakter (ş, ğ, ü…) yazılırsa mojibake olur. Betik içeriği **ASCII-only** tutulur (mesajlar İngilizce); Türkçe mesaj gerekiyorsa dosya UTF-8 **BOM'lu** kaydedilir.
- **`next dev` default host zaten `0.0.0.0`** (docs'ta doğrulanmış) — `-H 0.0.0.0` eklemeye gerek yok, eklenmesi de zararsız ama gereksiz. `package.json`'a `dev:lan` ekleme.
- **`allowedDevOrigins`**: telefon `http://192.168.x.x:3000`'e doğrudan gezinirse engel yok. Ancak dev-only asset/HMR istekleri farklı origin'den gelirse engellenebilir. **Önleyici ekleme yapma** — yalnızca telefon tarayıcısında asset yüklenemezse `next.config.ts`'e `allowedDevOrigins: ["http://<lan-ip>:3000"]` eklenir (IP değişken olduğundan kalıcı kodlanmaz, README'de not düşülür).
- **`.env` değişikliği hot reload ile gelmez**: `src/core/config.ts` modül seviyesinde `safeParse` yapar (satır 12) — dev sunucusu **kapatılıp yeniden başlatılmalı**.
- **APIPA adresleri (`169.254.x.x`)**: link-local'dir, telefonla iletişim için işe yaramaz — `pickLanIp` bunları dışlar.
- **VPN/WSL sanal adaptörleri**: `--all` ile adayları listele; yanlış subnet seçilirse telefon erişemez.
- **Firewall admin ister**: betik admin değilse açıklayıcı hata basıp çıkar — README'de "Yönetici olarak çalıştır" notu.
- **Ağ profili `Public` ise** varsayılan `Private` kuralı yetmez: `-Profile Public` veya `-Profile Any` ile yeniden çalıştır (README'de not).
- **Basılmış fiziksel etiketler eski QR'ı taşır**: APP_URL değişince etiket sayfası yeniden açılıp **yeniden yazdırılmalı** — QR'lar render anında üretilir (`src/features/assets/components/LabelSheet.tsx:11-16`), yeni URL otomatik gömülür. Yeniden basılamıyorsa yedek akış: ana sayfa "Kod ile bildir" kutusu (PRD UH-8, `src/app/page.tsx:15`).
- **Testler etkilenmez**: `tests/setup.ts:5` APP_URL'i sabitler; test DB'si (`prisma/test.db`) ayrıdır.
- **QR SVG içinde URL düz metin olarak bulunmaz** — `qrcode` kütüphanesi metni modül desenine kodlar. Programatik QR doğrulaması için `agent-browser` ile SVG'nin **decode edilmesi gerekmez**; içerik doğrulaması `assetUrl` testi + telefonla manuel okutma ile yapılır.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

**Görevler:**

- `scripts/` dizinini oluştur
- `package.json`'a `lan-ip` ve `demo:firewall` script'lerini ekle

### Phase 2: Core Implementation

**Görevler:**

- `scripts/lan-ip.mjs` — `pickLanIp()` saf fonksiyonu + CLI (tek adres; `--all` ile liste)
- `scripts/lan-ip.test.ts` — birim testleri
- `scripts/demo-firewall.ps1` — idempotent firewall betiği

### Phase 3: Integration

**Görevler:**

- `.env` → `APP_URL="http://<LAN-IP>:3000"` (lokal; git'e girmez)
- `.env.example` → APP_URL satırına açıklama
- `README.md` → "Telefonla Canlı Demo (QR Okutma)" bölümü + Komutlar tablosuna 2 satır
- `docs/sunum-senaryosu.md` → hazırlık kontrol listesi güncellemesi

### Phase 4: Testing & Validation

**Görevler:**

- Birim test (`npm test`), lint, typecheck, build
- agent-browser E2E (etiket sayfası + `/q/[code]` + hata yolu + konsol hatası)
- Manuel: telefonla QR okutma, firewall doğrulaması, yeniden yazdırma

---

## STEP-BY-STEP TASKS

İMportant: her görevi sırayla, yukarıdan aşağıya uygula. Her görev atomiktir ve bağımsız doğrulanabilir.

### 1. CREATE `scripts/lan-ip.mjs`

- **IMPLEMENT**: ESM modülü, iki sorumluluk:
  - `export function pickLanIp(interfaces)` — parametre olarak `os.networkInterfaces()` çıktısını alan **saf** fonksiyon:
    - Adaylar: `family === "IPv4"` ve `!internal`
    - APIPA hariç: `!address.startsWith("169.254.")`
    - Aday yoksa `null` döndür; birden çok varsa ilkini döndür
  - `main()` — `pickLanIp(networkInterfaces())` çağırır; `null` ise hata mesajıyla `process.exit(1)`; `--all` argümanı varsa tüm adayları numaralı basar (VPN/WSL durumunda manuel seçim için)
  - Doğrudan çalıştırma koruması: `process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href` ise `main()` (vitest importunda tetiklenmez)
- **PATTERN**: ESM + saf fonksiyon + direct-run guard (yukarıda "İzlenecek Desenler")
- **IMPORTS**: `import { networkInterfaces } from "node:os";` ve `import { pathToFileURL } from "node:url";` — başka hiçbir şey (sıfır bağımlılık)
- **GOTCHA**: `@types/node` 20'de `family` `"IPv4" | "IPv6"` string'dir — `=== "IPv4"` karşılaştırması doğrudur. Döngü dışı aday sırası garanti değildir — testte birden çok aday varsa ilk **geçerli** aday beklenir.
- **VALIDATE**: `node scripts/lan-ip.mjs --all` → en az 1 satır IPv4 döner (herhangi bir ağa bağlıysa); `node scripts/lan-ip.mjs` → tek adres veya exit 1

### 2. CREATE `scripts/lan-ip.test.ts`

- **IMPLEMENT**: `pickLanIp` için 6 test (`describe("pickLanIp")`):
  1. loopback + LAN IPv4 → LAN IPv4
  2. yalnız loopback → `null`
  3. yalnız IPv6 → `null`
  4. APIPA (`169.254.10.5`) + loopback → `null`
  5. LAN IPv4 + APIPA + loopback → LAN IPv4 (APIPA dışlanır)
  6. birden çok LAN IPv4 → ilki
- **PATTERN**: `import { describe, it, expect } from "vitest";` — `src/features/auth/service.test.ts:1-2` deseni; Türkçe `it()` açıklamaları
- **IMPORTS**: `import { pickLanIp } from "./lan-ip.mjs";` (vitest .mjs importunu destekler; `@` alias'ı gerekmez)
- **GOTCHA**: `tests/setup.ts` her test dosyasında `prisma migrate deploy` çalıştırır (~3 sn, mevcut davranış) — engel değil. `lan-ip.mjs` import edilince `main()` çalışmamalı (guard) — guard testi de ekle: dosyayı import edip `process.argv[1]`'i değiştirmeden yan etki olmadığını doğrulamak zorunlu değil; guard'ın varlığını koda yorum satırı olarak değil, yapı olarak koru.
- **VALIDATE**: `npx vitest run scripts/lan-ip.test.ts` → 6/6 geçer

### 3. CREATE `scripts/demo-firewall.ps1`

- **IMPLEMENT**: Parametreler: `[int]$Port = 3000`, `[ValidateSet("Private","Public","Any")][string]$Profile = "Private"`, `[switch]$Force`. Adımlar:
  1. Admin kontrolü: `([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)` — değilse hata mesajı + exit 1
  2. Var olan kural kontrolü: `netsh advfirewall firewall show rule name="ParkTakip Demo $Port"` çıktısında "Ok." arayarak idempotent; varsa ve `-Force` yoksa atla, `-Force` varsa `netsh advfirewall firewall delete rule name="..."` sonra ekle
  3. Ekleme: `netsh advfirewall firewall add rule name="ParkTakip Demo $Port" dir=in action=allow protocol=TCP localport=$Port profile=$Profile`
  4. Sonucu `Write-Host` ile raporla (ASCII: "Rule 'ParkTakip Demo 3000' is active.")
- **PATTERN**: Mevcut projede PowerShell betiği yok — bu ilki; `docs/sunum-senaryosu.md` ve README'deki komut konvansiyonuyla uyumlu
- **IMPORTS**: yok (netsh + .NET sınıfları)
- **GOTCHA**: **ASCII-only içerik** (PS 5.1 UTF-8 no-BOM mojibake). `netsh` Windows 7+'da çalışır; `Get-NetFirewallRule` yerine netsh kullan (PS 5.1 + eski Windows güvenli). Kural adı boşluk içerir — netsh argümanında `name="..."` tırnak içinde.
- **VALIDATE**: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/demo-firewall.ps1 -Profile Any` (yönetici kabukta) → "active" mesajı; ikinci çalıştırma → "already exists" (idempotent); `netsh advfirewall firewall show rule name="ParkTakip Demo 3000"` ile doğrula

### 4. UPDATE `package.json`

- **IMPLEMENT**: `scripts` bloğuna ekle (satır 5–18):
  ```json
  "lan-ip": "node scripts/lan-ip.mjs",
  "demo:firewall": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/demo-firewall.ps1"
  ```
- **PATTERN**: mevcut `scripts` sözdizimi (tek satır komutlar)
- **GOTCHA**: Windows'ta `powershell` bulunur; macOS/Linux'ta bu komut hata verir — README'de Windows notu düşülür (proje zaten Windows geliştirme ortamında).
- **VALIDATE**: `npm run lan-ip` → tek IPv4 adres; `npm run typecheck` → etkilenmez

### 5. UPDATE `.env` (lokal — commit DEĞİL)

- **IMPLEMENT**: `APP_URL="http://localhost:3000"` → `APP_URL="http://<npm run lan-ip çıktısı>:3000"` (örn. `http://192.168.1.42:3000`). Sonra **dev sunucusunu durdurup yeniden başlat** (config modülü import anında okur).
- **PATTERN**: `.env` biçimi mevcut haliyle; yalnızca değer değişir
- **GOTCHA**: `.env` `.gitignore:34` nedeniyle commit edilmez — `git status` temiz kalmalı. Türkçe karakter içermez, kodlama riski yok.
- **VALIDATE**: `npm run dev` → terminal "Network: http://192.168.x.x:3000" satırı gösterir; `Invoke-WebRequest -UseBasicParsing http://<lan-ip>:3000` → HTTP 200

### 6. UPDATE `.env.example`

- **IMPLEMENT**: Satır 2'ye açıklama ekle:
  ```
  # Telefonla QR demo: makinenin LAN IP'si kullanilir (npm run lan-ip ile ogren);
  # localhost kalirsa telefon QR okutunca kendi localhost'una gider (demo kirilir)
  APP_URL="http://localhost:3000"
  ```
- **GOTCHA**: `.env.example` UTF-8 — Türkçe karakterler bu dosyada sorunsuzdur (okunan doküman değil, .env için şablon). Yine de ASCII tercih et (üstteki gibi) — tutarlılık.
- **VALIDATE**: `npm run lint` (JSON/markdown lint'i yok, dosya biçim hatası yok)

### 7. UPDATE `README.md`

- **IMPLEMENT**:
  - "## Kurulum" bölümünden sonra yeni bölüm: **"## Telefonla Canlı Demo (QR Okutma)"** — adımlar:
    1. `npm run lan-ip` → LAN IP'yi kopyala
    2. `.env` → `APP_URL="http://<LAN-IP>:3000"` olarak değiştir
    3. Yönetici PowerShell'de `npm run demo:firewall` (Public ağdaysa `-Profile Any`)
    4. `npm run dev` → telefonla `http://<LAN-IP>:3000` erişimini doğrula
    5. `/panel/etiketler` sayfasını açıp **etiketleri yeniden yazdır** (eski etiketler localhost QR'ı taşır)
    6. Yedek akış: yeniden basamıyorsan ana sayfa "Kod ile bildir" kutusu (UH-8)
  - Komutlar tablosuna 2 satır: `npm run lan-ip` ve `npm run demo:firewall`
  - GOTCHA notu: `allowedDevOrigins` — telefon dev asset'lerini yükleyemezse `next.config.ts`'e `allowedDevOrigins: ["http://<lan-ip>:3000"]` eklenir (IP değişken; kalıcı çözüm değil)
- **PATTERN**: mevcut Türkçe, tablo + kod bloğu stili (README.md:16-51)
- **VALIDATE**: dosya okunur; `npm run lint` etkilenmez

### 8. UPDATE `docs/sunum-senaryosu.md`

- **IMPLEMENT**: "Hazırlık Kontrol Listesi" (satır 9–22):
  - Satır 13 maddesini genişlet: "Telefon aynı Wi-Fi'da; `http://<makine-IP>:3000`'e erişiyor — README 'Telefonla Canlı Demo' bölümündeki adımlar uygulanmış (lan-ip, .env APP_URL, demo:firewall)"
  - Yeni madde: "Etiketler APP_URL değişikliğinden SONRA yeniden yazdırıldı (eski etiketler localhost URL'i içerir)"
- **GOTCHA**: senaryodaki sayılar (Açık 11, Geciken 5, Toplam 53) değişmez — bu özellik veriyi etkilemez.
- **VALIDATE**: madde işaretleri tutarlı; içerik okunur

### 9. VALIDATE — Kalite Kapısı (tümü sırayla)

- `npm run lint`
- `npm test` (yeni `scripts/lan-ip.test.ts` dahil 67+ test)
- `npm run typecheck`
- `npm run build`
- **VALIDATE**: dördü de sıfır hata

---

## TESTING STRATEGY

### Unit Tests

`scripts/lan-ip.test.ts` — saf `pickLanIp` fonksiyonu, 6 senaryo (bkz. Görev 2). Mevcut desen: `describe`/`it`/`expect`, Türkçe açıklamalar. `tests/setup.ts` otomatik çalışır (mevcut davranış — DB'ye dokunmaz ama migrate deploy çalıştırır; kabul edilebilir).

### Integration Tests

Bu özellik çalışma zamanı kodu eklemediği için yeni integration testi yok. Mevcut 66 test gerileme kontrolü olarak çalışır (`npm test`).

### Edge Cases

- Yalnız loopback / yalnız IPv6 / yalnız APIPA → `pickLanIp` `null` → CLI exit 1 + açıklayıcı mesaj
- Birden çok NIC (VPN/WSL) → `--all` listeler, CLI ilk geçerliyi seçer
- Firewall kuralı zaten var → idempotent (hata yok); `-Force` → yeniden oluşturur
- Admin değil → açıklayıcı hata, kural eklenmez
- `-Profile Any` → kural her iki profilde

### E2E / Browser Automation

`agent-browser` skill ile (`npm run dev` + yeni LAN APP_URL):

- **Happy path**: `/panel/etiketler` açılır → etiketler render olur (A4 ızgarası, QR'lar görünür) → screenshot `screenshots/lan-demo-etiketler.png`. `/q/SALN-0001` → demirbaş kartı + bildirim formu render olur → screenshot `screenshots/lan-demo-q-sayfasi.png`.
- **Error path**: `/q/BULUNAMAZ-1` → "Kod bulunamadı" mesajı + `CodeLookupForm` görünür → screenshot `screenshots/lan-demo-kod-bulunamadi.png`.
- **Konsol hatası**: `agent-browser errors` → boş olmalı.
- **Screenshot konumları**: `screenshots/` (repo kökünde mevcut dizin).

### Level 4 — Manuel (telefonla, canlı)

1. Telefon aynı Wi-Fi'da: `http://<lan-ip>:3000` tarayıcıda açılır (firewall doğrulaması)
2. `/panel/etiketler`den yeniden basılmış etiketi telefonla okut → `/q/SALN-0001` açılır (**özelliğin gerçek kanıtı**)
3. Fotoğraflı bildirim gönder → takip numarası döner → panelde görünür
4. Fiziksel etiketi yeniden basamıyorsan: ana sayfa "Kod ile bildir" → `SALN-0001` → aynı form

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```
npm run lint
```

### Level 2: Unit Tests

```
npm test
npx vitest run scripts/lan-ip.test.ts
```

### Level 3: Build & Types

```
npm run typecheck
npm run build
```

### Level 4: Manual Validation

```
npm run lan-ip                          # LAN IP döner; ipconfig ile çapraz doğrula
npm run dev                             # "Network: http://<lan-ip>:3000" satırı
Invoke-WebRequest -UseBasicParsing http://<lan-ip>:3000   # HTTP 200
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/demo-firewall.ps1 -Profile Any
netsh advfirewall firewall show rule name="ParkTakip Demo 3000"
```

### Level 5: E2E / Browser Automation

```bash
npm run dev
# agent-browser skill komutları (bkz. E2E bölümü):
#   open http://localhost:3000/panel/etiketler → screenshot
#   open http://localhost:3000/q/SALN-0001 → screenshot
#   open http://localhost:3000/q/BULUNAMAZ-1 → screenshot
#   errors → boş
```

### Level 6: Ek (isteğe bağlı)

Telefon varsa: gerçek QR okutma testi (Level 4'ün kalbi). Yoksa: `qrcode` üretiminin `assetUrl` testiyle kısmi doğrulama.

---

## ACCEPTANCE CRITERIA

- [ ] `npm run lan-ip` tek geçerli IPv4 adresi döndürür (loopback/APIPA değil)
- [ ] `scripts/lan-ip.test.ts` 6/6 geçer; `npm test` toplamda sıfır hata
- [ ] `npm run demo:firewall` (yönetici) kuralı oluşturur; ikinci çalıştırmada idempotent
- [ ] `.env` içinde `APP_URL` LAN IP; dev yeniden başlatılınca telefon `http://<lan-ip>:3000`'e erişir (HTTP 200)
- [ ] Yeniden basılan etiketin QR'ı telefonda `/q/SALN-0001` sayfasını açar (veya UH-8 yedeği doğrulanır)
- [ ] README "Telefonla Canlı Demo" bölümü + Komutlar tablosu; `docs/sunum-senaryosu.md` hazırlık listesi güncel
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` sıfır hata
- [ ] agent-browser E2E: 3 screenshot `screenshots/` içinde, konsol hatası yok
- [ ] Çalışma zamanı davranışı değişmedi: `allowedDevOrigins` yok, `next.config.ts` değişmedi, veri değişmedi (Açık 11 / Geciken 5 / Toplam 53)

---

## COMPLETION CHECKLIST

- [ ] Görev 1–8 sırayla tamamlandı, her biri anında doğrulandı
- [ ] Level 1–3 komutları sıfır hatayla geçti
- [ ] Level 4 manuel doğrulama tamamlandı (telefon + firewall + yeniden yazdırma)
- [ ] Level 5 agent-browser E2E geçti (screenshot'lar `screenshots/` içinde)
- [ ] Kabul kriterlerinin tamamı sağlandı
- [ ] `git status` — yalnızca planlı dosyalar değişti, `.env` dışarıda

---

## NOTES

- **Neden kod yok, sadece betik + dokümantasyon?** Kök neden `APP_URL` değeridir; QR üretimi zaten `config.APP_URL`'den beslenir (`src/features/assets/qr.ts:5`). Çalışma zamanına otomatik LAN IP tespiti eklemek kırılgan olurdu: çoklu NIC/VPN/network değişimi, yanlış subnet riski ve production davranışı değiştirme. Betikler + açık env değeri tek doğru noktadır; PRD'nin "sunum günü sürpriz yok" ilkesine uygundur (PRD §11.1, R6).
- **`allowedDevOrigins` kasıtlı olarak eklenmedi**: Next 16'da `next dev` default `0.0.0.0`'a bağlanır; telefon doğrudan gezinir ve engellenmez. Yalnızca dev-only asset istekleri farklı origin'den engellenebilir — bu gerçekleşirse (telefonda stil/JS yüklenmezse) çözüm README'de not edilir. Önleyici ekleme yapılırsa IP değişince next.config bozulur.
- **Fiziksel etiketler**: APP_URL değişimi mevcut basılmış etiketleri geçersiz kılar. Etiket sayfası render anında QR ürettiğinden (`LabelSheet.tsx:11-16`) yeniden yazdırma otomatik olarak yeni URL'i gömülür. Bu bir iş akışı adımıdır, kod değil.
- **PRD bağlamı**: PRD UH-8'in ("etiket bozulduğunda kod elle girme") öngördüğü yedek akış, demo için de geçerli plan B'dir — `docs/sunum-senaryosu.md:20-22` zaten bu yedeği anlatır.
- **Kapsam dışı**: çok belediyeli, production deploy, HTTPS/ngrok, port değişikliği, iOS/Android uygulaması — hiçbiri bu planın konusu değil.
