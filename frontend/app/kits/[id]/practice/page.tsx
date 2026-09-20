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

  if (!rec?.kit) {
    return <div className="flex min-h-dvh items-center justify-center text-[var(--muted)]">Loading practice…</div>;
  }
  if (!card) {
    return (
      <Shell email={email}>
        <p className="font-display text-2xl">No flashcards yet</p>
        <Link href={`/kits/${id}`} className="mt-3 inline-block font-semibold underline underline-offset-4">
          Back to kit
        </Link>
      </Shell>
    );
  }

  return (
    <Shell email={email}>
      <Link href={`/kits/${id}`} className="text-sm font-semibold text-[var(--muted)] underline underline-offset-4">
        Back to kit
      </Link>
      <p className="eyebrow mt-4">Flashcards</p>
      <h1 className="font-display mt-1 text-4xl">Practice</h1>
      <p className="mt-1 text-[var(--muted)]">
        {seen} of {order.length} cards seen. Next card is least confident / unseen.
      </p>

      {weak.length ? (
        <aside className="panel mt-5 border-[color-mix(in_oklab,var(--accent)_35%,var(--line))] p-5">
          <h2 className="font-display text-xl text-[var(--accent)]">Weak spots</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Cards you marked 1–2. Spend tomorrow here first.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {weak.slice(0, 8).map((c) => (
              <li key={c.id}>{c.front}</li>
            ))}
          </ul>
        </aside>
      ) : null}

      <article className="panel mt-6 p-7">
        <p className="eyebrow">Card {idx + 1}</p>
        <p className="font-display mt-3 text-3xl">{card.front}</p>
        {show ? (
          <p className="mt-5 border-t border-[var(--line)] pt-5 text-[var(--ink)]">{card.back || "No outline yet."}</p>
        ) : (
          <button type="button" className="btn btn-solid mt-8" onClick={() => setShow(true)}>
            Reveal answer
          </button>
        )}
        {show ? (
          <div className="mt-6">
            <p className="text-sm font-semibold">How confident?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className="btn btn-ghost !min-w-11 !px-0" onClick={() => rate(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Schedule</h2>
        <p className="text-sm text-[var(--muted)]">Your day-by-day plan from this kit.</p>
        <ul className="mt-4 space-y-2">
          {rec.kit.schedule.days.map((d) => (
            <li key={d.day} className="panel p-4">
              <strong>
                Day {d.day} · {d.minutes} min
              </strong>
              <p className="text-[var(--muted)]">{d.focus}</p>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
