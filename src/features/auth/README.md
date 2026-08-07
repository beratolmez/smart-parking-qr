# Auth Feature (Kimlik Doğrulama ve Roller)

Personel panelinin güvenliğini sağlar: kullanıcı adı + şifre girişi, httpOnly imzalı oturum
çerezi (JWT, `jose`) ve iki rol (`SAHA_GOREVLISI`, `YONETICI`) tabanlı yetkilendirme.

## Ana Akışlar

### Giriş

1. `/giris` sayfası oturumu kontrol eder; oturum varsa `/panel`'e yönlendirir, yoksa `LoginForm`
   gösterir.
2. `loginAction` (Server Action) `loginSchema` ile girdiyi doğrular → `authService.authenticate`
   kullanıcıyı bulur ve `bcrypt.compare` ile şifreyi doğrular.
3. Başarıda `session.createSession` JWT üretip httpOnly çereze yazar ve `/panel`'e yönlendirir.
4. Başarısızlıkta "Kullanıcı adı veya şifre hatalı." genel mesajı döner — hangi alanın yanlış
   olduğu söylenmez (kullanıcı varlığı bilgisi sızdırılmaz).

### Oturum

- `session.ts` (`server-only`): `createSessionToken`/`verifySessionToken` — `jose`
  `SignJWT`/`jwtVerify`, HS256, 7 gün geçerlilik. `createSession`/`destroySession` çerezi
  `(await cookies()).set/.delete` ile yönetir.
- Çerez: `httpOnly`, `sameSite: "lax"`, `path: "/"`, üretimde `secure`.
- `dal.ts` (`server-only`): `getCurrentUser` (React `cache` + DB), `requireUser` (oturumsuzsa
  `/giris`'e redirect), `requireRole` (rol uymazsa `forbidden()` → 403).

### Çıkış

`logoutAction` çerezi siler ve `/giris`'e yönlendirir. Panel header'ındaki "Çıkış" butonu bir
Server Component `<form action={logoutAction}>` — ayrı client bileşen gerekmez.

## Roller

| Rol | Yetkiler |
|---|---|
| `SAHA_GOREVLISI` | Bildirimleri görür, üstlenir (`ATANDI`), kapatır (`ONARILDI`), QR ile kapatma yapar |
| `YONETICI` | Yukarıdakilerin tamamı + demirbaş/park yönetimi, etiket yazdırma, `REDDEDILDI` işaretleme |

Rol kontrolü hem UI'da (sayfada `requireRole`, gizlenen butonlar) hem de servis katmanında
tekrarlanır (`transitionReport` içindeki `REDDEDILDI` kontrolü) — yalnızca UI'da düğme gizlemek
yeterli sayılmaz (PRD 9.1).

## Güvenlik Notları

- **Şifreler** `bcryptjs` ile cost 12'de hashlenir (`hashPassword`); düz metin asla saklanmaz
  veya loglanmaz. Cost 12 ~300-500ms — demo + güvenlik dengesi için kabul edilir.
- **JWT payload'ı** yalnızca `{ userId, role }` içerir — şifre/telefon vb. kişisel veri konmaz.
  Rol JWT'ye gömülür ama **güvenilmez**: `getCurrentUser` her istekte kullanıcıyı DB'den çeker,
  rol değişiklikleri anında yansır.
- **DTO prensibi:** `getReportById` içindeki `events.actor` select'i yalnızca `id`, `fullName`,
  `username` döner — `passwordHash` hiçbir sorguda istemciye sızmaz.
- **Kullanıcı listesi açığa çıkmaz:** `authenticate` hem olmayan kullanıcıda hem yanlış şifrede
  aynı mesajı üretir.

## Test Notu

- `service.test.ts`: gerçek SQLite üzerinde `hashPassword`/`authenticate` başarı/başarısızlık ve
  sızdırmayan hata mesajı. Kullanıcı, `hashPassword` ile üretilen hash ile `prisma.user.create`
  üzerinden yazılır.
- `session.test.ts`: yalnızca `createSessionToken`/`verifySessionToken`'ı test eder (roundtrip,
  geçmiş süreli token → null, kurcalanmış token → null). `createSession`/`destroySession` **test
  edilmez** çünkü `cookies()` yalnızca Next.js request bağlamında çalışır — vitest düz Node
  ortamındadır.
- `forbidden()` (Next 16) deneyseldir; `next.config.ts` → `experimental.authInterrupts: true`
  gerektirir (bkz. kök `README.md` tuzakları).
