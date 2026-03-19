import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { parseDDGResults } from "./ddg.ts";

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

const DDG_NO_RESULTS = '<!DOCTYPE html><html><body><div id="links"></div></body></html>';

const DDG_LAST_PAGE = `<!DOCTYPE html>
<html><body>
<div id="links">
  <div class="result results_links web-result">
    <h2><a href="https://example.com/last">Last Result</a></h2>
    <a class="result__snippet">Final snippet.</a>
  </div>
</div>
</body></html>`;

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
