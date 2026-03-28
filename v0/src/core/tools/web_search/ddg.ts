import type { SearchProvider, SearchResponse, SearchResult } from "./index.ts";

const DDG_URL = "https://html.duckduckgo.com/html/";
const DDG_USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
];

const DDG_MAX_RETRIES = 3;
const DDG_BASE_DELAY_MS = 2000;

function randomUA(): string {
  return DDG_USER_AGENTS[Math.floor(Math.random() * DDG_USER_AGENTS.length)]!;
}

function unwrapDDGUrl(href: string): string {
  try {
    const parsed = new URL(href);
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : href;
  } catch {
    return href;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlockedResponse(status: number, html: string): boolean {
  if (status === 403) return true;
  if (status === 202 && html.includes("botnet")) return true;
  return false;
}

export async function parseDDGResults(html: string): Promise<SearchResponse> {
  const { parseHTML } = await import("magpie-html");
  const doc = parseHTML(html);

  const results: SearchResult[] = [];
  const resultDivs = doc.querySelectorAll("#links .web-result");

  for (const div of resultDivs) {
    const anchor = div.querySelector("h2 a");
    const snippetEl = div.querySelector("a.result__snippet");
    if (!anchor) continue;

    const rawHref = anchor.getAttribute("href") ?? "";
    const url = unwrapDDGUrl(rawHref);
    if (!url || url.startsWith("https://duckduckgo.com")) continue;

    results.push({
      title: (anchor.textContent ?? "").trim(),
      url,
      snippet: (snippetEl?.textContent ?? "").trim(),
    });
  }

  const vqdInput = doc.querySelector('input[name="vqd"]');
  const vqd = vqdInput?.getAttribute("value") ?? undefined;

  const nextForm = doc.querySelector('input[value="Next"]');
  const hasMore = !!nextForm;

  return { results, vqd, hasMore };
}

export function createDDGSearch(): SearchProvider {
  return async (query, opts) => {
    const page = opts?.page ?? 1;
    const region = opts?.region ?? "wt-wt";

    const body = new URLSearchParams();
    body.set("q", query);
    body.set("kl", region);

    if (page === 1) {
      body.set("b", "");
    } else {
      const offset = 10 + (page - 2) * 15;
      body.set("s", String(offset));
      body.set("dc", String(offset + 1));
      body.set("nextParams", "");
      body.set("v", "l");
      body.set("o", "json");
      body.set("api", "d.js");
    }

    for (let attempt = 0; attempt < DDG_MAX_RETRIES; attempt++) {
      if (attempt > 0) await sleep(DDG_BASE_DELAY_MS * attempt);

      const res = await fetch(DDG_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": randomUA(),
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Referer: "https://html.duckduckgo.com/",
          Origin: "https://html.duckduckgo.com",
          "Cache-Control": "max-age=0",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          DNT: "1",
          Connection: "keep-alive",
        },
        body: body.toString(),
      });

      if (!res.ok && res.status !== 202) {
        throw new Error(`DDG search failed: HTTP ${res.status}`);
      }

      const html = await res.text();

      if (isBlockedResponse(res.status, html)) {
        if (attempt < DDG_MAX_RETRIES - 1) continue;
        throw new Error(
          "DuckDuckGo is rate-limiting this IP. Try again in a few minutes, or use web_fetch to search specific sites directly.",
        );
      }

      return await parseDDGResults(html);
    }

    throw new Error("DDG search: max retries exceeded");
  };
}
