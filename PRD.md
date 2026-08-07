# ParkTakip — Ürün Gereksinim Dokümanı (PRD)

**Park Envanter ve Bakım Takip Sistemi (QR Kodlu)**

| | |
|---|---|
| **Sürüm** | 1.0 |
| **Tarih** | 7 Ağustos 2026 |
| **Durum** | Taslak — geliştirmeye hazır |
| **Kapsam** | MVP (4 haftalık staj projesi) |
| **Hedef** | Çalışan demo + gerçekçi saha senaryosu |

---

## 1. Yönetici Özeti

Belediyelerin park ve yeşil alanlarındaki demirbaşları — banklar, çocuk oyun grupları, açık hava spor aletleri, çöp kutuları, aydınlatma direkleri — bugün büyük ölçüde **kâğıt üzerinde veya hiç** takip ediliyor. Bir bank kırıldığında sistem bunu ancak vatandaş şikâyet ederse ya da zabıta tesadüfen görürse öğreniyor. Şikâyet geldiğinde de "Atatürk Parkı'nda bir bank kırık" gibi belirsiz bir tarif geliyor; saha ekibi parka gidiyor, hangi bank olduğunu bulamıyor, boş dönüyor.

**ParkTakip**, her demirbaşa benzersiz bir kimlik veren QR etiket sistemidir. Vatandaş veya saha görevlisi telefonuyla etiketi okutur, açılan sayfa **hangi demirbaş olduğunu zaten bilir** — türü, parkı, koordinatı, montaj tarihi ve önceki arıza geçmişiyle birlikte. Kullanıcı yalnızca sorunu seçer ve fotoğraf yükler. Bildirim ilgili birime düşer; saha ekibi onarımdan sonra **aynı QR'ı okutarak** kaydı kapatır. Böylece bakım döngüsü baştan sona kapanır ve her demirbaş için ölçülebilir bir geçmiş birikir.

**Ürünün ayırt edici noktası bir şikâyet kanalı olması değildir.** Belediyelerin zaten Çözüm Merkezi, Beyaz Masa, CİMER ve mobil uygulamaları var. ParkTakip'in bu kanalların hiçbirinin yapamadığı şeyi yapar: **varlık bazında kayıt tutar.** "Bu salıncak son 6 ayda 3. kez arızalandı, yenilemek onarmaktan ucuz" cümlesini üretebilen tek sistem, hangi salıncak olduğunu bilen sistemdir.

### Değer Önermesi

> **"Şikâyeti değil, varlığı kaydediyoruz."**

Şikâyet formu, dijital demirbaş envanterinin üzerine oturan ince bir katmandır. Kalıcı değer envanterin kendisindedir — bu aynı zamanda belediyelerin taşınır mal ve demirbaş kayıt yükümlülüğüne de doğrudan hizmet eder.

### MVP Hedefi

4 hafta içinde, tek bir parkta gerçekten kullanılabilecek olgunlukta çalışan bir web uygulaması teslim etmek: yönetici demirbaşları sisteme girip QR etiketlerini A4 sayfaya basabilmeli, vatandaş etiketi okutup 30 saniyede fotoğraflı bildirim gönderebilmeli, saha görevlisi bildirimi görüp onarım sonrası kapatabilmeli, yönetici de ortalama çözüm süresini ve en çok arıza veren demirbaşları bir gösterge panelinde görebilmeli.

---

## 2. Misyon

### Misyon Bildirimi

Kamusal alandaki her demirbaşa dijital bir kimlik vererek, arızanın tespitinden onarımın doğrulanmasına kadar geçen süreci ölçülebilir ve şeffaf hale getirmek.

### Temel İlkeler

1. **Üyeliksiz erişim** — Vatandaş hiçbir uygulama indirmez, hiçbir hesap açmaz. QR kamerayla okunur, tarayıcı açılır, iş biter. Kayıt zorunluluğu getiren her adım bildirim sayısını düşürür.

2. **Kapanan döngü** — Bir bildirim yalnızca "alındı" değil, "onarıldı ve doğrulandı" durumuna ulaştığında tamamlanmış sayılır. Onarımı kaydeden kişi, sahada, aynı QR'ı okutarak kapatır. Bu, masa başından "kapattım" demenin önüne geçer.

3. **Varlık merkezli, şikâyet merkezli değil** — Sistemin ana varlığı demirbaştır (`Asset`); bildirim ona bağlı bir olaydır. Bu tercih, tüm raporlama yeteneğinin kaynağıdır.

4. **Mobil öncelikli** — Arayüz önce telefonda tasarlanır. Vatandaş sayfası tek ekrana sığmalı, saha görevlisi paneli tek elle ve güneş altında kullanılabilmeli.

5. **Kağıda geri dönüşe hazır** — QR kodun altında insan-okunur kod (`BANK-0147`) her zaman basılı olur. Etiket yıprandığında, kamera çalışmadığında veya internet yokken bu kod elle girilebilir.

---

## 3. Hedef Kullanıcılar

### 3.1 Vatandaş (birincil)

| | |
|---|---|
| **Kim** | Parkı kullanan herkes — çocuğuyla gelen ebeveyn, spor yapan emekli, oturan öğrenci |
| **Teknik seviye** | Düşük. Telefon kamerasıyla QR okutabilir; uygulama indirmez, hesap açmaz |
| **İhtiyaç** | Gördüğü sorunu hızlıca bildirmek ve "gerçekten bir yere ulaştı mı?" sorusunun cevabını almak |
| **Acı noktası** | Mevcut şikâyet hatları uzun form ister, üyelik ister, konum tarifi ister; çoğu kişi yarıda bırakır |
| **Başarı** | 30 saniyede bildirim gönderilir, ekranda takip numarası ve "Park Bahçeler Müdürlüğü'ne iletildi" mesajı görünür |

### 3.2 Saha Görevlisi — Park ve Bahçeler Müdürlüğü (birincil)

| | |
|---|---|
| **Kim** | Onarımı fiilen yapan ekip üyesi |
| **Teknik seviye** | Orta. Kurum telefonundan çalışır, masa başına oturmaz |
| **İhtiyaç** | Bugün hangi parkta ne yapacağını görmek; işi bitirince kaydı kapatmak |
| **Acı noktası** | "Parkta bir bank kırık" bildirimiyle sahaya gidip hangi bank olduğunu bulamamak |
| **Başarı** | Bildirimde demirbaşın kodu, fotoğrafı ve koordinatı hazır; onarım sonrası aynı QR okutulup kayıt kapanır |

