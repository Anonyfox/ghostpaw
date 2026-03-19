import { createTool, Schema } from "chatoyant";
import { createBraveSearch } from "./brave.ts";
import { createDDGSearch } from "./ddg.ts";
import { createSerperSearch } from "./serper.ts";
import { createTavilySearch } from "./tavily.ts";

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

export function resolveSearchProvider(): SearchProvider {
  const braveKey = process.env.BRAVE_API_KEY;
  if (braveKey) return createBraveSearch(braveKey);

  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) return createTavilySearch(tavilyKey);

  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) return createSerperSearch(serperKey);

  return createDDGSearch();
}

class SearchParams extends Schema {
  query = Schema.String({
    description:
      "Search query — natural language or keywords. Be specific for better results. " +
      "Example: 'Node.js SQLite WAL mode performance' rather than 'database'.",
  });
  page = Schema.Integer({
    description: "Page number for pagination (1-based, default: 1)",
    optional: true,
  });
  region = Schema.String({
    description: "Region code for localized results (e.g. 'en-us', 'de-de', default: worldwide)",
    optional: true,
  });
}

export function createWebSearchTool(provider?: SearchProvider) {
  return createTool({
    name: "web_search",
    description:
      "Search the web and return a list of results with titles, URLs, and snippets. " +
      "Supports pagination for deeper results. Use web_fetch on a result URL to read " +
      "the full page content. Automatically selects the best available search provider.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new SearchParams() as any,
    execute: async ({ args }) => {
      const { query, page, region } = args as {
        query: string;
        page?: number;
        region?: string;
      };

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
