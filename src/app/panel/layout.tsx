import Link from "next/link";
import { config } from "@/core/config";
import { requireUser } from "@/features/auth/dal";
import { logoutAction } from "@/features/auth/actions";
import { ROLE_LABELS } from "@/features/auth/constants";

const NAV_ITEMS = [
  { href: "/panel", label: "Gösterge Paneli" },
  { href: "/panel/bildirimler", label: "Bildirimler" },
  { href: "/panel/demirbaslar", label: "Demirbaşlar" },
  { href: "/panel/etiketler", label: "Etiketler" },
];

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-200 print:hidden dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {config.MUNICIPALITY_NAME}
          </span>
          <nav aria-label="Panel gezinme" className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-2 py-1 text-sm font-medium text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{user.fullName}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{ROLE_LABELS[user.role]}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
