"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, type ApiError } from "@/lib/api";

export default function NewKitPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [jd, setJd] = useState("");
  const [company_url, setUrl] = useState("");
  const [days, setDays] = useState(5);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((u) => setEmail(u.email))
      .catch(() => router.replace("/"));
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const kit = await api.createKit({ jd, company_url, days });
      router.push(`/kits/${kit.id}`);
    } catch (err) {
      setError((err as ApiError).message || "Could not start kit");
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    setError("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { jd: string; company_url: string; days?: number }[];
      if (!Array.isArray(parsed)) throw new Error("File must be a JSON array of { jd, company_url, days }");
      const { kits } = await api.batch(parsed);
      router.push(kits[0] ? `/kits/${kits[0].id}` : "/kits");
    } catch (err) {
      setError((err as ApiError).message || "Invalid batch file");
    }
  }

  return (
    <Shell email={email}>
      <p className="eyebrow">Create</p>
      <h1 className="font-display mt-1 text-4xl">New prep kit</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Paste one posting, or upload a JSON list to prepare for several roles at once.
      </p>

      <form onSubmit={onSubmit} className="panel mt-8 space-y-5 p-6">
        <label className="block text-sm font-semibold">
          Job description
          <textarea
            className="field min-h-44"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description…"
            required
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <label className="block text-sm font-semibold">
            Company website
            <input
              className="field"
              type="url"
              placeholder="https://company.com"
              value={company_url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            Days
            <input
              className="field"
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              required
            />
          </label>
        </div>
        {error ? (
          <p className="rounded-[var(--radius-sm)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className="btn btn-solid">
          {busy ? "Starting…" : "Generate kit"}
        </button>
      </form>

      <div className="panel mt-6 p-5">
        <p className="text-sm font-semibold">Or upload several roles</p>
        <p className="mt-1 text-sm text-[var(--muted)]">JSON array of {"{ jd, company_url, days }"}</p>
        <input
          className="mt-3 block w-full text-sm"
          type="file"
          accept="application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </div>
    </Shell>
  );
}
