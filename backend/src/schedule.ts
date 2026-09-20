import type { Kit, Question, Requirement } from "./schema.ts";

function coversMust(q: Question, mustIds: Set<string>): boolean {
  return q.requirement_ids.some((id) => mustIds.has(id));
}

function sortQuestions(questions: Question[], requirements: Requirement[]): Question[] {
  const mustIds = new Set(requirements.filter((r) => r.priority === "must").map((r) => r.id));
  return [...questions].sort((a, b) => {
    const am = coversMust(a, mustIds) ? 1 : 0;
    const bm = coversMust(b, mustIds) ? 1 : 0;
    if (bm !== am) return bm - am;
    return b.difficulty - a.difficulty;
  });
}

function focusFor(questions: Question[]): string {
  if (!questions.length) return "Review extracted requirements and company notes";
  const counts = new Map<string, number>();
  for (const q of questions) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return `Focus: ${top}`;
}

/** Deterministic schedule: exact day count, must-haves first, harder earlier. */
export function allocateSchedule(
  questions: Question[],
  requirements: Requirement[],
  days: number,
): Kit["schedule"] {
  const n = Math.max(1, Math.floor(days));
  const ordered = sortQuestions(questions, requirements);
  const buckets: Question[][] = Array.from({ length: n }, () => []);

  if (!ordered.length) {
    return {
      days_available: n,
      days: Array.from({ length: n }, (_, i) => ({
        day: i + 1,
        focus: i === 0 ? "Read the job description and company brief" : "Review notes from previous days",
        question_ids: [],
        minutes: i === 0 ? 30 : 20,
      })),
    };
  }

  if (ordered.length >= n) {
    ordered.forEach((q, i) => buckets[i % n].push(q));
  } else {
    ordered.forEach((q, i) => buckets[i].push(q));
    for (let i = ordered.length; i < n; i++) {
      buckets[i].push(ordered[i % ordered.length]);
    }
  }

  const mustIds = new Set(requirements.filter((r) => r.priority === "must").map((r) => r.id));
  const scheduled = new Set(buckets.flat().flatMap((q) => q.requirement_ids));
  for (const id of mustIds) {
    if (scheduled.has(id)) continue;
    const q = ordered.find((x) => x.requirement_ids.includes(id));
    if (q) buckets[0].push(q);
  }

  return {
    days_available: n,
    days: buckets.map((qs, i) => {
      const ids = [...new Set(qs.map((q) => q.id))];
      return {
        day: i + 1,
        focus: focusFor(qs),
        question_ids: ids,
        minutes: Math.max(15, ids.length * 20),
      };
    }),
  };
}
