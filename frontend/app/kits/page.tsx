"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
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

  if (!kits) return <div className="p-8">Loading kits…</div>;

  return (
    <Shell email={email}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Your kits</h1>
          <p className="text-slate-600">Each kit is private to this account.</p>
        </div>
        <Link
          href="/kits/new"
          className="min-h-11 rounded-md bg-accent px-4 py-2 font-bold text-white"
        >
          New kit
        </Link>
      </div>
      {kits.length === 0 ? (
        <p className="mt-10 rounded-lg border-2 border-dashed border-border bg-card p-8 text-slate-600">
          No kits yet. Paste a job description to generate one.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {kits.map((k) => (
            <li key={k.id}>
              <Link
                href={`/kits/${k.id}`}
                className="block rounded-lg border-2 border-border bg-card p-4 hover:border-primary"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{k.kit?.role.title || k.kit?.source.company || "Untitled kit"}</strong>
                  <span className="text-sm font-semibold uppercase text-primary">{k.status}</span>
                </div>
                <p className="text-sm text-slate-600">
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
