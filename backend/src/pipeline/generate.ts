import { generateJson, wrapUntrusted } from "../llm/gemini.ts";
import { CATEGORY, type Question, type Requirement } from "../schema.ts";
import type { Page } from "./crawl.ts";
import type { Discussion } from "./discuss.ts";

export async function generateBrief(
  company: string,
  pages: Page[],
  skipped: { url: string; reason: string }[],
): Promise<{ summary: string; what_they_do: string; sources: string[] }> {
  if (!pages.length) {
    const why = skipped[0]?.reason || "no pages retrieved";
    return {
      summary: `Could not retrieve the company site (${why}). Brief is limited to the job posting.`,
      what_they_do: "Unknown — company pages were not available.",
      sources: [],
    };
  }
  const corpus = pages.map((p) => `URL: ${p.url}\nTITLE: ${p.title}\n${p.text.slice(0, 3000)}`).join("\n\n");
  const data = await generateJson<{ summary: string; what_they_do: string }>(
    `Write a factual company brief from the pages. JSON: {"summary":"","what_they_do":""}
Do not invent products, funding, or culture. If pages are thin, say so.`,
    wrapUntrusted("COMPANY PAGES", `Company name hint: ${company}\n${corpus.slice(0, 20_000)}`),
  );
  return {
    summary: data.summary || "No usable company summary in retrieved pages.",
    what_they_do: data.what_they_do || "",
    sources: pages.map((p) => p.url),
  };
}

function nextId(prefix: string, n: number) {
  return `${prefix}${n}`;
}

/** Pull a questions array out of common model JSON shapes. */
export function questionRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const key of ["questions", "items", "data"]) {
    if (Array.isArray(o[key])) {
      return (o[key] as unknown[]).filter((x) => x && typeof x === "object") as Record<string, unknown>[];
    }
  }
  return [];
}

/** Map model requirement_ids onto real ids; fall back to pool musts when missing. */
export function resolveRequirementIds(
  raw: unknown,
  pool: Requirement[],
  fallback: Requirement[],
): string[] {
  const arr = Array.isArray(raw) ? raw : raw != null && raw !== "" ? [raw] : [];
  const found: string[] = [];
  for (const item of arr) {
    const s = String(item).trim();
    if (!s) continue;
    if (pool.some((r) => r.id === s)) {
      found.push(s);
      continue;
    }
    const m = s.match(/\br?\s*(\d+)\b/i);
    if (m) {
      const id = `r${m[1]}`;
      if (pool.some((r) => r.id === id)) {
        found.push(id);
        continue;
      }
    }
    const byText = pool.find(
      (r) => r.text === s || r.text.startsWith(s.slice(0, 48)) || s.includes(r.text.slice(0, 48)),
    );
    if (byText) found.push(byText.id);
  }
  const uniq = [...new Set(found)];
  if (uniq.length) return uniq;
  const fb = (fallback.length ? fallback : pool).slice(0, 2).map((r) => r.id);
  return fb;
}

function toQuestions(
  data: unknown,
  opts: {
    category: Question["category"];
    requirements: Requirement[];
    relevant: Requirement[];
    start: number;
    idPool?: Requirement[];
  },
): Question[] {
  const pool = opts.idPool ?? opts.requirements;
  const out: Question[] = [];
  let i = opts.start;
  for (const q of questionRows(data)) {
    const prompt = String(q.prompt ?? q.question ?? q.text ?? "").trim();
    if (!prompt) continue;
    const ids = resolveRequirementIds(q.requirement_ids ?? q.requirements ?? q.requirementIds, pool, opts.relevant);
    if (!ids.length) continue;
    const rawCat = String(q.category || opts.category);
    const cat = CATEGORY.includes(rawCat as (typeof CATEGORY)[number])
      ? (rawCat as Question["category"])
      : opts.category;
    const diff = Number(q.difficulty);
    out.push({
      id: nextId("q", i++),
      requirement_ids: ids,
      category: cat,
      prompt,
      answer_outline: String(q.answer_outline ?? q.outline ?? q.answer ?? ""),
      difficulty: diff >= 1 && diff <= 3 ? Math.floor(diff) : 2,
      origin: "generated",
      edited: false,
    });
  }
  return out;
}

