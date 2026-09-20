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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-3xl font-extrabold">Create account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border-2 border-border bg-card p-5">
        <label className="block text-sm font-semibold">
          Email
          <input
            className="mt-1 min-h-11 w-full rounded-md border-2 border-border bg-background px-3"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Password (8+ characters)
          <input
            className="mt-1 min-h-11 w-full rounded-md border-2 border-border bg-background px-3"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
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
          className="min-h-11 w-full cursor-pointer rounded-md bg-primary font-bold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Register"}
        </button>
      </form>
      <Link href="/" className="mt-4 text-sm font-semibold underline">
        Back to sign in
      </Link>
    </div>
  );
}
