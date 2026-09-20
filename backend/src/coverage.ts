import type { Question, Requirement } from "./schema.ts";

/** Must-have requirements that no question covers. */
export function uncoveredMustIds(requirements: Requirement[], questions: Question[]): string[] {
  const covered = new Set(questions.flatMap((q) => q.requirement_ids));
  return requirements.filter((r) => r.priority === "must" && !covered.has(r.id)).map((r) => r.id);
}

/** Nice-to-have gaps (informational; not a coverage failure). */
export function uncoveredNiceIds(requirements: Requirement[], questions: Question[]): string[] {
  const covered = new Set(questions.flatMap((q) => q.requirement_ids));
  return requirements.filter((r) => r.priority === "nice" && !covered.has(r.id)).map((r) => r.id);
}