### 3.3 Birim Yöneticisi (ikincil)

| | |
|---|---|
| **Kim** | Park ve Bahçeler Müdürü / şef |
| **Teknik seviye** | Orta. Bilgisayardan çalışır, rapor ve tablo okur |
| **İhtiyaç** | Envanteri yönetmek, etiket bastırmak, ekibin performansını ve bütçe kararlarını verilerle desteklemek |
| **Acı noktası** | Kaç bank olduğunu, hangisinin ne zaman değiştiğini kimse kesin bilmiyor; bütçe talebi hissiyatla yazılıyor |
| **Başarı** | "Cumhuriyet Parkı'ndaki salıncaklar ortalama 40 günde bir arızalanıyor" gibi bir cümleyi ekrandan okuyabilmek |

---

## 4. MVP Kapsamı

### 4.1 Kapsam İçi

**Temel İşlevsellik**

- ✅ Demirbaş envanteri — ekleme, düzenleme, listeleme, arşivleme (park, tür, kod, konum, montaj tarihi, marka, fotoğraf)
- ✅ Park kayıtları — ad, mahalle, merkez koordinatı
- ✅ Otomatik benzersiz kod üretimi (`BANK-0147`, `OYUN-0023`) ve QR görseli üretimi
- ✅ A4 yazdırılabilir etiket sayfası (sayfa başına 12 etiket; QR + insan-okunur kod + belediye adı)
- ✅ Üyeliksiz vatandaş bildirim sayfası (`/q/[kod]`) — sorun tipi seçimi, **zorunlu fotoğraf**, isteğe bağlı açıklama ve iletişim
- ✅ Bildirim tekilleştirme — aynı demirbaşta açık kayıt varsa yeni kayıt açılmaz, mevcut kaydın tekrar sayacı artar
- ✅ Personel paneli — bildirim listesi, filtreleme (park / durum / tür), detay görünümü
- ✅ Durum geçişleri: `YENI → ATANDI → ONARILDI` (+ `REDDEDILDI`), her geçişte kim/ne zaman/not kaydı
- ✅ QR ile onarım kapatma — saha görevlisi giriş yapmışken QR okutunca "Onarıldı olarak kapat" seçeneği çıkar
- ✅ Gösterge paneli — açık bildirim sayısı, ortalama çözüm süresi, en çok arıza veren 5 demirbaş, park bazında dağılım, tür bazında dağılım
- ✅ Kullanıcı adı + şifre girişi, 2 rol: `SAHA_GOREVLISI`, `YONETICI`
- ✅ Demo verisi (seed): 1 park, ~35 demirbaş, 20 örnek bildirim (çeşitli durum ve tarihlerde)

**Teknik**

- ✅ Türkçe arayüz, mobil öncelikli responsive tasarım
- ✅ Fotoğraf yükleme: yeniden boyutlandırma + EXIF konum verisi temizleme
- ✅ Hız sınırı (rate limit): aynı IP, aynı demirbaş için 5 dakikada 1 bildirim
- ✅ Tüm girdiler için Zod ile şema doğrulaması
- ✅ Servis katmanı için birim testleri, kritik akışlar için uçtan uca test
- ✅ Tek komutla ayağa kalkan geliştirme ortamı (`npm run dev`)

**Dokümantasyon**

- ✅ README (kurulum, çalıştırma, mimari özeti)
- ✅ Her özellik dizininde kısa README (akışlar, iş kuralları)
- ✅ Sunum senaryosu ve demo adımları

### 4.2 Kapsam Dışı (MVP'de yapılmayacak)

- ❌ **Mobil uygulama (iOS/Android)** — QR zaten tarayıcıyı açar. Uygulama indirme zorunluluğu bildirim sayısını düşürür ve staj süresini iki katına çıkarır.
- ❌ **Harita üzerinde ısı haritası / küme görünümü** — Faz 2. MVP'de koordinat kaydedilir ama harita görselleştirmesi yapılmaz (konum, Google Maps bağlantısı olarak sunulur).
- ❌ **SMS / e-posta bildirimi** — Vatandaşa durum güncellemesi göndermek altyapı (SMS sağlayıcı sözleşmesi) gerektirir.
- ❌ **CİMER / Çözüm Merkezi / kurumsal EBYS entegrasyonu** — Kurum BT ekibiyle protokol gerektirir, staj süresine sığmaz.
- ❌ **İş emri, malzeme stoğu, personel puantajı** — Farklı bir ürünün konusu.
- ❌ **Çok belediyeli (multi-tenant) yapı** — Tek kurum varsayılır.
- ❌ **Çevrimdışı (offline) çalışma / PWA senkronizasyonu** — Parklarda kapsama genelde vardır; karmaşıklığı kazandırdığından fazla.
- ❌ **Vatandaş hesabı, bildirim geçmişi, puanlama/rozet** — Üyeliksiz olması temel ilkedir.

---

## 5. Kullanıcı Hikâyeleri

### UH-1 — QR okutup bildirim gönderme

> **Vatandaş** olarak, kırık banktaki QR kodu okutup fotoğraf yükleyerek bildirim göndermek istiyorum ki **hangi bank olduğunu tarif etmek zorunda kalmayayım.**

**Örnek:** Ayşe, Cumhuriyet Parkı'nda oturduğu bankın ayağının kırık olduğunu görür. Bankın kolçağındaki etiketi telefonuyla okutur. Açılan sayfada "Cumhuriyet Parkı — Ahşap Bank (BANK-0147)" yazar. "Kırık / Hasarlı" seçer, fotoğraf çeker, gönder'e basar. Ekranda **#2451** takip numarası ve "Park ve Bahçeler Müdürlüğü'ne iletildi" mesajı çıkar. Toplam süre: 28 saniye.

### UH-2 — Aynı sorunun tekrar tekrar kaydedilmemesi

> **Birim yöneticisi** olarak, aynı demirbaş için gelen tekrar bildirimlerin ayrı kayıt açmamasını istiyorum ki **liste 40 kişinin bildirdiği tek bir kırık salıncakla dolmasın.**

**Örnek:** Aynı kırık bank için gün içinde 6 kişi daha bildirim gönderir. Sistem yeni kayıt açmaz; #2451 kaydının tekrar sayacını 7 yapar ve fotoğrafları o kayda ekler. Vatandaşa "Bu sorun zaten bildirilmiş, kaydınız eklendi (#2451)" mesajı gösterilir. Panelde kayıt "7 kişi bildirdi" rozetiyle listenin üstüne çıkar.

