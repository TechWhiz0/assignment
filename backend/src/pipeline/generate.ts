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

  const data = await generateJson<{ questions: Omit<Question, "id" | "origin" | "edited">[] }>(
    `Generate interview questions for category "${category}". JSON:
{"questions":[{"requirement_ids":["r1"],"category":"${category}","prompt":"","answer_outline":"","difficulty":2}]}
Rules:
- Every question must reference requirement_ids that exist.
- 2 to 5 questions. difficulty is 1, 2, or 3.
- Use the hiring process if present: a take-home or system-design round should shape prompts.
- Do not invent requirements. Company-fit questions may use company pages and public discussion; if those are empty, say the process is unpublished and keep questions generic to the posting.
- category must be ${category}.`,
    [
      wrapUntrusted("JOB DESCRIPTION", jd.slice(0, 8000)),
      wrapUntrusted("REQUIREMENTS", JSON.stringify(relevant)),
      wrapUntrusted("HIRING PAGE", hiringText.slice(0, 6000) || "(none found)"),
      wrapUntrusted("PUBLIC DISCUSSION", JSON.stringify(discussion).slice(0, 4000) || "(none found)"),
    ].join("\n\n"),
  );

  const out: Question[] = [];
  let i = start;
  for (const q of data.questions ?? []) {
    if (!q.prompt) continue;
    const ids = (q.requirement_ids || []).filter((id) => requirements.some((r) => r.id === id));
    if (!ids.length) continue;
    const cat = CATEGORY.includes(q.category as (typeof CATEGORY)[number]) ? q.category : category;
    const diff = Number(q.difficulty);
    out.push({
      id: nextId("q", i++),
      requirement_ids: ids,
      category: cat as Question["category"],
      prompt: String(q.prompt),
      answer_outline: String(q.answer_outline || ""),
      difficulty: diff >= 1 && diff <= 3 ? Math.floor(diff) : 2,
      origin: "generated",
      edited: false,
    });
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
  const data = await generateJson<{ questions: Omit<Question, "id" | "origin" | "edited">[] }>(
    `Generate one question per uncovered must-have requirement. JSON:
{"questions":[{"requirement_ids":["r1"],"category":"technical","prompt":"","answer_outline":"","difficulty":2}]}
Match category to the requirement kind (technical/domain → technical, behavioural → behavioural).`,
    [
      wrapUntrusted("UNCOVERED REQUIREMENTS", JSON.stringify(uncovered)),
      wrapUntrusted("EXISTING QUESTION PROMPTS", existing.map((q) => q.prompt).join("\n")),
      wrapUntrusted("JOB DESCRIPTION", jd.slice(0, 6000)),
    ].join("\n\n"),
  );
  const out: Question[] = [];
  let i = start;
  for (const q of data.questions ?? []) {
    const ids = (q.requirement_ids || []).filter((id) => uncovered.some((r) => r.id === id));
    if (!ids.length || !q.prompt) continue;
    const cat = CATEGORY.includes(q.category as (typeof CATEGORY)[number]) ? q.category : "technical";
    out.push({
      id: nextId("q", i++),
      requirement_ids: ids,
      category: cat as Question["category"],
      prompt: String(q.prompt),
      answer_outline: String(q.answer_outline || ""),
      difficulty: [1, 2, 3].includes(Number(q.difficulty)) ? Math.floor(Number(q.difficulty)) : 2,
      origin: "generated",
      edited: false,
    });
  }
  return out;
}

export async function generateFlashcards(requirements: Requirement[], questions: Question[], start = 1) {
  const data = await generateJson<{
    flashcards: { front: string; back: string; requirement_ids: string[] }[];
  }>(
    `Create short flashcards. JSON:
{"flashcards":[{"front":"","back":"","requirement_ids":["r1"]}]}
One card per must-have requirement, plus a few from harder questions. Front is the prompt, back is a brief answer.`,
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
  let i = start;
  return (data.flashcards ?? [])
    .filter((f) => f.front)
    .map((f) => ({
      id: nextId("f", i++),
      front: String(f.front),
      back: String(f.back || ""),
      requirement_ids: (f.requirement_ids || []).filter((id) => requirements.some((r) => r.id === id)),
      origin: "generated" as const,
      edited: false,
    }));
}
