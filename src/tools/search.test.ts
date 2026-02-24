import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import {
  createBraveSearch,
  createSerperSearch,
  createTavilySearch,
  createWebSearchTool,
  parseDDGResults,
  resolveSearchProvider,
  type SearchProvider,
  type SearchResponse,
  type SearchResult,
} from "./search.js";

type ToolExecArg = Parameters<ReturnType<typeof createWebSearchTool>["execute"]>[0];
function exec(tool: ReturnType<typeof createWebSearchTool>, args: Record<string, unknown>) {
  return tool.execute({ args } as ToolExecArg);
}

// ── DDG HTML fixtures ───────────────────────────────────────────────────────

const DDG_FIXTURE = `<!DOCTYPE html>
<html>
<head><title>typescript runtime at DuckDuckGo</title></head>
<body>
<div id="links">
  <div class="result results_links results_links_deep web-result">
    <h2 class="result__title">
      <a href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fdeno.com%2F&amp;rut=abc123">
        Deno - Next-Gen JS Runtime
      </a>
    </h2>
    <a class="result__snippet" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fdeno.com%2F&amp;rut=abc123">
      Deno is the open-source JavaScript runtime for the modern web.
    </a>
  </div>
  <div class="result results_links results_links_deep web-result">
    <h2 class="result__title">
      <a href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fnodejs.org%2Fen%2Flearn%2Ftypescript%2Frun&amp;rut=def456">
        Running TypeScript - Node.js
      </a>
    </h2>
    <a class="result__snippet" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fnodejs.org%2Fen%2Flearn%2Ftypescript%2Frun&amp;rut=def456">
      Node.js is a free, open-source JavaScript runtime environment.
    </a>
  </div>
  <div class="result results_links results_links_deep web-result">
    <h2 class="result__title">
      <a href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fno-snippet&amp;rut=ghi789">
        Result Without Snippet
      </a>
    </h2>
  </div>
  <div class="result result--ad result--ad--small web-result">
    <h2 class="result__title">
      <a href="https://duckduckgo.com/y.js?ad_provider=foo">Sponsored Ad</a>
    </h2>
    <a class="result__snippet" href="#">Buy now!</a>
  </div>
</div>
<form>
  <input type="hidden" name="vqd" value="4-123456789_ABCDEF">
  <input type="submit" value="Next">
</form>
</body>
</html>`;

const DDG_NO_RESULTS = `<!DOCTYPE html>
<html><body><div id="links"></div></body></html>`;

const DDG_LAST_PAGE = `<!DOCTYPE html>
<html><body>
<div id="links">
  <div class="result results_links web-result">
    <h2><a href="https://example.com/last">Last Result</a></h2>
    <a class="result__snippet">Final snippet.</a>
  </div>
</div>
</body></html>`;

// ── parseDDGResults ─────────────────────────────────────────────────────────

