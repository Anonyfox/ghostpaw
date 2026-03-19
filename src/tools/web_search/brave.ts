import type { SearchProvider } from "./index.ts";

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
    const params = new URLSearchParams({ q: query, count: "10" });
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
