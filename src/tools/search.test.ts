import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import {
  createWebSearchTool,
  parseDDGResults,
  type SearchProvider,
  type SearchResponse,
} from "./search.js";

type ToolExecArg = Parameters<ReturnType<typeof createWebSearchTool>["execute"]>[0];
function exec(tool: ReturnType<typeof createWebSearchTool>, args: Record<string, unknown>) {
  return tool.execute({ args } as ToolExecArg);
}

// ── DDG HTML fixture ────────────────────────────────────────────────────────

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
    strictEqual(results[0]!.snippet, "Deno is the open-source JavaScript runtime for the modern web.");
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

// ── web_search tool ─────────────────────────────────────────────────────────

function mockProvider(response: SearchResponse): SearchProvider {
  return async () => response;
}

function capturingProvider(): { provider: SearchProvider; calls: Array<{ query: string; opts: any }> } {
  const calls: Array<{ query: string; opts: any }> = [];
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

    const result = (await exec(tool, { query: "test" })) as any;
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
    strictEqual(calls[0]!.opts.page, 1);
  });

  it("returns error on provider failure", async () => {
    const failProvider: SearchProvider = async () => {
      throw new Error("Network timeout");
    };
    const tool = createWebSearchTool(failProvider);
    const result = (await exec(tool, { query: "test" })) as any;
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
    const result = (await exec(tool, { query: "hello" })) as any;
    strictEqual(result.results[0].title, "Custom: hello");
  });
});
