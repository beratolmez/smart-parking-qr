"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CodeLookupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = code.trim();
        if (trimmed) router.push(`/q/${encodeURIComponent(trimmed)}`);
      }}
      className="flex w-full max-w-sm gap-2"
    >
      <label htmlFor="code-lookup" className="sr-only">
        Demirbaş kodu
      </label>
      <input
        id="code-lookup"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Örn. BANK-0147"
        autoCapitalize="characters"
        className="min-h-11 flex-1 rounded-full border border-zinc-300 px-4 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      <button
        type="submit"
        className="min-h-11 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Bildir
      </button>
    </form>
  );
}
