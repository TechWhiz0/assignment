import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { BatchInputSchema, type Kit } from "./schema.ts";
import { generateKit } from "./pipeline/index.ts";

config({ path: resolve(import.meta.dirname, "../.env") });

if (!process.env.ALLOW_LOCAL_URLS) process.env.ALLOW_LOCAL_URLS = "1";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const inputPath = arg("--input");
const outputPath = arg("--output");
if (!inputPath || !outputPath) {
  console.error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
  process.exit(1);
}

const cases = BatchInputSchema.parse(JSON.parse(await readFile(inputPath, "utf8")));
const kits: {
  id: string;
  status: "ok" | "failed";
  kit: Kit | null;
  error: { code: string; message: string } | null;
}[] = [];

for (const c of cases) {
  try {
    const kit = await generateKit({ jd: c.jd, company_url: c.company_url, days: c.days });
    kits.push({ id: c.id, status: "ok", kit, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = /unreachable|ENOTFOUND|timeout|ECONN/i.test(message)
      ? "COMPANY_UNREACHABLE"
      : /GEMINI|API_KEY|MODEL/i.test(message)
        ? "GENERATION_FAILED"
        : "PIPELINE_FAILED";
    kits.push({ id: c.id, status: "failed", kit: null, error: { code, message } });
  }
}

const out = {
  version: "1.0" as const,
  generated_at: new Date().toISOString(),
  kits,
};
await writeFile(outputPath, JSON.stringify(out, null, 2));
console.log(
  `Wrote ${kits.length} results to ${outputPath} (${kits.filter((k) => k.status === "ok").length} ok)`,
);
