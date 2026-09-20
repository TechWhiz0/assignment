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
      <h1 className="text-3xl font-extrabold">Create a kit</h1>
      <p className="mt-1 text-slate-600">
        Paste one posting, or upload a JSON list to prepare for several roles.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border-2 border-border bg-card p-5">
        <label className="block text-sm font-semibold">
          Job description
          <textarea
            className="mt-1 min-h-40 w-full rounded-md border-2 border-border bg-background px-3 py-2"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Company website
          <input
            className="mt-1 min-h-11 w-full rounded-md border-2 border-border bg-background px-3"
            type="url"
            placeholder="https://company.com"
            value={company_url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Days until interview
          <input
            className="mt-1 min-h-11 w-28 rounded-md border-2 border-border bg-background px-3"
            type="number"
            min={1}
            max={60}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            required
          />
        </label>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 cursor-pointer rounded-md bg-accent px-5 font-bold text-white disabled:opacity-50"
        >
          {busy ? "Starting…" : "Generate kit"}
        </button>
      </form>
      <label className="mt-6 block text-sm font-semibold">
        Or upload several roles (JSON array)
        <input
          className="mt-2 block"
          type="file"
          accept="application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>
    </Shell>
  );
}
