import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/dal";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default async function GirisPage() {
  const user = await getCurrentUser();
  if (user) redirect("/panel");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Personel Girişi</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Panel erişimi için kullanıcı adı ve şifrenizle giriş yapın.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <LoginForm />
      </div>

      <Link
        href="/"
        className="text-center text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        Ana sayfaya dön
      </Link>
    </main>
  );
}