export async function generateQuestions(opts: {
  category: Question["category"];
  jd: string;
  requirements: Requirement[];
  hiringText: string;
  discussion: Discussion[];
  start: number;
}): Promise<Question[]> {
  const { category, jd, requirements, hiringText, discussion, start } = opts;
  const relevant = requirements.filter((r) => {
    if (category === "technical" || category === "system-design") {
      return r.kind === "technical" || r.kind === "domain";
    }
    if (category === "behavioural") return r.kind === "behavioural" || r.priority === "must";
    return true;
  });
  if (!relevant.length && category !== "company-fit") return [];

  const idList = relevant.map((r) => r.id).join(", ") || requirements.map((r) => r.id).join(", ");
  const system = `Generate interview questions for category "${category}". JSON:
{"questions":[{"requirement_ids":["r1"],"category":"${category}","prompt":"","answer_outline":"","difficulty":2}]}
Rules:
- Return 3 to 5 questions.
- requirement_ids MUST be exact ids from this list only: ${idList}
- difficulty is 1, 2, or 3. category must be "${category}".
- Use the hiring process if present. Do not invent requirements.
- Company-fit may use company pages and public discussion; if empty, keep questions generic to the posting.`;

  const user = [
    wrapUntrusted("JOB DESCRIPTION", jd.slice(0, 8000)),
    wrapUntrusted("REQUIREMENTS", JSON.stringify(relevant.length ? relevant : requirements)),
    wrapUntrusted("HIRING PAGE", hiringText.slice(0, 6000) || "(none found)"),
    wrapUntrusted("PUBLIC DISCUSSION", JSON.stringify(discussion).slice(0, 4000) || "(none found)"),
  ].join("\n\n");

  let out = toQuestions(await generateJson(system, user), {
    category,
    requirements,
    relevant: relevant.length ? relevant : requirements,
    start,
  });

  // ponytail: one retry if the model returns empty/unusable rows; structured few-shot if still flaky
  if (!out.length) {
    out = toQuestions(
      await generateJson(
        system,
        `${user}\n\nPrevious response had zero usable questions. Return exactly 3 objects in "questions" with requirement_ids from [${idList}] and non-empty prompt fields.`,
      ),
      { category, requirements, relevant: relevant.length ? relevant : requirements, start },
    );
  }
  return out;
}

export async function generateGapQuestions(
  uncovered: Requirement[],
  existing: Question[],
  jd: string,
  start: number,
): Promise<Question[]> {
  if (!uncovered.length) return [];
  const idList = uncovered.map((r) => r.id).join(", ");
  const system = `Generate one question per uncovered must-have requirement. JSON:
{"questions":[{"requirement_ids":["r1"],"category":"technical","prompt":"","answer_outline":"","difficulty":2}]}
requirement_ids MUST be exact ids from: ${idList}
Match category to the requirement kind (technical/domain → technical, behavioural → behavioural).`;
  const user = [
    wrapUntrusted("UNCOVERED REQUIREMENTS", JSON.stringify(uncovered)),
    wrapUntrusted("EXISTING QUESTION PROMPTS", existing.map((q) => q.prompt).join("\n")),
    wrapUntrusted("JOB DESCRIPTION", jd.slice(0, 6000)),
  ].join("\n\n");

  let out = toQuestions(await generateJson(system, user), {
    category: "technical",
    requirements: uncovered,
    relevant: uncovered,
    start,
    idPool: uncovered,
  });
  if (!out.length) {
    out = toQuestions(
      await generateJson(
        system,
        `${user}\n\nReturn one question per id in [${idList}], each with that id in requirement_ids.`,
      ),
      { category: "technical", requirements: uncovered, relevant: uncovered, start, idPool: uncovered },
    );
  }
  return out;
}

export async function generateFlashcards(requirements: Requirement[], questions: Question[], start = 1) {
  const musts = requirements.filter((r) => r.priority === "must");
  const data = await generateJson<{
    flashcards: { front: string; back: string; requirement_ids: string[] }[];
  }>(
    `Create short flashcards. JSON:
{"flashcards":[{"front":"","back":"","requirement_ids":["r1"]}]}
One card per must-have requirement (${musts.map((r) => r.id).join(", ") || "all musts"}), plus a few from harder questions. Front is the prompt, back is a brief answer. requirement_ids must be exact ids.`,
    JSON.stringify({
      requirements,
      questions: questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        outline: q.answer_outline,
        requirement_ids: q.requirement_ids,
        difficulty: q.difficulty,
      })),
    }).slice(0, 16_000),
  );

  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { flashcards?: unknown }).flashcards)
      ? (data as { flashcards: { front: string; back: string; requirement_ids: string[] }[] }).flashcards
      : [];

  let i = start;
  let cards = rows
    .map((f) => {
      const front = String((f as { front?: string; prompt?: string }).front ?? (f as { prompt?: string }).prompt ?? "").trim();
      if (!front) return null;
      return {
        id: nextId("f", i++),
        front,
        back: String((f as { back?: string; answer?: string }).back ?? (f as { answer?: string }).answer ?? ""),
        requirement_ids: resolveRequirementIds(
          (f as { requirement_ids?: unknown }).requirement_ids,
          requirements,
          musts,
        ),
        origin: "generated" as const,
        edited: false,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  // guarantee one card per uncovered must when the model returns nothing useful
  if (!cards.length && musts.length) {
    cards = musts.map((r) => ({
      id: nextId("f", i++),
      front: r.text,
      back: "Recall concrete evidence from your experience for this requirement.",
      requirement_ids: [r.id],
      origin: "generated" as const,
      edited: false,
    }));
  }
  return cards;
}
