"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, type ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(() => router.replace("/kits"))
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(email, password);
      router.push("/kits");
    } catch (err) {
      setError((err as ApiError).message || "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-dvh max-w-5xl lg:grid-cols-2">
      <section className="noise-dark relative hidden flex-col justify-between p-10 lg:flex">
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="mark" aria-hidden />
          Prep Kit
        </div>
        <div>
          <p className="eyebrow !text-[var(--dark-muted)]">Interview prep</p>
          <h1 className="font-display mt-3 max-w-md text-5xl text-[var(--dark-fg)]">
            Research the company. Practice the role.
          </h1>
          <p className="mt-4 max-w-sm text-[var(--dark-muted)]">
            Paste a job description. We crawl the company site, extract requirements, and build an editable prep kit.
          </p>
        </div>
        <p className="text-xs text-[var(--dark-muted)]">Private to your account · editable before interview day</p>
      </section>

      <section className="flex flex-col justify-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="mark" aria-hidden />
            <span className="font-semibold">Prep Kit</span>
          </div>
          <p className="eyebrow">Welcome back</p>
          <h1 className="font-display mt-2 text-4xl">Sign in</h1>
          <p className="mt-2 text-[var(--muted)]">Open your kits and keep preparing.</p>

          <form onSubmit={onSubmit} className="panel mt-8 space-y-4 p-6">
            <label className="block text-sm font-semibold">
              Email
              <input
                className="field"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Password
              <input
                className="field"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            {error ? (
              <p className="rounded-[var(--radius-sm)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className="btn btn-solid w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-sm text-[var(--muted)]">
            No account?{" "}
            <Link href="/register" className="font-semibold text-[var(--ink)] underline underline-offset-4">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