### UH-3 — Sahada onarımı kaydetme

> **Saha görevlisi** olarak, onarımı bitirdiğimde aynı QR'ı okutup kaydı kapatmak istiyorum ki **ofise dönüp form doldurmak zorunda kalmayayım.**

**Örnek:** Mehmet bankın ayağını kaynaklar. Girişli olduğu telefonundan aynı QR'ı okutur; sayfada vatandaş formu yerine "Açık bildirim: #2451 — Onarıldı olarak kapat" düğmesi çıkar. Basar, isterse çözüm notu ("ayak kaynak yapıldı") ve onarım fotoğrafı ekler. Kayıt kapanır, çözüm süresi otomatik hesaplanır: 2 gün 4 saat.

### UH-4 — Demirbaşın geçmişini görme

> **Saha görevlisi** olarak, bir demirbaşın önceki arızalarını görmek istiyorum ki **aynı sorunun tekrar edip etmediğini anlayabileyim.**

**Örnek:** Mehmet #2451'i açtığında demirbaş kartında "Bu demirbaş için son 12 ayda 3 bildirim: 04.02 kırık (onarıldı), 19.04 boya döküntüsü (onarıldı), 07.08 kırık (açık)" listesini görür. Aynı arızanın üçüncü tekrarı olduğunu fark eder, yenileme talebi açar.

### UH-5 — Envantere demirbaş ekleme ve etiket bastırma

> **Birim yöneticisi** olarak, yeni demirbaşları sisteme girip QR etiketlerini toplu yazdırmak istiyorum ki **sahaya çıkıp yapıştırabileyim.**

**Örnek:** Yönetici Cumhuriyet Parkı'na 12 yeni bank ekler; sistem `BANK-0148`…`BANK-0159` kodlarını otomatik üretir. "Etiket Yazdır" ekranından bu 12 demirbaşı seçer, A4 çıktı alır (sayfa başına 12 etiket), yapışkanlı UV-lamine kâğıda bastırır.

### UH-6 — Yönetim raporunu okuma

> **Birim yöneticisi** olarak, hangi demirbaşların sürekli arıza verdiğini görmek istiyorum ki **onarım yerine yenileme kararını veriyle savunabileyim.**

**Örnek:** Gösterge panelinde "En çok arıza veren demirbaşlar" tablosunda `OYUN-0023 — Salıncak — 6 bildirim / 8 ay` satırını görür. Bütçe toplantısında bu ekranı gösterir.

### UH-7 — Ekip performansını izleme

> **Birim yöneticisi** olarak, ortalama çözüm süresini takip etmek istiyorum ki **ekibin yükünü ve gecikmeleri görebileyim.**

**Örnek:** Panelde "Ortalama çözüm süresi: 3,2 gün · 7 günden eski açık bildirim: 4 adet" görünür. Yönetici 4 gecikmiş kaydı tek tıkla filtreler.

### UH-8 — Etiket bozulduğunda erişim (teknik)

> **Vatandaş** olarak, QR okunmuyorsa etiketin altındaki kodu elle yazarak da bildirim yapmak istiyorum ki **yıpranmış etiket beni engellemesin.**

**Örnek:** Etiketin QR kısmı kazınmıştır ama `BANK-0147` yazısı okunur. Vatandaş sitenin ana sayfasındaki "Kod ile bildir" kutusuna kodu yazar, aynı forma ulaşır.

### 5.1 Teknik Kullanıcı Hikâyeleri

- **Geliştirici** olarak, `npm run dev` ile veritabanı dahil tüm ortamın ayağa kalkmasını istiyorum ki **sunum öncesi kurulum riski olmasın.**
- **Geliştirici** olarak, `npm run seed` ile gerçekçi demo verisi yüklemek istiyorum ki **boş ekran yerine dolu bir panel gösterebileyim.**
- **Geliştirici** olarak, bildirim yaşam döngüsünün servis testleriyle kaplı olmasını istiyorum ki **durum geçişi kuralları sunum sırasında bozulmasın.**

---

## 6. Mimari ve Desenler

### 6.1 Genel Yaklaşım

Tek Next.js uygulaması (App Router). Sunucu tarafı iş mantığı Route Handler ve Server Action'lar üzerinden çalışır; ayrı bir backend servisi yoktur. Bu tercih staj bağlamında bilinçlidir: tek repo, tek komut, tek deploy — sunum günü iki servis ayağa kaldırma riski ortadan kalkar.

Kod organizasyonu **dikey dilim (vertical slice)** yaklaşımını izler: bir özellikle ilgili her şey tek dizinde durur.

### 6.2 Dizin Yapısı

```
smart-qr/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                    # demo verisi
├── src/
│   ├── core/                      # evrensel altyapı
│   │   ├── db.ts                  # Prisma client (tekil örnek)
│   │   ├── auth.ts                # oturum, rol kontrolü
│   │   ├── config.ts              # ortam değişkenleri (zod ile doğrulanmış)
│   │   ├── logger.ts              # yapılandırılmış log
│   │   ├── rate-limit.ts          # IP + demirbaş bazlı hız sınırı
│   │   └── errors.ts              # temel hata sınıfları
│   │
│   ├── shared/                    # 3+ özellik kullanıyorsa buraya
│   │   ├── ui/                    # Button, Card, StatusBadge, EmptyState
│   │   ├── schemas.ts             # ortak zod parçaları (sayfalama vb.)
│   │   └── format.ts              # tarih/süre biçimlendirme (TR)
│   │
│   ├── features/
│   │   ├── assets/                # demirbaş envanteri
│   │   │   ├── service.ts         # iş mantığı, kod üretimi
│   │   │   ├── repository.ts      # Prisma sorguları
│   │   │   ├── schemas.ts         # zod giriş/çıkış şemaları
│   │   │   ├── qr.ts              # QR görseli + etiket düzeni
│   │   │   ├── components/
│   │   │   ├── service.test.ts
│   │   │   └── README.md
│   │   ├── reports/               # bildirim yaşam döngüsü
│   │   ├── auth/                  # giriş, oturum, roller
│   │   └── analytics/             # gösterge paneli metrikleri
│   │
│   └── app/
│       ├── page.tsx               # açılış + "kod ile bildir"
│       ├── q/[code]/page.tsx      # PUBLIC — QR açılış sayfası
│       ├── giris/page.tsx
│       ├── panel/
│       │   ├── layout.tsx         # rol koruması
│       │   ├── page.tsx           # gösterge paneli
│       │   ├── bildirimler/
│       │   ├── demirbaslar/
│       │   └── etiketler/         # yazdırma görünümü
│       └── api/
│           ├── public/reports/route.ts
│           ├── assets/…
│           └── reports/[id]/status/route.ts
├── tests/e2e/                     # Playwright — çapraz akışlar
└── public/uploads/                # yüklenen fotoğraflar (demo)
```

