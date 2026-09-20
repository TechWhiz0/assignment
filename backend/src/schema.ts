import { z } from "zod";

export const KIND = ["technical", "behavioural", "domain"] as const;
export const PRIORITY = ["must", "nice"] as const;
export const CATEGORY = ["technical", "behavioural", "system-design", "company-fit"] as const;
export const ORIGIN = ["generated", "user"] as const;

export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(KIND),
  priority: z.enum(PRIORITY),
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()).min(1),
  category: z.enum(CATEGORY),
  prompt: z.string().min(1),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
  origin: z.enum(ORIGIN).optional(),
  edited: z.boolean().optional(),
});

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string(),
  requirement_ids: z.array(z.string()),
  origin: z.enum(ORIGIN).optional(),
  edited: z.boolean().optional(),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(0),
});

export const KitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int().min(0),
    researched_at: z.string(),
    pages_used: z.array(z.string()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string()),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(RequirementSchema),
  }),
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: z.object({
    days_available: z.number().int().min(1),
    days: z.array(ScheduleDaySchema),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int().min(0),
  }),
});

export const BatchInputSchema = z.array(
  z.object({
    id: z.string().min(1),
    jd: z.string(),
    company_url: z.string(),
    days: z.number().int().min(1),
  }),
);

export const BatchOutputSchema = z.object({
  version: z.literal("1.0"),
  generated_at: z.string(),
  kits: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["ok", "failed"]),
      kit: KitSchema.nullable(),
      error: z
        .object({
          code: z.string(),
          message: z.string(),
        })
        .nullable(),
    }),
  ),
});

export type Kit = z.infer<typeof KitSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type BatchCase = z.infer<typeof BatchInputSchema>[number];

export function validateKit(data: unknown): Kit {
  const kit = KitSchema.parse(data);
  const qids = new Set(kit.questions.map((q) => q.id));
  for (const day of kit.schedule.days) {
    for (const id of day.question_ids) {
      if (!qids.has(id)) throw new Error(`schedule references missing question ${id}`);
    }
  }
  if (kit.schedule.days.length !== kit.schedule.days_available) {
    throw new Error("schedule day count must equal days_available");
  }
  return kit;
}

export function isPinned(item: { origin?: string; edited?: boolean }): boolean {
  return item.origin === "user" || item.edited === true;
}