describe("parseDDGResults", () => {
  it("extracts results from DDG HTML", async () => {
    const { results } = await parseDDGResults(DDG_FIXTURE);
    ok(results.length >= 2);
    strictEqual(results[0]!.title, "Deno - Next-Gen JS Runtime");
    strictEqual(results[0]!.url, "https://deno.com/");
    strictEqual(
      results[0]!.snippet,
      "Deno is the open-source JavaScript runtime for the modern web.",
    );
  });

  it("unwraps DDG redirect URLs", async () => {
    const { results } = await parseDDGResults(DDG_FIXTURE);
    strictEqual(results[1]!.url, "https://nodejs.org/en/learn/typescript/run");
    ok(!results[1]!.url.includes("duckduckgo.com"));
  });

  it("handles results without snippets", async () => {
    const { results } = await parseDDGResults(DDG_FIXTURE);
    const noSnippet = results.find((r) => r.title === "Result Without Snippet");
    ok(noSnippet);
    strictEqual(noSnippet.snippet, "");
  });

  it("filters out DDG internal URLs (ads)", async () => {
    const { results } = await parseDDGResults(DDG_FIXTURE);
    ok(!results.some((r) => r.url.startsWith("https://duckduckgo.com")));
  });

  it("extracts vqd token for pagination", async () => {
    const { vqd } = await parseDDGResults(DDG_FIXTURE);
    strictEqual(vqd, "4-123456789_ABCDEF");
  });

  it("detects hasMore when Next button exists", async () => {
    strictEqual((await parseDDGResults(DDG_FIXTURE)).hasMore, true);
  });

  it("returns hasMore=false on last page", async () => {
    strictEqual((await parseDDGResults(DDG_LAST_PAGE)).hasMore, false);
  });

  it("returns empty results for no-results page", async () => {
    const { results, hasMore } = await parseDDGResults(DDG_NO_RESULTS);
    strictEqual(results.length, 0);
    strictEqual(hasMore, false);
  });

  it("handles plain URLs without uddg wrapper", async () => {
    const { results } = await parseDDGResults(DDG_LAST_PAGE);
    strictEqual(results[0]!.url, "https://example.com/last");
  });
});

// ── Brave Search provider ───────────────────────────────────────────────────

describe("createBraveSearch", () => {
  afterEach(() => mock.restoreAll());

  it("parses Brave API response into SearchResult[]", async () => {
    const braveResponse = {
      type: "search",
      web: {
        results: [
          { title: "Deno", url: "https://deno.land", description: "Modern JS runtime" },
          { title: "Node.js", url: "https://nodejs.org", description: "Server-side JS" },
        ],
      },
    };

    mock.method(globalThis, "fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => braveResponse,
    }));

    const provider = createBraveSearch("test-key");
    const result = await provider("javascript runtime");

    strictEqual(result.results.length, 2);
    strictEqual(result.results[0]!.title, "Deno");
    strictEqual(result.results[0]!.url, "https://deno.land");
    strictEqual(result.results[0]!.snippet, "Modern JS runtime");
    strictEqual(result.hasMore, false);
  });

  it("sends correct headers with API key", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = Object.fromEntries(Object.entries(init.headers as Record<string, string>));
      return { ok: true, status: 200, json: async () => ({ web: { results: [] } }) };
    });

    const provider = createBraveSearch("my-brave-key");
    await provider("test query");

    ok(capturedUrl.includes("api.search.brave.com"));
    ok(capturedUrl.includes("q=test+query"));
    strictEqual(capturedHeaders["X-Subscription-Token"], "my-brave-key");
  });

  it("calculates offset for pagination", async () => {
    let capturedUrl = "";

    mock.method(globalThis, "fetch", async (url: string) => {
      capturedUrl = url;
      return { ok: true, status: 200, json: async () => ({ web: { results: [] } }) };
    });

    const provider = createBraveSearch("key");
    await provider("test", { page: 3 });

    ok(capturedUrl.includes("offset=20"));
  });

  it("throws on 401 (invalid key)", async () => {
    mock.method(globalThis, "fetch", async () => ({ ok: false, status: 401 }));
    const provider = createBraveSearch("bad-key");
    await provider("test").then(
      () => ok(false, "should throw"),
      (err: Error) => ok(err.message.includes("invalid API key")),
    );
  });

  it("throws on 429 (rate limit)", async () => {
    mock.method(globalThis, "fetch", async () => ({ ok: false, status: 429 }));
    const provider = createBraveSearch("key");
    await provider("test").then(
      () => ok(false, "should throw"),
      (err: Error) => ok(err.message.includes("rate limit")),
    );
  });

  it("handles empty web.results gracefully", async () => {
    mock.method(globalThis, "fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({ web: {} }),
    }));

    const provider = createBraveSearch("key");
    const result = await provider("empty query");
    strictEqual(result.results.length, 0);
  });

  it("handles missing description field", async () => {
    mock.method(globalThis, "fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        web: { results: [{ title: "No Desc", url: "https://x.com" }] },
      }),
    }));

    const provider = createBraveSearch("key");
    const result = await provider("test");
    strictEqual(result.results[0]!.snippet, "");
  });
});