### 6.3 Katman Akışı

```
Sayfa / Route Handler / Server Action
        ↓  (girdi zod ile doğrulanır)
     service.ts        ← iş kuralları burada
        ↓
   repository.ts       ← yalnızca veri erişimi
        ↓
      Prisma → SQLite / Postgres
```

### 6.4 Tasarım İlkeleri

- **Dosya başına <300 satır.** Aşan dosya bölünür.
- **`core/` yalnızca evrensel altyapı.** Özelliğe özgü hiçbir şey buraya girmez.
- **Üç özellik kuralı.** Bir kod parçası 3 farklı dilimde gerekene kadar `shared/`'a taşınmaz; o zamana dek kopyalanır.
- **Doğrulama sınırda.** Her dış girdi (form, API gövdesi, URL parametresi) iş mantığına dokunmadan önce zod'dan geçer.
- **Rol kontrolü tek yerde.** `panel/layout.tsx` ve `core/auth.ts`; her sayfada tekrar edilmez.
- **Türkçe arayüz, İngilizce kod.** Kullanıcının gördüğü her metin Türkçe; değişken, tablo, fonksiyon adları İngilizce.
- **Durum geçişleri servis katmanında.** Geçerli olmayan geçiş (`ONARILDI → YENI`) servis seviyesinde reddedilir, UI'a güvenilmez.

---

## 7. Özellikler ve Veri Modeli

### 7.1 Veri Modeli

```prisma
model Park {
  id        String   @id @default(cuid())
  name      String                       // "Cumhuriyet Parkı"
  district  String                       // mahalle
  latitude  Float?
  longitude Float?
  assets    Asset[]
  createdAt DateTime @default(now())
}

model Asset {
  id           String      @id @default(cuid())
  code         String      @unique        // "BANK-0147" — QR'ın işaret ettiği kod
  type         AssetType
  park         Park        @relation(fields: [parkId], references: [id])
  parkId       String
  label        String?                    // "Doğu girişi, 3. bank"
  latitude     Float?
  longitude    Float?
  brand        String?
  installedAt  DateTime?
  status       AssetStatus @default(AKTIF)
  photoUrl     String?
  reports      Report[]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([parkId, status])
}

model Report {
  id             String       @id @default(cuid())
  ticketNo       Int          @unique @default(autoincrement())  // vatandaşa gösterilen numara
  asset          Asset        @relation(fields: [assetId], references: [id])
  assetId        String
  issueType      IssueType
  description    String?
  photoUrl       String
  reporterType   ReporterType @default(VATANDAS)
  reporterPhone  String?                                          // isteğe bağlı, KVKK aydınlatması ile
  status         ReportStatus @default(YENI)
  duplicateCount Int          @default(1)                         // "7 kişi bildirdi"
  resolutionNote String?
  resolvedPhoto  String?
  createdAt      DateTime     @default(now())
  closedAt       DateTime?
  events         ReportEvent[]

  @@index([assetId, status])
  @@index([status, createdAt])
}

model ReportEvent {
  id        String       @id @default(cuid())
  report    Report       @relation(fields: [reportId], references: [id])
  reportId  String
  fromStatus ReportStatus?
  toStatus  ReportStatus
  note      String?
  actor     User?        @relation(fields: [actorId], references: [id])
  actorId   String?
  createdAt DateTime     @default(now())
}

model User {
  id           String        @id @default(cuid())
  username     String        @unique
  passwordHash String
  fullName     String
  role         Role
  events       ReportEvent[]
  createdAt    DateTime      @default(now())
}

enum AssetType   { BANK OYUN_GRUBU SALINCAK KAYDIRAK TAHTEREVALLI SPOR_ALETI COP_KUTUSU AYDINLATMA CESME DIGER }
enum AssetStatus { AKTIF ARIZALI BAKIMDA HURDA }
enum IssueType   { KIRIK_HASARLI KIRLI BOYA_DOKUNTU TEHLIKELI EKSIK_CALINMIS DIGER }
enum ReportStatus{ YENI ATANDI ONARILDI REDDEDILDI }
enum ReporterType{ VATANDAS PERSONEL }
enum Role        { SAHA_GOREVLISI YONETICI }
```

**Tasarım notu:** `ReportEvent` tablosu MVP için fazlalık gibi görünebilir ama Bölüm 11'deki metriklerin tamamı buradan üretilir — ortalama çözüm süresi (`YENI` → `ONARILDI` arası), kimin kaç kayıt kapattığı, hangi aşamada beklendiği. `Report.closedAt` tek başına "kim kapattı, ne zaman atandı" sorularını cevaplayamaz.

### 7.2 Özellik Dilimleri

#### `features/assets` — Demirbaş Envanteri

| İşlev | Açıklama |
|---|---|
| Kod üretimi | Tür önekine göre sıradaki numara: `BANK-0148`. Çakışma olmaması için tekil sorgu içinde üretilir |
| CRUD | Ekleme, düzenleme, arşivleme (`HURDA`). Silme yok — geçmiş korunur |
| Toplu ekleme | "Cumhuriyet Parkı'na 12 bank ekle" → tek formda adet girilir, kodlar otomatik üretilir |
| QR üretimi | `qrcode` ile PNG/SVG. İçerik: `${APP_URL}/q/${code}` |
| Etiket sayfası | A4, sayfa başına 12 etiket (3×4). Her etikette: QR, insan-okunur kod, tür adı, belediye adı, "Arıza bildirmek için okutun" |
| Demirbaş kartı | Bilgiler + tam bildirim geçmişi + mevcut durum |

#### `features/reports` — Bildirim Yaşam Döngüsü

| İşlev | Açıklama |
|---|---|
| Vatandaş bildirimi | Sorun tipi + zorunlu fotoğraf + isteğe bağlı açıklama/telefon |
| Tekilleştirme | Demirbaşta `YENI`/`ATANDI` kaydı varsa yeni kayıt açılmaz; `duplicateCount` artar |
| Durum makinesi | `YENI → ATANDI → ONARILDI` · `YENI/ATANDI → REDDEDILDI`. Geçersiz geçiş servis katmanında reddedilir |
| Otomatik demirbaş durumu | Bildirim açıldığında `Asset.status = ARIZALI`; kapandığında `AKTIF` |
| QR ile kapatma | Girişli personel QR okutunca vatandaş formu yerine kapatma ekranı görür |
| Fotoğraf işleme | `sharp` ile maks. 1600px'e küçültme, EXIF (konum dahil) temizleme, WebP'ye çevirme |

