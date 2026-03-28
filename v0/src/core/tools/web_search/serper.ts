import type { SearchProvider } from "./index.ts";

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
