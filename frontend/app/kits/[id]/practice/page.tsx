"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, type Flashcard, type KitRecord } from "@/lib/api";

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [rec, setRec] = useState<KitRecord | null>(null);
  const [show, setShow] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api
      .me()
      .then((u) => setEmail(u.email))
      .catch(() => router.replace("/"));
    api
      .kit(id)
      .then(setRec)
      .catch(() => router.replace("/kits"));
  }, [id, router]);

  const order = useMemo(() => {
    const cards = rec?.kit?.flashcards ?? [];
    return [...cards].sort((a, b) => {
      const ca = rec?.practice[a.id]?.confidence ?? 0;
      const cb = rec?.practice[b.id]?.confidence ?? 0;
      const sa = rec?.practice[a.id]?.seen ? 1 : 0;
      const sb = rec?.practice[b.id]?.seen ? 1 : 0;
      if (sa !== sb) return sa - sb;
      if (ca && cb) return ca - cb;
      if (ca) return 1;
      if (cb) return -1;
      return 0;
    });
  }, [rec]);

  const card: Flashcard | undefined = order[idx];
  const seen = rec ? Object.values(rec.practice).filter((p) => p.seen).length : 0;
  const weak = rec ? order.filter((c) => (rec.practice[c.id]?.confidence ?? 6) <= 2) : [];

  async function rate(confidence: number) {
    if (!card) return;
    const next = await api.practice(id, card.id, confidence);
    setRec(next);
    setShow(false);
    setIdx((i) => (i + 1) % Math.max(1, order.length));
  }

  if (!rec?.kit) return <div className="p-8">Loading practice…</div>;
  if (!card) {
    return (
      <Shell email={email}>
        <p>This kit has no flashcards yet.</p>
        <Link href={`/kits/${id}`} className="underline">
          Back to kit
        </Link>
      </Shell>
    );
  }

  return (
    <Shell email={email}>
      <Link href={`/kits/${id}`} className="text-sm font-semibold underline">
        Back to kit
      </Link>
      <h1 className="mt-2 text-3xl font-extrabold">Practice</h1>
      <p className="text-slate-600">
        {seen} of {order.length} cards seen. Next card is least confident / unseen.
      </p>

      {weak.length ? (
        <aside className="mt-4 rounded-lg border-2 border-accent bg-card p-4">
          <h2 className="font-extrabold text-accent">Weak spots</h2>
          <p className="text-sm text-slate-600">Cards you marked 1–2. Spend tomorrow here first.</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {weak.slice(0, 8).map((c) => (
              <li key={c.id}>{c.front}</li>
            ))}
          </ul>
        </aside>
      ) : null}

      <article className="mt-6 rounded-lg border-2 border-border bg-card p-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">Card {idx + 1}</p>
        <p className="mt-2 text-xl font-bold">{card.front}</p>
        {show ? (
          <p className="mt-4 border-t-2 border-border pt-4">{card.back || "No outline yet."}</p>
        ) : (
          <button
            type="button"
            className="mt-6 min-h-11 cursor-pointer rounded-md bg-primary px-4 font-bold text-white"
            onClick={() => setShow(true)}
          >
            Reveal answer
          </button>
        )}
        {show ? (
          <div className="mt-6">
            <p className="text-sm font-semibold">How confident?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="min-h-11 min-w-11 cursor-pointer rounded-md border-2 border-border bg-background font-bold hover:border-primary"
                  onClick={() => rate(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      <section className="mt-8">
        <h2 className="text-xl font-extrabold">Schedule</h2>
        <p className="text-sm text-slate-600">Your day-by-day plan from this kit.</p>
        <ul className="mt-3 space-y-2">
          {rec.kit.schedule.days.map((d) => (
            <li key={d.day} className="rounded-lg border-2 border-border bg-card p-3">
              <strong>
                Day {d.day} · {d.minutes} min
              </strong>
              <p>{d.focus}</p>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
