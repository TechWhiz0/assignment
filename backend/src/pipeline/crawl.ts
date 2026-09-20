import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { assertSafeUrl, UrlGuardError } from "../security/urlGuard.ts";

const MAX_BYTES = 1_000_000;
const FETCH_MS = 12_000;
const TOP_PAGES = 8;

export type Page = { url: string; title: string; text: string };

const SIGNALS = [
  "career",
  "job",
  "hiring",
  "handbook",
  "interview",
  "about",
  "culture",
  "team",
  "engineering",
  "value",
  "principle",
  "how-we",
  "people",
  "join",
];

function scoreLink(href: string, text: string): number {
  const blob = `${href} ${text}`.toLowerCase();
  let n = 0;
  for (const s of SIGNALS) if (blob.includes(s)) n += 3;
  if (/career|hiring|handbook|interview/.test(blob)) n += 5;
  return n;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchPage(
  url: string,
): Promise<{ html: string; finalUrl: string } | { skipped: string }> {
  try {
    await assertSafeUrl(url);
  } catch (err) {
    return { skipped: err instanceof UrlGuardError ? err.message : "unsafe url" };
  }
  let last = "timeout";
  for (let i = 0; i < 3; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_MS);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: { "user-agent": "InterviewPrepKit/1.0" },
      });
      if (res.status === 429 || res.status >= 500) {
        last = `HTTP ${res.status}`;
        await sleep(800 * 2 ** i);
        continue;
      }
      if (!res.ok) return { skipped: `HTTP ${res.status}` };
      const ctype = res.headers.get("content-type") || "";
      if (ctype && !/text\/html|application\/xhtml|text\/plain/i.test(ctype)) {
        return { skipped: `unexpected content-type ${ctype}` };
      }
      // ponytail: truncate oversized HTML; stream-cap if sites routinely exceed ~1MB
      const buf = Buffer.from(await res.arrayBuffer()).subarray(0, MAX_BYTES);
      return { html: buf.toString("utf8"), finalUrl: res.url || url };
    } catch (err) {
      last = err instanceof Error ? err.message : "fetch failed";
      await sleep(400 * 2 ** i);
    } finally {
      clearTimeout(t);
    }
  }
  return { skipped: last };
}

function visibleText(html: string): { title: string; text: string; links: { href: string; text: string }[] } {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,nav,footer").remove();
  const title = $("title").first().text().trim() || $("h1").first().text().trim();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 12_000);
  const links: { href: string; text: string }[] = [];
  $("a[href]").each((_, el) => {
    links.push({ href: $(el).attr("href") || "", text: $(el).text().trim() });
  });
  return { title, text, links };
}

async function allowedByRobots(origin: string, url: string): Promise<boolean> {
  const robotsUrl = new URL("/robots.txt", origin).href;
  const got = await fetchPage(robotsUrl);
  if ("skipped" in got) return true;
  const robots = robotsParser(robotsUrl, got.html);
  return robots.isAllowed(url, "InterviewPrepKit") !== false;
}

export async function crawlCompany(startUrl: string): Promise<{
  pages: Page[];
  skipped: { url: string; reason: string }[];
  hiring: Page | null;
  about: Page | null;
}> {
  const skipped: { url: string; reason: string }[] = [];
  const pages: Page[] = [];
  const origin = new URL(startUrl).origin;

  if (!(await allowedByRobots(origin, startUrl))) {
    skipped.push({ url: startUrl, reason: "disallowed by robots.txt" });
    return { pages, skipped, hiring: null, about: null };
  }

  const home = await fetchPage(startUrl);
  if ("skipped" in home) {
    skipped.push({ url: startUrl, reason: home.skipped });
    return { pages, skipped, hiring: null, about: null };
  }

  const parsed = visibleText(home.html);
  pages.push({ url: home.finalUrl, title: parsed.title, text: parsed.text });

  const ranked = parsed.links
    .map((l) => {
      try {
        const abs = new URL(l.href, home.finalUrl);
        if (abs.origin !== origin) return null;
        abs.hash = "";
        return { url: abs.href, score: scoreLink(abs.pathname, l.text), text: l.text };
      } catch {
        return null;
      }
    })
    .filter((x): x is { url: string; score: number; text: string } => !!x && x.score > 0);

  const uniq = [...new Map(ranked.sort((a, b) => b.score - a.score).map((l) => [l.url, l])).values()].slice(
    0,
    TOP_PAGES,
  );

  for (const link of uniq) {
    if (link.url === home.finalUrl) continue;
    if (!(await allowedByRobots(origin, link.url))) {
      skipped.push({ url: link.url, reason: "disallowed by robots.txt" });
      continue;
    }
    const got = await fetchPage(link.url);
    if ("skipped" in got) {
      skipped.push({ url: link.url, reason: got.skipped });
      continue;
    }
    const p = visibleText(got.html);
    pages.push({ url: got.finalUrl, title: p.title, text: p.text });
    await sleep(250);
  }

  const hiring =
    pages.find((p) => /career|hiring|job|handbook|interview/i.test(`${p.url} ${p.title}`)) ?? null;
  const about =
    pages.find((p) => /about|company|what-we/i.test(`${p.url} ${p.title}`)) ?? pages[0] ?? null;

  return { pages, skipped, hiring, about };
}
