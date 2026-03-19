import { deepStrictEqual, rejects, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { apiPost } from "./api_post.ts";

const originalFetch = globalThis.fetch;
let mockFetch: ReturnType<typeof mock.fn>;

beforeEach(() => {
  (globalThis as Record<string, unknown>).window = { location: { assign: mock.fn() } };
  mockFetch = mock.fn();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete (globalThis as Record<string, unknown>).window;
});

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: async () => data,
  } as unknown as Response;
}

describe("apiPost", () => {
  it("calls fetch with POST method and JSON content type", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ ok: true }));
    await apiPost("/api/test", { key: "value" });
    strictEqual(mockFetch.mock.callCount(), 1);
    const [path, opts] = mockFetch.mock.calls[0].arguments as [string, RequestInit];
    strictEqual(path, "/api/test");
    strictEqual(opts.method, "POST");
    strictEqual((opts.headers as Record<string, string>)["Content-Type"], "application/json");
    strictEqual(opts.body, '{"key":"value"}');
  });

  it("sends no body when body is undefined", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ ok: true }));
    await apiPost("/api/test");
    const [, opts] = mockFetch.mock.calls[0].arguments as [string, RequestInit];
    strictEqual(opts.body, undefined);
  });

  it("returns parsed JSON on success", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ id: 1 }));
    const result = await apiPost<{ id: number }>("/api/create", {});
    deepStrictEqual(result, { id: 1 });
  });

  it("throws on error response", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ error: "Bad request" }, 400));
    await rejects(apiPost("/api/fail", {}), /Bad request/);
  });
});
