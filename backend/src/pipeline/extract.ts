import { generateJson, wrapUntrusted } from "../llm/gemini.ts";
import { KIND, PRIORITY, type Requirement } from "../schema.ts";

type Extracted = {
  title: string;
  seniority: string;
  location: string;
  company: string;
  responsibilities: string[];
  requirements: { text: string; kind: string; priority: string }[];
};

export async function extractRole(jd: string): Promise<{
  title: string;
  seniority: string;
  location: string;
  company: string;
  responsibilities: string[];
  requirements: Requirement[];
}> {
  const data = await generateJson<Extracted>(
    `Extract a role from a job description. Return JSON only:
{"title":"","seniority":"","location":"","company":"","responsibilities":[],"requirements":[{"text":"","kind":"technical|behavioural|domain","priority":"must|nice"}]}
Rules:
- Copy requirements from the posting. Do not invent skills or years of experience that are not written there.
- priority=must for required/must-have wording. priority=nice for bonus/nice-to-have/plus.
- A two-line stub yields few or zero requirements. That is correct.
- kind=technical for tools/languages, behavioural for collaboration/leadership, domain for industry knowledge.`,
    wrapUntrusted("JOB DESCRIPTION", jd.slice(0, 24_000)),
  );

  const requirements: Requirement[] = (data.requirements ?? [])
    .filter((r) => r.text && KIND.includes(r.kind as (typeof KIND)[number]) && PRIORITY.includes(r.priority as (typeof PRIORITY)[number]))
    .map((r, i) => ({
      id: `r${i + 1}`,
      text: String(r.text).slice(0, 400),
      kind: r.kind as Requirement["kind"],
      priority: r.priority as Requirement["priority"],
    }));

  return {
    title: data.title || "Unknown role",
    seniority: data.seniority || "",
    location: data.location || "",
    company: data.company || "",
    responsibilities: (data.responsibilities ?? []).map(String).slice(0, 20),
    requirements,
  };
}
