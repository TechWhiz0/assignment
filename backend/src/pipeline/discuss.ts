export type Discussion = { title: string; url: string; snippet: string };

export async function findDiscussion(company: string): Promise<Discussion[]> {
  const q = `${company} interview`.trim();
  if (!q || q === "interview") return [];
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=5`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      hits?: { title?: string; url?: string; story_text?: string; objectID?: string }[];
    };
    return (data.hits ?? [])
      .filter((h) => h.title)
      .map((h) => ({
        title: h.title || "",
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        snippet: (h.story_text || "").slice(0, 400),
      }));
  } catch {
    return [];
  }
}
