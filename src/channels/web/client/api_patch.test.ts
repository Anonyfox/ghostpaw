import { deepStrictEqual, rejects, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { apiPatch } from "./api_patch.ts";

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

describe("apiPatch", () => {
  it("calls fetch with PATCH method and JSON content type", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ ok: true }));
    await apiPatch("/api/item/1", { name: "updated" });
    strictEqual(mockFetch.mock.callCount(), 1);
    const [path, opts] = mockFetch.mock.calls[0].arguments as [string, RequestInit];
    strictEqual(path, "/api/item/1");
    strictEqual(opts.method, "PATCH");
    strictEqual((opts.headers as Record<string, string>)["Content-Type"], "application/json");
    strictEqual(opts.body, '{"name":"updated"}');
  });

  it("sends no body when body is undefined", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ ok: true }));
    await apiPatch("/api/item/1");
    const [, opts] = mockFetch.mock.calls[0].arguments as [string, RequestInit];
    strictEqual(opts.body, undefined);
  });

  it("returns parsed JSON on success", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ patched: true }));
    const result = await apiPatch<{ patched: boolean }>("/api/item/1", {});
    deepStrictEqual(result, { patched: true });
  });

  it("throws on error response", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ error: "Conflict" }, 409));
    await rejects(apiPatch("/api/item/1", {}), /Conflict/);
  });
});
