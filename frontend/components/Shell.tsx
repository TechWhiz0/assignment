"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function Shell({ email, children }: { email?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5">
          <Link href="/kits" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="mark" aria-hidden />
            Prep Kit
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <Link href="/kits/new" className="btn btn-ghost !min-h-10 !px-3 !text-sm">
              New kit
            </Link>
            {email ? (
              <span className="hidden max-w-[12rem] truncate text-[var(--muted)] sm:inline">{email}</span>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost !min-h-10 !px-3 !text-sm"
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
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

export function statusBadge(status: string) {
  const cls =
    status === "ready"
      ? "badge badge-ready"
      : status === "failed"
        ? "badge badge-fail"
        : status === "queued" || status === "researching" || status === "generating"
          ? "badge badge-run"
          : "badge badge-muted";
  return <span className={cls}>{status}</span>;
}