#### `features/auth` — Kimlik ve Roller

| Rol | Yetkiler |
|---|---|
| `SAHA_GOREVLISI` | Bildirimleri görür, üstlenir (`ATANDI`), kapatır (`ONARILDI`), QR ile kapatma yapar |
| `YONETICI` | Yukarıdakilerin tamamı + demirbaş/park yönetimi, etiket yazdırma, kullanıcı ekleme, raporlar, `REDDEDILDI` işaretleme |

Şifreler `bcrypt` ile saklanır. Oturum httpOnly, `SameSite=Lax` çerezde tutulur.

#### `features/analytics` — Gösterge Paneli

| Metrik | Hesap |
|---|---|
| Açık bildirim | `status IN (YENI, ATANDI)` sayısı |
| Ortalama çözüm süresi | `ONARILDI` kayıtlarında `closedAt - createdAt` ortalaması |
| Geciken bildirimler | 7 günden uzun süredir açık kayıtlar |
| En çok arıza veren 5 demirbaş | `Report` sayısına göre `Asset` sıralaması (son 12 ay) |
| Park bazında dağılım | Park başına açık/kapalı bildirim |
| Tür bazında dağılım | `issueType` kırılımı |
| Aylık trend | Son 6 ay: açılan vs. kapanan bildirim |

---

## 8. Teknoloji Yığını

### Temel

| Katman | Teknoloji | Sürüm | Gerekçe |
|---|---|---|---|
| Çatı | Next.js (App Router) | 16.3 | Tek projede hem arayüz hem API; QR'ın açtığı sayfa sunucuda hızlı render edilir |
| Dil | TypeScript | 5.x | Durum makinesi ve enum'lar derleme zamanında güvence altına alınır |
| ORM | Prisma | 7.9 | Şema tek dosyada okunur — sunumda veri modelini göstermek kolay |
| Veritabanı | SQLite (geliştirme) / PostgreSQL (pilot) | — | SQLite tek dosya, kurulum yok. Prisma sayesinde Postgres'e geçiş şema değişikliği gerektirmez |
| Stil | Tailwind CSS | 4.3 | Mobil öncelikli düzen hızlı kurulur; ayrıca `print:` varyantı etiket yazdırma için birebir |
| Doğrulama | Zod | 4.4 | Form ve API şemaları tek kaynaktan |

> **Sürüm notu:** Next.js 16 ve Prisma 7 yakın tarihli büyük sürümlerdir ve önceki sürümlerden belirgin şekilde farklı çalışırlar (async `params`, Turbopack varsayılan, `prisma.config.ts` zorunluluğu, driver adapter). Ayrıntılar ve tuzaklar için `.claude/plans/asama-1-iskelet-envanter-qr.md`.

### Kütüphaneler

| Paket | Kullanım |
|---|---|
| `@prisma/adapter-better-sqlite3` | SQLite driver adapter — Prisma 7'de veritabanı bağlantısı için zorunlu |
| `qrcode` | QR görseli üretimi (PNG/SVG) — TypeScript tipleri için ayrıca `@types/qrcode` |
| `sharp` | Fotoğraf küçültme, WebP'ye çevirme, EXIF temizleme |
| `bcryptjs` | Şifre karma |
| `jose` | Oturum çerezi imzalama (JWT) |
| `date-fns` + `date-fns/locale/tr` | Türkçe tarih ve "3 gün önce" biçimlendirmesi |
| `recharts` | Gösterge paneli grafikleri |

### Geliştirme

| Paket | Kullanım |
|---|---|
| `vitest` | Servis katmanı birim testleri |
| `@playwright/test` | Uçtan uca akış testleri |
| `eslint` + `prettier` | Kod standardı |
| `tsx` | Seed betiğini çalıştırma |

### Üçüncü Taraf Servis

**Yok.** MVP hiçbir harici servise bağımlı değildir — SMS sağlayıcı, harita API'si, bulut depolama, ödeme sistemi kullanılmaz. Bu, sunum günü internet/anahtar sorunu riskini sıfırlar.

---

## 9. Güvenlik ve Yapılandırma

### 9.1 Kimlik Doğrulama ve Yetkilendirme

