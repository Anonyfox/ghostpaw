import { ok, strictEqual } from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import { createTavilySearch } from "./tavily.ts";

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