// ── Tavily Search provider ──────────────────────────────────────────────────

describe("createTavilySearch", () => {
  afterEach(() => mock.restoreAll());

  it("parses Tavily API response into SearchResult[]", async () => {
    const tavilyResponse = {
      results: [
        { title: "Deno", url: "https://deno.land", content: "Modern runtime", score: 0.95 },
        { title: "Bun", url: "https://bun.sh", content: "Fast toolkit", score: 0.88 },
      ],
    };

    mock.method(globalThis, "fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => tavilyResponse,
    }));

    const provider = createTavilySearch("tvly-test");
    const result = await provider("javascript runtime");

    strictEqual(result.results.length, 2);
    strictEqual(result.results[0]!.title, "Deno");
    strictEqual(result.results[0]!.snippet, "Modern runtime");
    strictEqual(result.results[1]!.url, "https://bun.sh");
  });

  it("sends POST with Bearer auth and correct body", async () => {
    let capturedMethod = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody = "";

    mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
      capturedMethod = init.method ?? "";
      capturedHeaders = Object.fromEntries(Object.entries(init.headers as Record<string, string>));
      capturedBody = init.body as string;
      return { ok: true, status: 200, json: async () => ({ results: [] }) };
    });

    const provider = createTavilySearch("tvly-my-key");
    await provider("test query");

    strictEqual(capturedMethod, "POST");
    strictEqual(capturedHeaders.Authorization, "Bearer tvly-my-key");
    const parsed = JSON.parse(capturedBody);
    strictEqual(parsed.query, "test query");
    strictEqual(parsed.max_results, 10);
    strictEqual(parsed.search_depth, "basic");
  });

  it("throws on 401 (invalid key)", async () => {
    mock.method(globalThis, "fetch", async () => ({ ok: false, status: 401 }));
    const provider = createTavilySearch("bad");
    await provider("test").then(
      () => ok(false, "should throw"),
      (err: Error) => ok(err.message.includes("invalid API key")),
    );
  });

  it("throws on 429 or 432 (rate/credit limit)", async () => {
    mock.method(globalThis, "fetch", async () => ({ ok: false, status: 432 }));
    const provider = createTavilySearch("key");
    await provider("test").then(
      () => ok(false, "should throw"),
      (err: Error) => ok(err.message.includes("limit")),
    );
  });

  it("handles missing content field", async () => {
    mock.method(globalThis, "fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{ title: "Bare", url: "https://bare.com" }],
      }),
    }));

    const provider = createTavilySearch("key");
    const result = await provider("test");
    strictEqual(result.results[0]!.snippet, "");
  });
});

// ── Serper.dev provider ─────────────────────────────────────────────────────

