import Link from "next/link";
import { config } from "@/core/config";

export default function KvkkPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Kişisel Verilerin İşlenmesi Aydınlatma Metni
      </h1>

      <section className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında,{" "}
          {config.MUNICIPALITY_NAME} tarafından park demirbaşlarındaki arızaların tespiti ve
          giderilmesi amacıyla çalışan vatandaş bildirim sistemi hakkında sizi bilgilendirmek
          isteriz.
        </p>
        <p>
          Bu sistemde, bildirim gönderirken yalnızca şu bilgiler işlenir: <strong>zorunlu</strong>{" "}
          olarak çektiğiniz arıza fotoğrafı ve <strong>isteğe bağlı</strong> olarak iletebileceğiniz
          telefon numarası ve açıklama metni. Adınız, soyadınız, TC kimlik numaranız veya adresiniz{" "}
          <strong>istenmez ve toplanmaz.</strong>
        </p>
        <p>
          Fotoğraflar, sunucuya ulaştığı anda küçültülerek WebP biçimine dönüştürülür ve fotoğraf
          dosyasındaki <strong>konum (GPS) ve diğer EXIF verileri sunucuda silinir</strong>. Bu
          sayede fotoğrafın çekildiği yer bilgisi sisteme kaydedilmez.
        </p>
        <p>
          Telefon numarası yalnızca, bildiriminizin sonucu hakkında sizinle iletişime geçilmesi
          gerekirse kullanılır. Fotoğraflar ve telefon bilgileri yalnızca{" "}
          {config.MUNICIPALITY_NAME} Park ve Bahçeler Müdürlüğü personeli tarafından görülür;
          üçüncü kişilerle paylaşılmaz.
        </p>
        <p>
          Kişisel verileriniz, bildiriminiz çözümlenip kapanana kadar saklanır. Kanunun ilgili
          maddeleri uyarınca verilerinize erişme, düzeltilmesini veya silinmesini isteme hakkına
          sahipsiniz.
        </p>
        <p>
          <Link className="underline" href="/">
            Ana sayfaya dön
          </Link>
        </p>
      </section>
    </main>
  );
}
