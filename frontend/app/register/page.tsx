"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, type ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.register(email, password);
      router.push("/kits");
    } catch (err) {
      setError((err as ApiError).message || "Could not register");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="mark" aria-hidden />
        <span className="font-semibold">Prep Kit</span>
      </div>
      <p className="eyebrow">Get started</p>
      <h1 className="font-display mt-2 text-4xl">Create account</h1>
      <p className="mt-2 text-[var(--muted)]">Your kits stay private to this email.</p>

      <form onSubmit={onSubmit} className="panel mt-8 space-y-4 p-6">
        <label className="block text-sm font-semibold">
          Email
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Password (8+ characters)
          <input
            className="field"
            type="password"
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
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <Link href="/" className="mt-5 text-sm font-semibold underline underline-offset-4">
        Back to sign in
      </Link>
    </div>
  );
}
