# Sunum Senaryosu — 8 Dakikalık Canlı Demo

Bu doküman, ParkTakip MVP'sinin birim yöneticisine sunulacak 8 dakikalık canlı demo akışını
anlatır. Akışta gerçek QR okutma vardır; yedek plan ekran kaydıyla devam eder. Dokümandaki her
sayı `npm run db:seed` çıktısıyla (2 park, 40 demirbaş, 53 bildirim) birebir tutarlıdır.

---

## Hazırlık Kontrol Listesi (Sunumdan Önce)

- [ ] Temiz makinede `npm install && npm run db:seed && npm run dev` çalışıyor
      (veritabanı sıfırdan kurulur; `http://localhost:3000` açılır)
- [ ] Telefon aynı Wi-Fi ağında; telefonun tarayıcısı `http://<makine-IP>:3000`'e erişebiliyor
      (localhost değil — makinenin LAN IP'si). README "Telefonla Canlı Demo" bölümündeki adımlar
      uygulanmış: `npm run lan-ip` ile IP öğrenildi, `.env` içinde `APP_URL` LAN IP yapıldı ve dev
      sunucusu yeniden başlatıldı, yönetici PowerShell'de `npm run demo:firewall` çalıştırıldı
      (Public ağdaysa `-Profile Any`). Telefonla açınca **sorun türü seçilebiliyor** olmalı —
      seçilemiyorsa dev asset'leri 403 alıyor demektir (`allowedDevOrigins` `next.config.ts`'te
      `APP_URL`'den türetilir; `.env` değiştiyse sunucuyu yeniden başlat)
- [ ] Etiketler `APP_URL` değişikliğinden SONRA yeniden yazdırıldı (eski basılmış etiketler
      localhost URL'i gömülü içerir — QR'lar render anında üretilir, yeniden yazdırma yeni URL'i
      otomatik gömler)
- [ ] `/panel/etiketler?parkId=<Cumhuriyet Parkı id>` adresi yazdırılmış fiziksel etiket
      (örnek çıktı: `screenshots/asama4-etiket-ornegi.png`; yazdırma düzeni orada doğrulandı)
- [ ] Yedek plan: ekran kaydı başlatıldı (QR okutma canlı yapılamazsa kayıttan gösterilir);
      QR okutma sorun olursa kod elle `/q/BANK-0001` adresine yazılarak da gösterilebilir

> **Yedek:** Canlı QR okutma ağ sorunu yüzünden başarısız olursa panik yok — akışın 3–5'
> dilimi kod elle girişle ("Kod ile bildir" kutusu) tamamlanır, 5–7' dilimi ise panelden
> `BANK-0001` bildiriminin üstlenilip kapatılmasıyla gösterilir.

---

## 8 Dakikalık Akış

### 0–1' — Sorun ve Değer Önermesi

**Anlatım:** "Bugün vatandaşın arızası belediyeye ya telefonla ya sosyal medyadan ulaşıyor —
şikâyet defterinde kayboluyor, hangi parktaki hangi demirbaş olduğu belirsiz. ParkTakip şikâyeti
değil, **varlığı** kaydediyor: her bankın, her salıncağın dijital kimliği ve geçmişi var.
Bu sistem onarım yerine yenileme kararını veriyle savunmanızı sağlar."

**Gösterilecek:** Ana sayfa (proje genel bakış).

### 1–3' — Envanter + Etiket Yazdırma

**Anlatım:** "Demirbaşların tamamı kayıt altında — kod, tür, park, montaj tarihi."

**Gösterilecek:**
1. `/giris` → `yonetici` / `yonetici123`
2. `/panel/demirbaslar` — 40 demirbaşlık envanter (2 park: Cumhuriyet Parkı, Atatürk Parkı)
3. `/panel/etiketler?parkId=<Cumhuriyet Parkı id>` → "Etiketleri Göster" → yazdırma önizlemesi
   (A4, 12 etiket) → fiziksel etiketi kameralara göster

### 3–5' — Canlı QR Okutma → Bildirim → Panele Anında Yansıma

**Anlatım:** "Bu etiketi salıncakta yapışık düşünün. Vatandaş QR'ı okutuyor, fotoğraf çekip
bildiriyor."

**Gösterilecek:**
1. Telefonla fiziksel etiketin QR'ını okut → `/q/SALN-0001`
2. Sorun türü seç ("Kırık / Hasarlı") + fotoğraf + açıklama → "Gönder"
3. Takip numarası ekranı
4. Bilgisayarda paneli yenile → **Açık Bildirim 11** → `SALN-0001` satırı yukarıda

**Konuşma noktası (R2 itirazına yanıt):** "Bu sistem mevcut şikâyet kanallarının rakibi değil,
tamamlayıcısı. Telefon/müracaat kayıtları CİMER'e ya da çözüm merkezine gider; buradaki fark,
şikâyetin **hangi demirbaşın** hangi sorunu olduğunu tek fotoğrafla kayıt altına alması. Aynı
parktaki iki 'bank kırık' ihbarı, iki farklı varlık kaydı olur — biri çözülünce diğeri açık kalır."

### 5–7' — Üstlen → Onarım → QR ile Kapatma → Demirbaş AKTIF

**Anlatım:** "Personel bildirimi üstleniyor, sahadan fotoğraflı kapatıyor. Demirbaş otomatik
olarak AKTIF'e döner."

**Gösterilecek:**
1. `/panel/bildirimler` → açık `SALN-0001` bildirimi → detay → "Üstlen"
2. Aynı QR'ı girişli personelin tarayıcısında aç (`/q/SALN-0001`) → kapatma formu
   (fotoğraf + not) → "Onarıldı olarak kapat"
3. `/panel/demirbaslar` → `SALN-0001` durumu `AKTIF`

> Birden çok açık bildirimi olan demirbaşlarda kapatma yalnızca ilgili bildirimi kapatır;
> demirbaşın başka açık kaydı varsa `ARIZALI` kalır (iş kuralı).

### 7–8' — Gösterge Paneli: Veriye Dayalı Karar

**Anlatım:** "Şimdi sistemin asıl değeri — karar ekranı. Bu salıncak son 6 ayda 6. kez arızalandı;
ortalama çözüm süresi ve aylık trend onarım ile yenileme kararını sayıyla gösteriyor."

**Gösterilecek** (`/panel`):
1. Metrik kartları: **Açık Bildirim 11**, **Geciken Bildirim 5**, **Ortalama Çözüm Süresi**,
   **Toplam Bildirim 53**
2. **En Çok Arıza Veren Demirbaşlar** tablosu: `SALN-0001` ilk sırada, **6 bildirim**
   — "bu salıncak 6 ayda 6 kez arızalandı; sürekli kaynak yapmaktansa değiştirmek daha ekonomik"
3. Sorun Türü Dağılımı ve Park Bazında Dağılım (Açık/Kapalı) bar grafikleri
4. Aylık Trend (son 6 ay): açılan vs. kapanan çubukları

**Kapanış:** "Aşama tamamlandı; üç kritik akış (bildirim → üstlen → kapat) uçtan uca çalışıyor.
Gelecekte: harita görünümü, vatandaşa SMS, Excel/PDF rapor dışa aktarımı ve birim bazlı
yönlendirme planlanıyor." (PRD Bölüm 13)

---

## Konuşma Noktaları

- **"Şikâyet defteri neyin eksiği?"** — Defterde demirbaş kimliği yok; aynı sorunun kaç kez
  geldiği ölçülemez, çözüm süresi takip edilemez. ParkTakip her bildirimi bir demirbaşa bağlar.
- **"Mevcut kanalların rakibi mi?"** — Hayır, tamamlayıcısı. CİMER/müracaat kaydı süreç
  takibi içindir; QR akışı varlık bazlı teknik veri üretir. İkisi farklı işler yapar.
- **"Veriye dayalı karar ne?"** — `SALN-0001`: 6 ayda 6 arıza, toplam onarım süresi yaklaşık
  15 gün. Bir salıncağın değişim maliyeti ile tekrarlı kaynağın işçilik maliyeti
  karşılaştırılarak yenileme kararı verilir — sayıyla, kişisel kanaatle değil.
- **Güvenlik:** Vatandaş formu isimsizdir; fotoğraftan EXIF/GPS silinir (KVKK); hız sınırı ve
  tekilleştirme spam'i engeller; oturum httpOnly çerezde tutulur.

---

## Doğrulama Kriterleri (Demo Sonrası)

- [ ] Temiz makinede `npm install && npm run db:seed && npm run dev` → proje ayakta
- [ ] Gösterge panelindeki her sayı `npx prisma studio`'da `Report` tablosuyla birebir:
      Açık 11, Geciken 5, Toplam 53, SALN-0001 6 kayıt
- [ ] `SALN-0001` top-5 tablosunda 1. sırada; ortalama çözüm süresi `formatDurationTR` ile Türkçe
- [ ] 360px genişlikte gövde yatay taşması yok (grafikler iç kaydırmayla görünür)
- [ ] Canlı QR okutma ile bildirim açılıp QR ile kapatılabildi
