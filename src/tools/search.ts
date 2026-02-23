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

// ── DDG Lite HTML parser ────────────────────────────────────────────────────

const DDG_URL = "https://html.duckduckgo.com/html/";
const DDG_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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

// ── DDG Lite fetch ──────────────────────────────────────────────────────────

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

    const res = await fetch(DDG_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": DDG_USER_AGENT,
        Referer: "https://html.duckduckgo.com/",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`DDG search failed: HTTP ${res.status}`);
    }

    return await parseDDGResults(await res.text());
  };
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
  const search = provider ?? createDDGSearch();

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

      try {
        const response = await search(query, { page: page ?? 1, region });
        return {
          query,
          page: page ?? 1,
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
