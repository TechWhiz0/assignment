"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell, statusBadge } from "@/components/Shell";
import { api, type KitRecord } from "@/lib/api";

export default function KitsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [kits, setKits] = useState<KitRecord[] | null>(null);

  useEffect(() => {
    api
      .me()
      .then((u) => {
        setEmail(u.email);
        return api.kits();
      })
      .then(setKits)
      .catch(() => router.replace("/"));
  }, [router]);

  if (!kits) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--muted)]">Loading kits…</div>
    );
  }

  return (
    <Shell email={email}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="font-display mt-1 text-4xl">Your kits</h1>
          <p className="mt-1 text-[var(--muted)]">Each kit is private to this account.</p>
        </div>
        <Link href="/kits/new" className="btn btn-solid">
          New kit
        </Link>
      </div>

      {kits.length === 0 ? (
        <div className="panel mt-10 border-dashed p-10 text-center">
          <p className="font-display text-2xl">No kits yet</p>
          <p className="mt-2 text-[var(--muted)]">Paste a job description to generate your first prep kit.</p>
          <Link href="/kits/new" className="btn btn-accent mt-6">
            Create a kit
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {kits.map((k) => (
            <li key={k.id}>
              <Link
                href={`/kits/${k.id}`}
                className="panel block p-5 transition hover:-translate-y-0.5 hover:border-[var(--line-strong)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-lg">
                    {k.kit?.role.title || k.kit?.source.company || "Untitled kit"}
                  </strong>
                  {statusBadge(k.status)}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {k.input.company_url} · {k.input.days} days
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
