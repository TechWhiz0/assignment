import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { KitDoc } from "../models.ts";
import { generateKit } from "../pipeline/index.ts";
import { crawlCompany } from "../pipeline/crawl.ts";
import { generateBrief, generateQuestions } from "../pipeline/generate.ts";
import { isPinned, validateKit, type Kit, type Question } from "../schema.ts";
import { allocateSchedule } from "../schedule.ts";

const jobs = new Map<string, Promise<void>>();

function toPractice(p: unknown): Record<string, { confidence: number; seen: boolean }> {
  if (!p) return {};
  if (typeof (p as { entries?: unknown }).entries === "function") {
    return Object.fromEntries(p as Map<string, { confidence: number; seen: boolean }>);
  }
  return p as Record<string, { confidence: number; seen: boolean }>;
}

function hashInput(jd: string, url: string) {
  return createHash("sha256").update(`${jd}\n${url}`).digest("hex");
}

function publicKit(doc: InstanceType<typeof KitDoc>) {
  return {
    id: String(doc._id),
    status: doc.status,
    steps: doc.steps,
    input: {
      company_url: doc.input?.company_url,
      days: doc.input?.days,
      jd_chars: (doc.input?.jd || "").length,
    },
    kit: doc.kit,
    error: doc.error,
    practice: toPractice(doc.practice),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function runJob(id: string) {
  const doc = await KitDoc.findById(id);
  if (!doc) return;
  doc.status = "researching";
  doc.steps = [];
  await doc.save();
  try {
    const kit = await generateKit(
      {
        jd: doc.input?.jd || "",
        company_url: doc.input?.company_url || "",
        days: doc.input?.days || 1,
      },
      async (name, status, detail) => {
        if (name.startsWith("questions") || name === "brief" || name === "flashcards") {
          doc.status = "generating";
        }
        doc.steps.push({ name, status, detail, at: new Date() });
        doc.updatedAt = new Date();
        await doc.save();
      },
    );
    doc.kit = kit;
    doc.status = "ready";
    doc.error = undefined;
    doc.updatedAt = new Date();
    await doc.save();
  } catch (err) {
    doc.status = "failed";
    doc.error = {
      code: "PIPELINE_FAILED",
      message: err instanceof Error ? err.message : String(err),
    };
    doc.updatedAt = new Date();
    await doc.save();
  }
}

export async function createKit(req: Request, res: Response) {
  const jd = String(req.body?.jd || "");
  const company_url = String(req.body?.company_url || "");
  const days = Number(req.body?.days || 0);
  if (!jd.trim() || !company_url.trim() || !Number.isInteger(days) || days < 1) {
    res.status(400).json({
      error: { code: "INVALID_INPUT", message: "jd, company_url and integer days>=1 required" },
    });
    return;
  }
  const hash = hashInput(jd, company_url);
  const existing = await KitDoc.findOne({
    userId: req.session.userId,
    "input.hash": hash,
    status: { $in: ["queued", "researching", "generating"] },
  });
  if (existing) {
    res.status(202).json(publicKit(existing));
    return;
  }
  const doc = await KitDoc.create({
    userId: req.session.userId,
    status: "queued",
    steps: [],
    input: { jd, company_url, days, hash },
  });
  const id = String(doc._id);
  const p = runJob(id).finally(() => jobs.delete(id));
  jobs.set(id, p);
  res.status(202).json(publicKit(doc));
}

export async function listKits(req: Request, res: Response) {
  const docs = await KitDoc.find({ userId: req.session.userId }).sort({ createdAt: -1 }).limit(50);
  res.json(docs.map(publicKit));
}

export async function getKit(req: Request, res: Response) {
  const doc = await KitDoc.findOne({ _id: req.params.id, userId: req.session.userId });
  if (!doc) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return;
  }
  res.json(publicKit(doc));
}

export async function patchKit(req: Request, res: Response) {
  const doc = await KitDoc.findOne({ _id: req.params.id, userId: req.session.userId });
  if (!doc || !doc.kit) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return;
  }
  const next = { ...(doc.kit as Kit), ...(req.body?.kit || {}) };
  try {
    doc.kit = validateKit(next);
    doc.updatedAt = new Date();
    await doc.save();
    res.json(publicKit(doc));
  } catch (err) {
    res.status(400).json({
      error: { code: "INVALID_KIT", message: err instanceof Error ? err.message : "Invalid kit" },
    });
  }
}

