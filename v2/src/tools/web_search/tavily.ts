import type { SearchProvider } from "./index.ts";

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
  return async (query) => {
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