- Vatandaş tarafı (`/`, `/q/[code]`, `POST /api/public/reports`) **tamamen açık** — kimlik doğrulama yok, olması da istenmiyor.
- Panel tarafı (`/panel/*`, korumalı API'ler) oturum çerezi ister. `panel/layout.tsx` sunucu tarafında oturumu doğrular; oturumsuz istek `/giris`'e yönlenir.
- Rol kontrolü servis katmanında da tekrarlanır — yalnızca UI'da düğme gizlemek yeterli sayılmaz.
- Şifreler `bcrypt` (cost 12) ile saklanır. Düz metin şifre hiçbir yerde loglanmaz.

### 9.2 Kötüye Kullanım Önlemleri

| Önlem | Detay |
|---|---|
| Zorunlu fotoğraf | Fotoğrafsız bildirim kabul edilmez — asılsız ihbarın maliyetini artırır |
| Hız sınırı | Aynı IP + aynı demirbaş: 5 dakikada 1 bildirim. Aynı IP genel: saatte 20 bildirim |
| Tekilleştirme | Açık kayıt varsa yeni kayıt açılmaz; kötü niyetli tekrar gönderim liste kirletemez |
| Dosya kısıtı | Yalnızca `image/jpeg|png|webp`, maks. 10 MB, sunucu tarafında MIME doğrulaması |
| Reddetme akışı | Yönetici asılsız kaydı gerekçesiyle `REDDEDILDI` işaretler; kayıt silinmez, istatistikte ayrı tutulur |

### 9.3 KVKK ve Gizlilik

- İletişim bilgisi (telefon) **isteğe bağlıdır**; alanın yanında ne için kullanılacağı yazar.
- Yüklenen fotoğraflardan EXIF verisi (özellikle GPS konumu) sunucuda silinir.
- Bildirim formunun altında kısa aydınlatma metni bağlantısı bulunur.
- Vatandaştan ad, soyad, TC kimlik numarası veya adres **istenmez.**

### 9.4 Yapılandırma

Tüm ayarlar ortam değişkeni; `core/config.ts` içinde zod ile doğrulanır ve eksikse uygulama açılışta hata verir.

```bash
DATABASE_URL="file:./dev.db"          # pilot: postgresql://...
APP_URL="http://localhost:3000"       # QR içeriği bu adresten üretilir
SESSION_SECRET="…"                    # min. 32 karakter
UPLOAD_DIR="./public/uploads"         # pilot: nesne depolama
MUNICIPALITY_NAME="… Belediyesi"      # etiketlerde ve başlıkta görünür
```

### 9.5 Güvenlik Kapsamı

**Kapsam içi:** girdi doğrulama, SQL enjeksiyonu koruması (Prisma parametreli sorgular), XSS (React varsayılan kaçışlaması), dosya yükleme kısıtları, hız sınırı, şifre karma, httpOnly oturum çerezi.

**Kapsam dışı (pilot öncesi ele alınacak):** çok faktörlü kimlik doğrulama, denetim izi dışa aktarma, sızma testi, DDoS koruması, yedekleme/felaket kurtarma prosedürü, kurumsal SSO/LDAP entegrasyonu.

---

## 10. API Tanımı

### 10.1 Açık Uçlar (kimlik doğrulama yok)

#### `GET /q/[code]`
QR'ın açtığı sayfa. Sunucuda demirbaş bilgisini yükler ve rolü olan-olmayan kullanıcıya farklı ekran gösterir.

| Ziyaretçi | Görünen |
|---|---|
| Oturumsuz | Demirbaş bilgisi + bildirim formu (açık kayıt varsa "zaten bildirilmiş" uyarısı) |
| `SAHA_GOREVLISI` / `YONETICI` | Demirbaş kartı + açık bildirimler + "Onarıldı olarak kapat" |
| Geçersiz kod | "Bu kod bulunamadı" + kod ile arama kutusu |

#### `POST /api/public/reports`

```jsonc
// İstek — multipart/form-data
{
  "assetCode": "BANK-0147",
  "issueType": "KIRIK_HASARLI",
  "description": "Bankın sol ayağı kırılmış, oturulamıyor",  // isteğe bağlı
  "reporterPhone": "05551234567",                            // isteğe bağlı
  "photo": "<dosya>"                                         // zorunlu
}
```

```jsonc
// 201 Created — yeni kayıt
{ "ticketNo": 2451, "status": "YENI", "duplicate": false,
  "message": "Bildiriminiz Park ve Bahçeler Müdürlüğü'ne iletildi." }

// 200 OK — mevcut kayda eklendi
{ "ticketNo": 2451, "status": "ATANDI", "duplicate": true,
  "message": "Bu sorun zaten bildirilmiş. Kaydınız eklendi." }

// 404 — kod yok
{ "error": "ASSET_NOT_FOUND", "detail": "BANK-9999 kodlu demirbaş bulunamadı." }

// 429 — hız sınırı
{ "error": "RATE_LIMITED", "detail": "Çok sık bildirim gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin." }

// 422 — doğrulama
{ "error": "VALIDATION_ERROR", "fields": { "photo": "Fotoğraf zorunludur." } }
```

### 10.2 Korumalı Uçlar

| Metot | Yol | Rol | Açıklama |
|---|---|---|---|
| `GET` | `/api/assets` | her ikisi | Listeleme; `?parkId=&type=&status=&q=` |
| `POST` | `/api/assets` | `YONETICI` | Tek veya toplu ekleme (`count` alanıyla) |
| `PATCH` | `/api/assets/[id]` | `YONETICI` | Güncelleme |
| `GET` | `/api/assets/[id]/qr` | her ikisi | QR görseli (`?format=svg\|png&size=`) |
| `GET` | `/panel/etiketler?ids=…` | `YONETICI` | Yazdırılabilir A4 etiket sayfası |
| `GET` | `/api/reports` | her ikisi | Listeleme; `?status=&parkId=&overdue=true` |
| `GET` | `/api/reports/[id]` | her ikisi | Detay + olay geçmişi |
| `PATCH` | `/api/reports/[id]/status` | her ikisi (`REDDEDILDI` yalnızca `YONETICI`) | Durum geçişi |
| `GET` | `/api/analytics/summary` | `YONETICI` | Gösterge paneli metrikleri |

#### Örnek — durum geçişi

```jsonc
// PATCH /api/reports/clx…/status
{ "toStatus": "ONARILDI", "note": "Ayak kaynak yapıldı", "photo": "<dosya>" }

// 200
{ "id": "clx…", "ticketNo": 2451, "status": "ONARILDI",
  "closedAt": "2026-08-09T14:22:00Z", "resolutionHours": 52 }

// 409 — geçersiz geçiş
{ "error": "INVALID_TRANSITION", "detail": "ONARILDI durumundaki bir kayıt YENI yapılamaz." }
```

### 10.3 Hata Biçimi

Tüm hatalar aynı yapıda döner; yığın izi (stack trace) hiçbir zaman istemciye gönderilmez, sunucuda loglanır.

```jsonc
{ "error": "MAKINE_OKUNUR_KOD", "detail": "Kullanıcıya gösterilecek Türkçe mesaj", "fields": { } }
```

---

## 11. Başarı Kriterleri

### 11.1 MVP Başarı Tanımı

Sunum günü, salondaki bir kişinin telefonuyla gerçek bir QR etiketi okutup bildirim gönderebilmesi; bu bildirimin projeksiyondaki panelde anında görünmesi; sunum yapanın onu "onarıldı" olarak kapatıp gösterge panelinde çözüm süresinin güncellendiğini göstermesi.

### 11.2 İşlevsel Gereksinimler

- ✅ Yönetici demirbaş ekleyebiliyor ve kodu otomatik üretiliyor
- ✅ A4 etiket sayfası yazdırılabiliyor, çıktıdaki QR gerçek bir telefonla okunuyor
- ✅ QR okutulduğunda doğru demirbaş bilgisi açılıyor
- ✅ Fotoğraflı bildirim kaydediliyor ve takip numarası dönüyor
- ✅ İkinci bildirim yeni kayıt açmıyor, sayaç artıyor
- ✅ Personel bildirimi üstlenip kapatabiliyor
- ✅ Kapatma sonrası demirbaş durumu `AKTIF`'e dönüyor
- ✅ Gösterge paneli 7 metriğin tamamını gerçek veriden hesaplıyor
- ✅ `SAHA_GOREVLISI` rolü demirbaş ekleme ekranlarına erişemiyor
- ✅ Etiket kodu elle girilerek de forma ulaşılabiliyor

### 11.3 Ölçülebilir Hedefler

| Ölçüt | Hedef |
|---|---|
| QR okutmadan gönderim onayına | ≤ 30 saniye (5 kişilik kullanılabilirlik testi ortalaması) |
| `/q/[code]` sayfası ilk render | ≤ 1,5 sn (3G benzeri koşulda) |
| Demo verisi | 1 park, ≥ 35 demirbaş, ≥ 20 bildirim (çeşitli durum/tarihte) |
| Servis katmanı test kapsamı | Bildirim durum makinesi ve kod üretimi %100 |
| Uçtan uca test | 3 kritik akış (bildirim gönder · tekilleştirme · kapat) |
| Mobil kullanılabilirlik | 360px genişlikte yatay kaydırma yok |

### 11.4 Kullanıcı Deneyimi Hedefleri

- Vatandaş formu tek ekranda; kaydırma gerekirse yalnızca gönder düğmesi için
- Sorun tipleri metin değil, ikonlu büyük dokunma hedefleri (min. 44×44px)
- Her ekranda anlamlı boş durum mesajı ("Bu parkta açık bildirim yok")
- Tüm hata mesajları Türkçe, teknik terim içermeyen cümleler
- Yükleme sırasında ilerleme göstergesi — fotoğraf yükleme mobilde uzun sürebilir

---

## 12. Uygulama Aşamaları

### Aşama 1 — İskelet, Envanter ve QR (1. Hafta)

**Amaç:** Bir demirbaşı sisteme girip etiketini yazdırabilmek.

**Çıktılar**
- ✅ Next.js + TypeScript + Tailwind + Prisma kurulumu
- ✅ `core/` altyapısı: db, config, logger, errors
- ✅ Prisma şeması + ilk migration + seed betiği (1 park, 35 demirbaş)
- ✅ `features/assets`: repository, service (kod üretimi dahil), zod şemaları
- ✅ `/panel/demirbaslar` — liste, ekleme (tekil + toplu), düzenleme
- ✅ QR üretimi + `/panel/etiketler` A4 yazdırma görünümü

**Doğrulama:** Etiket sayfası yazdırılır, çıktıdaki QR gerçek telefonla okutulur ve doğru URL'e gider. Servis testleri: 100 demirbaş eklendiğinde kodlar çakışmıyor.

---

### Aşama 2 — Vatandaş Bildirim Akışı (2. Hafta)

**Amaç:** QR okutan vatandaşın fotoğraflı bildirim gönderebilmesi.

**Çıktılar**
- ✅ `/q/[code]` açık sayfası — demirbaş bilgisi + form
- ✅ `features/reports`: repository, service, tekilleştirme mantığı
- ✅ `POST /api/public/reports` + zod doğrulama + hata biçimi
- ✅ Fotoğraf yükleme: `sharp` ile küçültme, EXIF temizleme, WebP
- ✅ Hız sınırı (`core/rate-limit.ts`)
- ✅ Teşekkür ekranı + takip numarası
- ✅ Ana sayfada "kod ile bildir" kutusu
- ✅ KVKK aydınlatma metni

**Doğrulama:** Telefonla gerçek QR okutulur, fotoğraflı bildirim gönderilir, veritabanında kayıt doğrulanır. İkinci bildirim yeni kayıt açmaz — birim testi + manuel kontrol. Fotoğrafın EXIF'inde GPS kalmadığı doğrulanır.

---

### Aşama 3 — Personel Paneli ve Döngü Kapanışı (3. Hafta)

**Amaç:** Bildirimin onarılıp kapatılabilmesi — ürünün kalbi.

**Çıktılar**
- ✅ `features/auth`: giriş sayfası, oturum çerezi, `panel/layout.tsx` rol koruması
- ✅ Seed'e 2 kullanıcı (bir saha görevlisi, bir yönetici)
- ✅ `/panel/bildirimler` — liste, filtreler, gecikme rozeti, tekrar sayacı rozeti
- ✅ Bildirim detay sayfası — fotoğraf, demirbaş kartı, geçmiş bildirimler, olay akışı
- ✅ Durum geçişleri + `ReportEvent` kaydı + geçersiz geçiş reddi
- ✅ `Asset.status` otomatik senkronizasyonu
- ✅ `/q/[code]` sayfasının personel görünümü — QR ile kapatma

**Doğrulama:** Uçtan uca akış: vatandaş bildirir → saha görevlisi üstlenir → QR okutup kapatır → demirbaş `AKTIF`'e döner. Playwright testi. `SAHA_GOREVLISI` ile `/panel/demirbaslar/yeni` açılmaya çalışılır, engellenir.

---

### Aşama 4 — Raporlama ve Sunum Hazırlığı (4. Hafta)

**Amaç:** Yöneticiye gösterilecek ekranı ve sunumu hazırlamak.

**Çıktılar**
- ✅ `features/analytics` — 7 metrik
- ✅ `/panel` gösterge paneli: metrik kartları, en çok arıza veren 5 demirbaş tablosu, park/tür dağılım grafikleri, 6 aylık trend
- ✅ Seed verisinin zenginleştirilmesi — geçmişe yayılmış gerçekçi tarihler (böylece "40 günde bir arızalanıyor" cümlesi demoda gerçekten çıkar)
- ✅ Mobil düzen gözden geçirmesi (360px)
- ✅ README + özellik README'leri
- ✅ Sunum senaryosu: canlı QR okutma dahil 8 dakikalık akış
- ✅ Örnek etiket çıktısı (yapıştırılmış fiziksel örnek)

**Doğrulama:** Baştan sona sunum provası yapılır; temiz bir makinede `npm install && npm run seed && npm run dev` ile proje ayağa kalkar. Gösterge panelindeki her sayı, veritabanından elle doğrulanır.

---

## 13. Gelecek Aşamalar

### Saha Pilotu (staj sonrası)

- Gerçek belediye onayı, UV dayanımlı vandal-proof etiket basımı
- PostgreSQL'e geçiş, kurum sunucusuna kurulum, yedekleme prosedürü
- Saha ekibine yarım günlük eğitim
- Tek parkta 1 ay ölçüm, sonuç raporu

### Ürün Geliştirmeleri

| Öncelik | Özellik |
|---|---|
| Yüksek | Harita görünümü — açık bildirimlerin park krokisi üzerinde konumu |
| Yüksek | Vatandaşa SMS ile "sorununuz çözüldü" bildirimi |
| Yüksek | Bildirim durumunun takip numarasıyla sorgulanabilmesi |
| Orta | Birim bazlı yönlendirme (Temizlik İşleri, Fen İşleri, Park Bahçeler ayrı kuyruklar) |
| Orta | Periyodik bakım takvimi — "her salıncak 6 ayda bir kontrol edilmeli" |
| Orta | Excel/PDF rapor dışa aktarma (meclis sunumları için) |
| Düşük | Demirbaş garanti/tedarikçi takibi, arıza sıklığına göre tedarikçi karnesi |
| Düşük | Açık veri portalı — anonim istatistiklerin kamuya açılması |

### Entegrasyon Fırsatları

- **CİMER / Çözüm Merkezi** — mevcut şikâyet kanalından gelen kayıtların demirbaş koduyla eşleştirilmesi
- **Kent Bilgi Sistemi (KBS/CBS)** — demirbaş konumlarının kurumsal harita katmanına aktarılması
- **Taşınır Mal Yönetim Sistemi** — envanterin resmi demirbaş kayıtlarıyla eşleşmesi

---

## 14. Riskler ve Önlemler

### R1 — Etiketler sahada bozulur, sökülür, vandalizme uğrar
**Etki:** Yüksek — sistem etiketsiz çalışmaz.
**Önlem:** UV dayanımlı, güçlü yapışkanlı lamine etiket kullanılır. QR'ın altına **insan-okunur kod her zaman basılır** — QR kazınsa bile kod elle girilebilir. Etiketler görünür ama kolay kazınmayacak yüzeye (bank kolçağının iç yüzü, direk gövdesi) yapıştırılır. Pilotta yıpranma oranı ölçülür; yenileme maliyeti raporlanır.

### R2 — "Bizim zaten şikâyet sistemimiz var" itirazı
**Etki:** Yüksek — proje daha sunumda reddedilebilir.
**Önlem:** Konumlandırma en baştan **envanter** üzerine kurulur (Bölüm 1). Sunumda mevcut sistemin yapamadığı somut şey gösterilir: demirbaş geçmişi ve "en çok arıza veren demirbaş" tablosu. Ayrıca ParkTakip mevcut kanalların rakibi değil, tamamlayıcısı olarak sunulur.

### R3 — Asılsız ve spam bildirimler
**Etki:** Orta — panel kirlenir, ekip güvenini kaybeder.
**Önlem:** Zorunlu fotoğraf, IP+demirbaş bazlı hız sınırı, açık kayıt varsa tekilleştirme. Yönetici gerekçeli `REDDEDILDI` işaretleyebilir; reddedilen kayıtlar istatistikten çıkarılır ama silinmez. Pilotta asılsız oranı ölçülür — %10'u aşarsa isteğe bağlı telefon doğrulaması gündeme alınır.

### R4 — Fotoğraf depolama
**Etki:** Orta — demo çalışır ama pilotta yer dolar / bulut ortamlarında dosyalar kaybolur.
**Önlem:** MVP'de yerel dosya sistemi (`public/uploads`) yeterlidir ve bilinçli tercihtir. Vercel gibi geçici dosya sistemli ortamlarda çalışmayacağı PRD'de ve README'de açıkça yazılır. Pilot öncesi nesne depolamaya (S3 uyumlu) geçiş, `features/reports` içindeki tek bir yükleme fonksiyonunu değiştirmeyi gerektirir.

### R5 — Kapsam kayması
**Etki:** Yüksek — staj süresi doludur, yarım kalan proje sunulamaz.
**Önlem:** Bölüm 4.2'deki kapsam dışı listesi bağlayıcıdır ve her maddenin reddedilme gerekçesi yazılıdır. "Mobil uygulama da yapalım", "harita ekleyelim" gibi talepler Bölüm 13'e (Gelecek Aşamalar) yönlendirilir. Her aşamanın çıktısı tek başına gösterilebilir olduğu için, süre yetmezse proje son tamamlanan aşamada sunulabilir.

### R6 — Sunum günü teknik arıza
**Etki:** Orta — çalışan proje çalışmıyormuş gibi görünür.
**Önlem:** MVP hiçbir harici servise bağımlı değildir. Sunum öncesi temiz makinede kurulum provası yapılır. İnternet kesintisine karşı `localhost` üzerinden çalışan yerel kurulum ve telefonun aynı ağa bağlanması yedek plandır. Ayrıca tüm akışın ekran kaydı önceden alınır.

---

## 15. Ek

### 15.1 Terimler Sözlüğü

| Terim | Karşılığı | Anlamı |
|---|---|---|
| Demirbaş | `Asset` | QR etiketi taşıyan fiziksel varlık (bank, salıncak, çöp kutusu) |
| Bildirim | `Report` | Bir demirbaşta tespit edilen sorun kaydı |
| Olay | `ReportEvent` | Bildirimin durum geçişi kaydı (kim, ne zaman, hangi durumdan hangisine) |
| Saha görevlisi | `SAHA_GOREVLISI` | Onarımı yapan ve kaydı kapatan personel |
| Takip numarası | `ticketNo` | Vatandaşa gösterilen kısa sayı (#2451) |
| Tekrar sayacı | `duplicateCount` | Aynı sorunu kaç kişinin bildirdiği |

### 15.2 Bağımlılıklar

| Bağımlılık | Kaynak |
|---|---|
| Next.js | https://nextjs.org/docs |
| Prisma | https://www.prisma.io/docs |
| Tailwind CSS | https://tailwindcss.com/docs |
| Zod | https://zod.dev |
| qrcode | https://github.com/soldair/node-qrcode |
| sharp | https://sharp.pixelplumbing.com |

### 15.3 Proje Dosya Yapısı

Bölüm 6.2'ye bakınız.

### 15.4 İlgili Dokümanlar

- `.claude/references/vertical-slice-architecture.md` — mimari ilkelerinin kaynağı
- `.claude/references/backend-api-best-practices.md` — API tasarım standartları (hata biçimi, durum kodları)
- `.claude/references/frontend-component-best-practices.md` — bileşen yapısı ve erişilebilirlik standartları

### 15.5 Komutlar

```bash
npm install          # bağımlılıklar
npx prisma migrate dev   # veritabanı şeması
npm run seed         # demo verisi
npm run dev          # geliştirme sunucusu (http://localhost:3000)
npm test             # birim testleri
npm run test:e2e     # uçtan uca testler
```

---

**Sonraki adım:** `/plan-feature` ile Aşama 1'in (İskelet, Envanter ve QR) ayrıntılı uygulama planını çıkarmak.