export async function regenerateSection(req: Request, res: Response) {
  const doc = await KitDoc.findOne({ _id: req.params.id, userId: req.session.userId });
  if (!doc?.kit) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return;
  }
  const kit = structuredClone(doc.kit as Kit);
  const section = String(req.body?.section || "");
  try {
    if (section === "company_brief") {
      const crawled = await crawlCompany(kit.source.company_url);
      kit.company_brief = await generateBrief(kit.source.company, crawled.pages, crawled.skipped);
      kit.source.pages_used = [
        ...new Set([...kit.source.pages_used, ...crawled.pages.map((p) => p.url)]),
      ];
    } else if (section.startsWith("questions:")) {
      const category = section.slice("questions:".length) as Question["category"];
      const pinned = kit.questions.filter((q) => q.category === category && isPinned(q));
      const others = kit.questions.filter((q) => q.category !== category);
      const fresh = await generateQuestions({
        category,
        jd: doc.input?.jd || "",
        requirements: kit.role.requirements,
        hiringText: "",
        discussion: [],
        start: kit.questions.length + 1,
      });
      kit.questions = [
        ...others,
        ...pinned,
        ...fresh.filter((q) => !pinned.some((p) => p.prompt === q.prompt)),
      ];
      kit.schedule = allocateSchedule(kit.questions, kit.role.requirements, kit.schedule.days_available);
    } else if (section === "schedule") {
      kit.schedule = allocateSchedule(kit.questions, kit.role.requirements, kit.schedule.days_available);
    } else {
      res.status(400).json({
        error: {
          code: "INVALID_SECTION",
          message: "section must be company_brief, questions:<category>, or schedule",
        },
      });
      return;
    }
    doc.kit = validateKit(kit);
    doc.updatedAt = new Date();
    await doc.save();
    res.json(publicKit(doc));
  } catch (err) {
    res.status(500).json({
      error: { code: "REGEN_FAILED", message: err instanceof Error ? err.message : "regen failed" },
    });
  }
}

export async function recordPractice(req: Request, res: Response) {
  const doc = await KitDoc.findOne({ _id: req.params.id, userId: req.session.userId });
  if (!doc) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Kit not found" } });
    return;
  }
  const flashcardId = String(req.body?.flashcard_id || "");
  const confidence = Number(req.body?.confidence);
  if (!flashcardId || ![1, 2, 3, 4, 5].includes(confidence)) {
    res.status(400).json({
      error: { code: "INVALID_INPUT", message: "flashcard_id and confidence 1-5 required" },
    });
    return;
  }
  doc.practice.set(flashcardId, { confidence, seen: true, at: new Date() });
  doc.updatedAt = new Date();
  await doc.save();
  res.json(publicKit(doc));
}

export async function batchCreate(req: Request, res: Response) {
  const pairs = req.body?.pairs as { jd: string; company_url: string; days?: number }[] | undefined;
  if (!Array.isArray(pairs) || !pairs.length) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "pairs array required" } });
    return;
  }
  const created = [];
  for (const p of pairs.slice(0, 20)) {
    const body = {
      jd: p.jd,
      company_url: p.company_url,
      days: p.days ?? (Number(req.body?.days) || 5),
    };
    const fakeReq = { ...req, body } as Request;
    const fakeRes = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        created.push(payload);
        return this;
      },
    } as unknown as Response;
    await createKit(fakeReq, fakeRes);
  }
  res.status(202).json({ kits: created });
}
