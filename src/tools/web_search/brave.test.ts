import { ok, strictEqual } from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import { createBraveSearch } from "./brave.ts";

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