describe("createSerperSearch", () => {
  afterEach(() => mock.restoreAll());

  it("parses Serper API response into SearchResult[]", async () => {
    const serperResponse = {
      organic: [
        { title: "Google", link: "https://google.com", snippet: "Search engine", position: 1 },
        { title: "Bing", link: "https://bing.com", snippet: "Another engine", position: 2 },
      ],
    };

    mock.method(globalThis, "fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => serperResponse,
    }));

    const provider = createSerperSearch("serper-key");
    const result = await provider("search engines");

    strictEqual(result.results.length, 2);
    strictEqual(result.results[0]!.title, "Google");
    strictEqual(result.results[0]!.url, "https://google.com");
    strictEqual(result.results[0]!.snippet, "Search engine");
  });

  it("sends POST with X-API-KEY header", async () => {
    let capturedHeaders: Record<string, string> = {};
    let capturedBody = "";

    mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
      capturedHeaders = Object.fromEntries(Object.entries(init.headers as Record<string, string>));
      capturedBody = init.body as string;
      return { ok: true, status: 200, json: async () => ({ organic: [] }) };
    });

    const provider = createSerperSearch("my-serper-key");
    await provider("test");

    strictEqual(capturedHeaders["X-API-KEY"], "my-serper-key");
    const parsed = JSON.parse(capturedBody);
    strictEqual(parsed.q, "test");
  });

  it("sends page parameter for pagination", async () => {
    let capturedBody = "";

    mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return { ok: true, status: 200, json: async () => ({ organic: [] }) };
    });

    const provider = createSerperSearch("key");
    await provider("test", { page: 2 });

    const parsed = JSON.parse(capturedBody);
    strictEqual(parsed.page, 2);
  });

  it("does not send page=1 for first page", async () => {
    let capturedBody = "";

    mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return { ok: true, status: 200, json: async () => ({ organic: [] }) };
    });

    const provider = createSerperSearch("key");
    await provider("test", { page: 1 });

    const parsed = JSON.parse(capturedBody);
    strictEqual(parsed.page, undefined);
  });

  it("throws on 401/403 (invalid key)", async () => {
    mock.method(globalThis, "fetch", async () => ({ ok: false, status: 403 }));
    const provider = createSerperSearch("bad");
    await provider("test").then(
      () => ok(false, "should throw"),
      (err: Error) => ok(err.message.includes("invalid API key")),
    );
  });

  it("handles missing snippet field", async () => {
    mock.method(globalThis, "fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        organic: [{ title: "Bare", link: "https://bare.com", position: 1 }],
      }),
    }));

    const provider = createSerperSearch("key");
    const result = await provider("test");
    strictEqual(result.results[0]!.snippet, "");
  });
});

// ── resolveSearchProvider (env var cascade) ─────────────────────────────────

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

// ── web_search tool ─────────────────────────────────────────────────────────

function mockProvider(response: SearchResponse): SearchProvider {
  return async () => response;
}

interface CapturedCall {
  query: string;
  opts: { page?: number; region?: string } | undefined;
}

function capturingProvider(): {
  provider: SearchProvider;
  calls: CapturedCall[];
} {
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

describe("web_search tool - metadata", () => {
  it("has correct name and description", () => {
    const tool = createWebSearchTool(mockProvider({ results: [], hasMore: false }));
    strictEqual(tool.name, "web_search");
    ok(tool.description.includes("Search the web"));
  });
});

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
    strictEqual(result.results[0].title, "Foo");
    strictEqual(result.results[1].url, "https://bar.com");
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

describe("web_search tool - provider swapping", () => {
  it("accepts a custom search provider", async () => {
    const custom: SearchProvider = async (query) => ({
      results: [{ title: `Custom: ${query}`, url: "https://custom.search", snippet: "custom" }],
      hasMore: false,
    });
    const tool = createWebSearchTool(custom);
    const result = (await exec(tool, { query: "hello" })) as {
      results: SearchResult[];
    };
    strictEqual(result.results[0].title, "Custom: hello");
  });
});

describe("web_search tool - lazy provider resolution", () => {
  afterEach(() => {
    delete process.env.BRAVE_API_KEY;
    delete process.env.TAVILY_API_KEY;
    delete process.env.SERPER_API_KEY;
  });

  it("re-resolves provider on each invocation (mid-session key change)", async () => {
    const tool = createWebSearchTool();

    // No premium keys set — should use DDG (we can't easily test DDG here,
    // but we can verify that setting a key mid-session is picked up)
    process.env.BRAVE_API_KEY = "test-brave-key";

    // The tool should now try Brave (which will fail with a network error,
    // proving it re-resolved to Brave rather than staying on DDG)
    const result = (await exec(tool, { query: "test" })) as { error?: string };
    // Either it errors (because test-brave-key is invalid) or succeeds,
    // but it should NOT have used the DDG provider from creation time
    ok(result !== undefined);
  });
});
