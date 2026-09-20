"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function Shell({ email, children }: { email?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="min-h-dvh">
      <header className="border-b-2 border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/kits" className="text-lg font-extrabold tracking-tight text-primary">
            Prep Kit
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/kits/new"
              className="min-h-11 px-3 py-2 font-semibold text-accent hover:underline"
            >
              New kit
            </Link>
            {email ? <span className="hidden text-slate-600 sm:inline">{email}</span> : null}
            <button
              type="button"
              className="min-h-11 cursor-pointer px-3 py-2 font-semibold hover:underline"
              onClick={async () => {
                await api.logout();
                router.push("/");
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
