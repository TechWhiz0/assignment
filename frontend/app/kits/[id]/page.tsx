"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { api, type Kit, type KitRecord, type Question } from "@/lib/api";

const CATS = ["technical", "behavioural", "system-design", "company-fit"] as const;

export default function KitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [rec, setRec] = useState<KitRecord | null>(null);
  const [tab, setTab] = useState<"brief" | "role" | "questions" | "cards" | "schedule">("brief");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .me()
      .then((u) => setEmail(u.email))
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let stop = false;
    async function poll() {
      try {
        const next = await api.kit(id);
        if (stop) return;
        setRec(next);
        if (next.status === "queued" || next.status === "researching" || next.status === "generating") {
          t = setTimeout(poll, 1500);
        }
      } catch {
        if (!stop) setError("Could not load kit");
      }
    }
    poll();
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [id]);

  async function save(kit: Kit) {
    const next = await api.patchKit(id, kit);
    setRec(next);
  }

  async function regen(section: string) {
    setBusy(section);
    setError("");
    try {
      setRec(await api.regen(id, section));
    } catch (err) {
      setError((err as { message?: string }).message || "Regeneration failed");
    } finally {
      setBusy("");
    }
  }

  if (!rec) return <div className="p-8">Loading kit…</div>;

  const running = rec.status === "queued" || rec.status === "researching" || rec.status === "generating";

  return (
    <Shell email={email}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">{rec.status}</p>
          <h1 className="text-3xl font-extrabold">{rec.kit?.role.title || "Generating kit"}</h1>
          <p className="text-slate-600">{rec.input.company_url}</p>
        </div>
        {rec.kit ? (
          <Link
            href={`/kits/${id}/practice`}
            className="min-h-11 rounded-md bg-primary px-4 py-2 font-bold text-white"
          >
            Practice
          </Link>
        ) : null}
      </div>

      {running ? <Progress steps={rec.steps} /> : null}
      {rec.status === "failed" ? (
        <p className="mt-4 rounded-md border-2 border-red-300 bg-red-50 p-4 text-red-800" role="alert">
          {rec.error?.message || "Generation failed. Create a new kit and try again."}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-red-600">{error}</p> : null}

      {rec.kit ? (
        <>
          <div className="mt-6 flex flex-wrap gap-2" role="tablist">
            {(["brief", "role", "questions", "cards", "schedule"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`min-h-11 cursor-pointer rounded-md border-2 px-3 font-semibold capitalize ${
                  tab === t ? "border-primary bg-muted" : "border-border bg-card"
                }`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {tab === "brief" ? (
              <Brief
                kit={rec.kit}
                onSave={save}
                onRegen={() => regen("company_brief")}
                busy={busy === "company_brief"}
              />
            ) : null}
            {tab === "role" ? <Role kit={rec.kit} /> : null}
            {tab === "questions" ? (
              <Questions kit={rec.kit} onSave={save} onRegen={regen} busy={busy} />
            ) : null}
            {tab === "cards" ? <Cards kit={rec.kit} onSave={save} /> : null}
            {tab === "schedule" ? (
              <Schedule kit={rec.kit} onRegen={() => regen("schedule")} busy={busy === "schedule"} />
            ) : null}
          </div>
        </>
      ) : !running && rec.status !== "failed" ? (
        <p className="mt-8 text-slate-600">Nothing generated yet.</p>
      ) : null}
    </Shell>
  );
}

function Progress({ steps }: { steps: KitRecord["steps"] }) {
  const latest = useMemo(() => {
    const map = new Map<string, KitRecord["steps"][number]>();
    for (const s of steps) map.set(s.name, s);
    return [...map.values()];
  }, [steps]);
  return (
    <ol className="mt-6 space-y-2 rounded-lg border-2 border-border bg-card p-4">
      {latest.length === 0 ? <li>Queued… fetching and generating.</li> : null}
      {latest.map((s) => (
        <li key={s.name} className="flex flex-wrap gap-2 text-sm">
          <strong className="capitalize">{s.name.replaceAll("_", " ")}</strong>
          <span className="text-primary">{s.status}</span>
          {s.detail ? <span className="text-slate-600">{s.detail}</span> : null}
        </li>
      ))}
    </ol>
  );
}

function Brief({
  kit,
  onSave,
  onRegen,
  busy,
}: {
  kit: Kit;
  onSave: (k: Kit) => Promise<void>;
  onRegen: () => void;
  busy: boolean;
}) {
  const [summary, setSummary] = useState(kit.company_brief.summary);
  const [what, setWhat] = useState(kit.company_brief.what_they_do);
  return (
    <div className="space-y-3 rounded-lg border-2 border-border bg-card p-4">
      <label className="block text-sm font-semibold">
        Summary
        <textarea
          className="mt-1 min-h-28 w-full border-2 border-border px-3 py-2"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </label>
      <label className="block text-sm font-semibold">
        What they do
        <textarea
          className="mt-1 min-h-28 w-full border-2 border-border px-3 py-2"
          value={what}
          onChange={(e) => setWhat(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 cursor-pointer rounded-md bg-primary px-4 font-bold text-white"
          onClick={() =>
            onSave({ ...kit, company_brief: { ...kit.company_brief, summary, what_they_do: what } })
          }
        >
          Save brief
        </button>
        <button
          type="button"
          disabled={busy}
          className="min-h-11 cursor-pointer rounded-md border-2 border-border px-4 font-semibold disabled:opacity-50"
          onClick={onRegen}
        >
          {busy ? "Regenerating…" : "Regenerate brief"}
        </button>
      </div>
      <p className="text-xs text-slate-600">Sources: {kit.company_brief.sources.join(", ") || "none"}</p>
    </div>
  );
}

function Role({ kit }: { kit: Kit }) {
  return (
    <div className="space-y-3 rounded-lg border-2 border-border bg-card p-4">
      <p>
        <strong>Seniority:</strong> {kit.role.seniority || "—"}
      </p>
      <p>
        <strong>Location:</strong> {kit.source.location || "—"}
      </p>
      <h2 className="font-bold">Requirements</h2>
      <ul className="space-y-2">
        {kit.role.requirements.map((r) => (
          <li key={r.id} className="border-2 border-border p-2">
            <span className="mr-2 font-mono text-xs">{r.id}</span>
            <span className="mr-2 rounded bg-muted px-1 text-xs uppercase">{r.priority}</span>
            {r.text}
          </li>
        ))}
      </ul>
      {kit.coverage.uncovered_requirement_ids.length ? (
        <p className="text-sm text-accent">
          Uncovered musts after {kit.coverage.passes} pass(es):{" "}
          {kit.coverage.uncovered_requirement_ids.join(", ")}
        </p>
      ) : (
        <p className="text-sm text-primary">All must-have requirements have at least one question.</p>
      )}
    </div>
  );
}

function Questions({
  kit,
  onSave,
  onRegen,
  busy,
}: {
  kit: Kit;
  onSave: (k: Kit) => Promise<void>;
  onRegen: (s: string) => void;
  busy: string;
}) {
  function update(id: string, patch: Partial<Question>) {
    const questions = kit.questions.map((q) => (q.id === id ? { ...q, ...patch, edited: true } : q));
    onSave({ ...kit, questions });
  }
  function move(id: string, dir: -1 | 1) {
    const i = kit.questions.findIndex((q) => q.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= kit.questions.length) return;
    const questions = [...kit.questions];
    [questions[i], questions[j]] = [questions[j], questions[i]];
    onSave({ ...kit, questions });
  }
  function add() {
    const n = kit.questions.length + 1;
    const req = kit.role.requirements[0]?.id;
    if (!req) return;
    onSave({
      ...kit,
      questions: [
        ...kit.questions,
        {
          id: `q${n}`,
          requirement_ids: [req],
          category: "technical",
          prompt: "New question",
          answer_outline: "",
          difficulty: 2,
          origin: "user",
          edited: true,
        },
      ],
    });
  }
  function remove(id: string) {
    onSave({ ...kit, questions: kit.questions.filter((q) => q.id !== id) });
  }

  return (
    <div className="space-y-6">
      {CATS.map((cat) => {
        const items = kit.questions.filter((q) => q.category === cat);
        return (
          <section key={cat} className="rounded-lg border-2 border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-extrabold capitalize">{cat}</h2>
              <button
                type="button"
                disabled={!!busy}
                className="min-h-11 cursor-pointer text-sm font-semibold underline disabled:opacity-50"
                onClick={() => onRegen(`questions:${cat}`)}
              >
                {busy === `questions:${cat}` ? "Regenerating…" : "Regenerate category"}
              </button>
            </div>
            {items.length === 0 ? <p className="text-sm text-slate-600">No questions in this category.</p> : null}
            {items.map((q) => (
              <article key={q.id} className="mb-3 border-2 border-border p-3">
                <p className="text-xs text-slate-500">
                  {q.id} · covers {q.requirement_ids.join(", ")} ·{" "}
                  {q.origin === "user" || q.edited ? "pinned" : "generated"}
                </p>
                <textarea
                  className="mt-1 min-h-16 w-full border-2 border-border px-2 py-1"
                  value={q.prompt}
                  onChange={(e) => update(q.id, { prompt: e.target.value })}
                />
                <textarea
                  className="mt-1 min-h-16 w-full border-2 border-border px-2 py-1"
                  value={q.answer_outline}
                  onChange={(e) => update(q.id, { answer_outline: e.target.value })}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="text-sm">
                    Category
                    <select
                      className="ml-2 min-h-11 border-2 border-border bg-background"
                      value={q.category}
                      onChange={(e) => update(q.id, { category: e.target.value })}
                    >
                      {CATS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Difficulty
                    <input
                      type="number"
                      min={1}
                      max={3}
                      className="ml-2 w-16 min-h-11 border-2 border-border px-2"
                      value={q.difficulty}
                      onChange={(e) => update(q.id, { difficulty: Number(e.target.value) })}
                    />
                  </label>
                  <button type="button" className="min-h-11 cursor-pointer px-2 underline" onClick={() => move(q.id, -1)}>
                    Up
                  </button>
                  <button type="button" className="min-h-11 cursor-pointer px-2 underline" onClick={() => move(q.id, 1)}>
                    Down
                  </button>
                  <button
                    type="button"
                    className="min-h-11 cursor-pointer px-2 text-red-700 underline"
                    onClick={() => remove(q.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </section>
        );
      })}
      <button
        type="button"
        className="min-h-11 cursor-pointer rounded-md bg-accent px-4 font-bold text-white"
        onClick={add}
      >
        Add question
      </button>
    </div>
  );
}

function Cards({ kit, onSave }: { kit: Kit; onSave: (k: Kit) => Promise<void> }) {
  function update(id: string, front: string, back: string) {
    onSave({
      ...kit,
      flashcards: kit.flashcards.map((f) => (f.id === id ? { ...f, front, back, edited: true } : f)),
    });
  }
  function add() {
    const n = kit.flashcards.length + 1;
    onSave({
      ...kit,
      flashcards: [
        ...kit.flashcards,
        {
          id: `f${n}`,
          front: "New card",
          back: "",
          requirement_ids: kit.role.requirements[0] ? [kit.role.requirements[0].id] : [],
          origin: "user",
          edited: true,
        },
      ],
    });
  }
  return (
    <div className="space-y-3">
      {kit.flashcards.map((f) => (
        <div key={f.id} className="rounded-lg border-2 border-border bg-card p-3">
          <textarea
            className="min-h-16 w-full border-2 border-border px-2"
            value={f.front}
            onChange={(e) => update(f.id, e.target.value, f.back)}
          />
          <textarea
            className="mt-2 min-h-16 w-full border-2 border-border px-2"
            value={f.back}
            onChange={(e) => update(f.id, f.front, e.target.value)}
          />
          <button
            type="button"
            className="mt-2 min-h-11 cursor-pointer text-red-700 underline"
            onClick={() => onSave({ ...kit, flashcards: kit.flashcards.filter((x) => x.id !== f.id) })}
          >
            Delete card
          </button>
        </div>
      ))}
      <button
        type="button"
        className="min-h-11 cursor-pointer rounded-md bg-accent px-4 font-bold text-white"
        onClick={add}
      >
        Add flashcard
      </button>
    </div>
  );
}

function Schedule({
  kit,
  onRegen,
  busy,
}: {
  kit: Kit;
  onRegen: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        className="min-h-11 cursor-pointer rounded-md border-2 border-border px-4 font-semibold"
        onClick={onRegen}
      >
        {busy ? "Rebuilding…" : "Rebuild schedule"}
      </button>
      {kit.schedule.days.map((d) => (
        <article key={d.day} className="rounded-lg border-2 border-border bg-card p-4">
          <h3 className="font-extrabold">
            Day {d.day} · {d.minutes} min
          </h3>
          <p>{d.focus}</p>
          <p className="text-sm text-slate-600">Questions: {d.question_ids.join(", ") || "none"}</p>
        </article>
      ))}
    </div>
  );
}
