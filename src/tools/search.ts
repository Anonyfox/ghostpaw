import { createTool, Schema } from "chatoyant";

// ── Search provider interface (swap point) ──────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  results: SearchResult[];
  vqd?: string;
  hasMore: boolean;
}

export type SearchProvider = (
  query: string,
  opts?: { page?: number; region?: string },
) => Promise<SearchResponse>;

// ── Brave Search API ────────────────────────────────────────────────────────

const BRAVE_URL = "https://api.search.brave.com/res/v1/web/search";

interface BraveWebResult {
  title: string;
  url: string;
  description?: string;
}

interface BraveResponse {
  web?: { results?: BraveWebResult[] };
}

export function createBraveSearch(apiKey: string): SearchProvider {
  return async (query, opts) => {
    const params = new URLSearchParams({
      q: query,
      count: "10",
    });
    if (opts?.page && opts.page > 1) {
      params.set("offset", String((opts.page - 1) * 10));
    }

    const res = await fetch(`${BRAVE_URL}?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("Brave: invalid API key");
    }
    if (res.status === 429) {
      throw new Error("Brave: rate limit exceeded");
    }
    if (!res.ok) {
      throw new Error(`Brave: HTTP ${res.status}`);
    }

    const data = (await res.json()) as BraveResponse;
    const webResults = data.web?.results ?? [];

    return {
      results: webResults.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: (r.description ?? "").trim(),
      })),
      hasMore: webResults.length >= 10,
    };
  };
}

// ── Tavily Search API ───────────────────────────────────────────────────────

const TAVILY_URL = "https://api.tavily.com/search";

interface TavilyResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

export function createTavilySearch(apiKey: string): SearchProvider {
  return async (query, _opts) => {
    const body: Record<string, unknown> = {
      query,
      max_results: 10,
      search_depth: "basic",
    };

    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 401) {
      throw new Error("Tavily: invalid API key");
    }
    if (res.status === 429 || res.status === 432) {
      throw new Error("Tavily: rate/credit limit exceeded");
    }
    if (!res.ok) {
      throw new Error(`Tavily: HTTP ${res.status}`);
    }

    const data = (await res.json()) as TavilyResponse;
    const tavilyResults = data.results ?? [];

    return {
      results: tavilyResults.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: (r.content ?? "").trim(),
      })),
      hasMore: tavilyResults.length >= 10,
    };
  };
}

// ── Serper.dev Google Search API ────────────────────────────────────────────

const SERPER_URL = "https://google.serper.dev/search";

interface SerperResult {
  title: string;
  link: string;
  snippet?: string;
  position?: number;
}

interface SerperResponse {
  organic?: SerperResult[];
}

export function createSerperSearch(apiKey: string): SearchProvider {
  return async (query, opts) => {
    const body: Record<string, unknown> = { q: query, num: 10 };
    if (opts?.page && opts.page > 1) {
      body.page = opts.page;
    }

    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("Serper: invalid API key");
    }
    if (res.status === 429) {
      throw new Error("Serper: rate limit exceeded");
    }
    if (!res.ok) {
      throw new Error(`Serper: HTTP ${res.status}`);
    }

    const data = (await res.json()) as SerperResponse;
    const organic = data.organic ?? [];

    return {
      results: organic.map((r) => ({
        title: r.title,
        url: r.link,
        snippet: (r.snippet ?? "").trim(),
      })),
      hasMore: organic.length >= 10,
    };
  };
}

// ── DDG Lite HTML parser (free fallback) ────────────────────────────────────

const DDG_URL = "https://html.duckduckgo.com/html/";
const DDG_USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
];

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

const DDG_MAX_RETRIES = 3;
const DDG_BASE_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlockedResponse(status: number, html: string): boolean {
  if (status === 403) return true;
  if (status === 202 && html.includes("botnet")) return true;
  return false;
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

// ── Provider selection: Brave > Tavily > Serper > DDG ───────────────────────

export function resolveSearchProvider(): SearchProvider {
  const braveKey = process.env.BRAVE_API_KEY;
  if (braveKey) return createBraveSearch(braveKey);

  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) return createTavilySearch(tavilyKey);

  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) return createSerperSearch(serperKey);

  return createDDGSearch();
}

// ── Tool definition ─────────────────────────────────────────────────────────

class SearchParams extends Schema {
  query = Schema.String({ description: "Search query" });
  page = Schema.Integer({
    description: "Page number for pagination (1-based, default: 1)",
    optional: true,
  });
  region = Schema.String({
    description: "Region code for localized results (e.g. 'en-us', default: worldwide)",
    optional: true,
  });
}

export function createWebSearchTool(provider?: SearchProvider) {
  return createTool({
    name: "web_search",
    description:
      "Search the web and return a list of results with titles, URLs, and snippets. " +
      "Use web_fetch to read the full content of promising results.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new SearchParams() as any,
    execute: async ({ args }) => {
      const { query, page, region } = args as {
        query: string;
        page?: number;
        region?: string;
      };

      // Resolve provider per-invocation so mid-session key changes take effect
      const search = provider ?? resolveSearchProvider();

      try {
        const effectivePage = page && page > 0 ? page : 1;
        const effectiveRegion = region || undefined;
        const response = await search(query, { page: effectivePage, region: effectiveRegion });
        return {
          query,
          page: effectivePage,
          resultCount: response.results.length,
          hasMore: response.hasMore,
          results: response.results,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: `Search failed: ${msg}` };
      }
    },
  });
}
