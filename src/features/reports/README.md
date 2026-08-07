# Reports Feature (Vatandaş Bildirim Akışı)

QR etiketi okutan vatandaşın fotoğraflı arıza bildirimi göndermesini sağlar. Bildirim, QR'ın
işaret ettiği `/q/[code]` sayfasındaki formdan ya da ana sayfadaki "Kod ile bildir" kutusundan
açılır; `POST /api/public/reports` ucu kaydı yazar ve bir takip numarası döner.

## Ana Akışlar

### Bildirim Gönderme

1. `/q/[code]` sayfası `assetService.getAssetByCode` ile demirbaşı çözer; yoksa dostça "Kod
   bulunamadı" ekranı gösterir.
2. `ReportForm` (Client Component) sorun türü + zorunlu fotoğraf + isteğe bağlı açıklama/telefonu
   multipart olarak `POST /api/public/reports`'a gönderir.
3. Route, `createReportSchema` ile girdiyi sınırda doğrular (422 → `fields`), `photo`'yu `Buffer`'a
   çevirir ve `reportService.createReport`'u çağırır.
4. Servis: demirbaşı bulur → açık kayıt var mı bakar → açık varsa sayacı artırır, yoksa hız sınırını
   kontrol eder → fotoğrafı işler → transaction içinde yeni kaydı (veya tekrarı) yazar.
5. Yanıt: `201` (yeni) / `200` (tekrar) + `ticketNo` + kullanıcı mesajı. Form, teşekkür ekranına
   döner.

### Tekilleştirme

Demirbaşta `YENI` veya `ATANDI` durumunda açık bir kayıt varsa yeni kayıt **açılmaz**;
`duplicateCount` artırılır ve fotoğraf mevcut kayda eklenir. Vatandaş "Bu sorun zaten bildirilmiş."
mesajını görür. Kapalı kayıtlar (`ONARILDI`/`REDDEDILDI`) yeni kayıt açılmasını engellemez.

### Hız Sınırı

`core/rate-limit.ts` (bellek içi, kova tabanlı):

- Aynı IP + aynı demirbaş: 5 dakikada 1 **yeni** kayıt
- Aynı IP genel: saatte 20 bildirim

Açık kayıt varken hız sınırı **uygulanmaz** — tekilleştirme hız sınırından önce gelir (PRD UH-2:
aynı IP'den ikinci vatandaş da "kaydınız eklendi" görmelidir). Sayaçlar bellekte tutulur; sunucu
yeniden başlayınca sıfırlanır (demo için kabul).

### Fotoğraf Boru Hattı

`photos.ts` → `processPhoto`: magic-byte doğrulaması (sharp `metadata()`) → `.rotate()` (EXIF
yönünü piksele uygular) → maks. 1600px'e küçültme (`withoutEnlargement`) → WebP (%80 kalite).
`.withMetadata()` **çağrılmaz**, bu yüzden EXIF/GPS dahil tüm metadata çıktıda yok olur (KVKK
gereksinimi). `savePhoto` dosyayı `randomUUID()` adıyla `config.UPLOAD_DIR` altına yazar ve
`/uploads/<ad>` URL'sini döner (kullanıcı dosya adı asla kullanılmaz — path traversal koruması).

## İş Kuralları

- **Kod sınırda normalize edilir.** `schemas.ts` içindeki `normalizeAssetCode` transform'u
  `bank-147` / `BANK147` gibi serbest metni `BANK-0147`'ye çevirir; servis normalize edilmiş kodu
  alır. `/q/[code]` da kanonik koda `redirect` eder.
- **Açık kayıt → hız sınırı yok.** Tekilleştirme, spam kısıtının önüne geçer; aksi halde ikinci
  vatandaş 429 görürdü.
- **Fotoğraftan EXIF silinir.** KVKK gereği GPS/konum verisi sunucuda kalıcı olarak atılır.
- **10 MB üst sınır** ve yalnızca `image/jpeg|png|webp` kabul edilir (zod + magic-byte).

## Entegrasyon Noktaları

- **Aşama 3 (durum makinesi):** `Report.status` (`YENI → ATANDI → ONARILDI`, `REDDEDILDI`)
  servis katmanında yürütülecek; `ReportEvent` ve `User` modelleri eklenecek; `getOpenReport` panel
  listesinde de kullanılacak. `resolutionNote`, `resolvedPhoto`, `closedAt` alanları şemada
  hazırdır.
- **Aşama 4 (analitik):** `Report` sayımları, ortalama çözüm süresi (`closedAt - createdAt`) ve
  park/tür kırılımları bu tablodan üretilir.
- **`features/assets`:** `getAssetByCode` ve `normalizeAssetCode` çapraz dilim servis çağrısıyla
  yeniden kullanılır (repository'e atlanmaz).

## Test Notu

- `service.test.ts` gerçek SQLite test veritabanı kullanır (Prisma mock yok); `beforeEach` içinde
  `_resetRateLimits()` çağrılır — aksi halde bellekteki sayaç testler arası sızar.
- `photos.test.ts` görselleri sharp ile üretir (`sharp({ create })`) ve EXIF temizliğini
  `metadata().exif === undefined` ile kanıtlar.
- `ticketNo` SQLite'ın `autoincrement()`'i non-id alanlarda desteklememesinden dolayı
  `ReportCounter` atomik sayacından tahsis edilir (`repository.allocateTicketNo`) — Aşama 1'deki
  `AssetCodeCounter` deseninin birebir kopyası.
