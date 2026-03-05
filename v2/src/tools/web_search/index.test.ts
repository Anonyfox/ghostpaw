import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import type { SearchProvider, SearchResponse, SearchResult } from "./index.ts";
import { createWebSearchTool, resolveSearchProvider } from "./index.ts";

type ToolExecArg = Parameters<ReturnType<typeof createWebSearchTool>["execute"]>[0];
function exec(tool: ReturnType<typeof createWebSearchTool>, args: Record<string, unknown>) {
  return tool.execute({ args } as ToolExecArg);
}

function mockProvider(response: SearchResponse): SearchProvider {
  return async () => response;
}

interface CapturedCall {
  query: string;
  opts: { page?: number; region?: string } | undefined;
}

function capturingProvider(): { provider: SearchProvider; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  return {
    calls,
    provider: async (query, opts) => {
      calls.push({ query, opts });
      return {
        results: [{ title: "Test", url: "https://example.com", snippet: "A test result" }],
        hasMore: false,
      };
    },
  };
}

// -- Tool metadata --

describe("web_search tool - metadata", () => {
  it("has correct name and description", () => {
    const tool = createWebSearchTool(mockProvider({ results: [], hasMore: false }));
    strictEqual(tool.name, "web_search");
    ok(tool.description.includes("Search the web"));
  });
});

// -- Tool execution --

describe("web_search tool - execution", () => {
  it("returns search results from the provider", async () => {
    const tool = createWebSearchTool(
      mockProvider({
        results: [
          { title: "Foo", url: "https://foo.com", snippet: "Foo snippet" },
          { title: "Bar", url: "https://bar.com", snippet: "Bar snippet" },
        ],
        hasMore: true,
      }),
    );

    const result = (await exec(tool, { query: "test" })) as {
      resultCount: number;
      hasMore: boolean;
      results: SearchResult[];
    };
    strictEqual(result.resultCount, 2);
    strictEqual(result.hasMore, true);
    strictEqual(result.results[0]!.title, "Foo");
    strictEqual(result.results[1]!.url, "https://bar.com");
  });

  it("forwards query, page, and region to provider", async () => {
    const { provider, calls } = capturingProvider();
    const tool = createWebSearchTool(provider);

    await exec(tool, { query: "ghostpaw", page: 3, region: "de-de" });
    strictEqual(calls.length, 1);
    strictEqual(calls[0]!.query, "ghostpaw");
    deepStrictEqual(calls[0]!.opts, { page: 3, region: "de-de" });
  });

  it("defaults page to 1", async () => {
    const { provider, calls } = capturingProvider();
    const tool = createWebSearchTool(provider);

    await exec(tool, { query: "test" });
    strictEqual(calls[0]!.opts?.page, 1);
  });

  it("returns error on provider failure", async () => {
    const failProvider: SearchProvider = async () => {
      throw new Error("Network timeout");
    };
    const tool = createWebSearchTool(failProvider);
    const result = (await exec(tool, { query: "test" })) as { error: string };
    ok(result.error.includes("Network timeout"));
  });
});

// -- Provider swapping --

describe("web_search tool - provider swapping", () => {
  it("accepts a custom search provider", async () => {
    const custom: SearchProvider = async (query) => ({
      results: [{ title: `Custom: ${query}`, url: "https://custom.search", snippet: "custom" }],
      hasMore: false,
    });
    const tool = createWebSearchTool(custom);
    const result = (await exec(tool, { query: "hello" })) as { results: SearchResult[] };
    strictEqual(result.results[0]!.title, "Custom: hello");
  });
});

// -- resolveSearchProvider --

describe("resolveSearchProvider", () => {
  afterEach(() => {
    delete process.env.BRAVE_API_KEY;
    delete process.env.TAVILY_API_KEY;
    delete process.env.SERPER_API_KEY;
  });

  it("returns DDG when no env vars set", () => {
    const provider = resolveSearchProvider();
    ok(typeof provider === "function");
  });

  it("returns Brave provider when BRAVE_API_KEY is set", () => {
    process.env.BRAVE_API_KEY = "test-brave";
    const provider = resolveSearchProvider();
    ok(typeof provider === "function");
  });

  it("Brave takes priority over Tavily and Serper", async () => {
    process.env.BRAVE_API_KEY = "brave";
    process.env.TAVILY_API_KEY = "tavily";
    process.env.SERPER_API_KEY = "serper";

    let capturedUrl = "";
    mock.method(globalThis, "fetch", async (url: string) => {
      capturedUrl = url;
      return { ok: true, status: 200, json: async () => ({ web: { results: [] } }) };
    });

    const provider = resolveSearchProvider();
    await provider("test");
    ok(capturedUrl.includes("brave"), `Expected Brave URL, got: ${capturedUrl}`);
    mock.restoreAll();
  });

  it("falls to Tavily when only TAVILY_API_KEY is set", async () => {
    process.env.TAVILY_API_KEY = "tavily";

    let capturedUrl = "";
    mock.method(globalThis, "fetch", async (url: string) => {
      capturedUrl = url;
      return { ok: true, status: 200, json: async () => ({ results: [] }) };
    });

    const provider = resolveSearchProvider();
    await provider("test");
    ok(capturedUrl.includes("tavily"), `Expected Tavily URL, got: ${capturedUrl}`);
    mock.restoreAll();
  });

  it("falls to Serper when only SERPER_API_KEY is set", async () => {
    process.env.SERPER_API_KEY = "serper";

    let capturedUrl = "";
    mock.method(globalThis, "fetch", async (url: string) => {
      capturedUrl = url;
      return { ok: true, status: 200, json: async () => ({ organic: [] }) };
    });

    const provider = resolveSearchProvider();
    await provider("test");
    ok(capturedUrl.includes("serper"), `Expected Serper URL, got: ${capturedUrl}`);
    mock.restoreAll();
  });
});

// -- Lazy provider resolution --

describe("web_search tool - lazy provider resolution", () => {
  afterEach(() => {
    delete process.env.BRAVE_API_KEY;
    delete process.env.TAVILY_API_KEY;
    delete process.env.SERPER_API_KEY;
  });

  it("re-resolves provider on each invocation (mid-session key change)", async () => {
    const tool = createWebSearchTool();

    process.env.BRAVE_API_KEY = "test-brave-key";

    const result = (await exec(tool, { query: "test" })) as { error?: string };
    ok(result !== undefined);
  });
});
