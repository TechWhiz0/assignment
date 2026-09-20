import { uncoveredMustIds } from "../coverage.ts";
import { allocateSchedule } from "../schedule.ts";
import { validateKit, type Kit, type Question } from "../schema.ts";
import { extractRole } from "./extract.ts";
import { crawlCompany } from "./crawl.ts";
import { findDiscussion } from "./discuss.ts";
import {
  generateBrief,
  generateFlashcards,
  generateGapQuestions,
  generateQuestions,
} from "./generate.ts";

export type ProgressFn = (
  step: string,
  status: "running" | "done" | "skipped" | "error",
  detail?: string,
) => void | Promise<void>;

export async function generateKit(
  input: { jd: string; company_url: string; days: number },
  onProgress: ProgressFn = () => undefined,
): Promise<Kit> {
  const jd = input.jd || "";
  const days = Math.max(1, Math.floor(input.days || 1));

  await onProgress("extract", "running");
  const role = await extractRole(jd);
  await onProgress("extract", "done", `${role.requirements.length} requirements`);

  await onProgress("crawl", "running");
  let crawl: Awaited<ReturnType<typeof crawlCompany>> = {
    pages: [],
    skipped: [],
    hiring: null,
    about: null,
  };
  try {
    crawl = await crawlCompany(input.company_url);
    await onProgress(
      "crawl",
      crawl.pages.length ? "done" : "skipped",
      crawl.pages.length ? `${crawl.pages.length} pages` : crawl.skipped[0]?.reason || "no pages",
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "crawl failed";
    crawl.skipped.push({ url: input.company_url, reason: msg });
    await onProgress("crawl", "skipped", msg);
  }

  const companyName = role.company || hostnameOf(input.company_url);
  await onProgress("discuss", "running");
  const discussion = await findDiscussion(companyName);
  await onProgress(
    "discuss",
    discussion.length ? "done" : "skipped",
    discussion.length ? `${discussion.length} threads` : "none found",
  );

  await onProgress("brief", "running");
  const brief = await generateBrief(companyName, crawl.pages, crawl.skipped);
  await onProgress("brief", "done");

  const hiringText = crawl.hiring?.text || "";
  let questions: Question[] = [];
  const cats = ["technical", "behavioural", "system-design", "company-fit"] as const;
  for (const category of cats) {
    await onProgress(`questions:${category}`, "running");
    const batch = await generateQuestions({
      category,
      jd,
      requirements: role.requirements,
      hiringText,
      discussion,
      start: questions.length + 1,
    });
    questions = questions.concat(batch);
    await onProgress(`questions:${category}`, batch.length ? "done" : "skipped", `${batch.length} questions`);
  }

  let passes = 1;
  let uncovered = uncoveredMustIds(role.requirements, questions);
  if (uncovered.length) {
    await onProgress("coverage_pass_2", "running", `gaps: ${uncovered.join(",")}`);
    const extra = await generateGapQuestions(
      role.requirements.filter((r) => uncovered.includes(r.id)),
      questions,
      jd,
      questions.length + 1,
    );
    questions = questions.concat(extra);
    passes = 2;
    uncovered = uncoveredMustIds(role.requirements, questions);
    await onProgress(
      "coverage_pass_2",
      "done",
      uncovered.length ? `still uncovered: ${uncovered.join(",")}` : "closed",
    );
  }

  await onProgress("flashcards", "running");
  const flashcards = await generateFlashcards(role.requirements, questions);
  await onProgress("flashcards", "done", `${flashcards.length} cards`);

  await onProgress("schedule", "running");
  const schedule = allocateSchedule(questions, role.requirements, days);
  await onProgress("schedule", "done");

  const pagesUsed = [...crawl.pages.map((p) => p.url), ...discussion.map((d) => d.url)];

  const kit: Kit = {
    source: {
      company: companyName,
      company_url: input.company_url,
      role: role.title,
      location: role.location,
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: pagesUsed,
    },
    company_brief: brief,
    role: {
      title: role.title,
      seniority: role.seniority,
      responsibilities: role.responsibilities,
      requirements: role.requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage: { uncovered_requirement_ids: uncovered, passes },
  };

  return validateKit(kit);
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
