import { ok, strictEqual } from "node:assert";
import { afterEach, describe, it, mock } from "node:test";
import { createSerperSearch } from "./serper.ts";

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
