import { deepStrictEqual, rejects, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { apiGet } from "./api_get.ts";

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

describe("apiGet", () => {
  it("calls fetch with GET and same-origin credentials", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ ok: true }));
    await apiGet("/api/test");
    strictEqual(mockFetch.mock.callCount(), 1);
    const [path, opts] = mockFetch.mock.calls[0].arguments as [string, RequestInit];
    strictEqual(path, "/api/test");
    strictEqual(opts.credentials, "same-origin");
  });

  it("returns parsed JSON on success", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ data: 42 }));
    const result = await apiGet<{ data: number }>("/api/test");
    deepStrictEqual(result, { data: 42 });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({ error: "Not found" }, 404));
    await rejects(apiGet("/api/missing"), /Not found/);
  });

  it("redirects to /login on 401", async () => {
    mockFetch.mock.mockImplementation(async () => jsonResponse({}, 401));
    await rejects(apiGet("/api/protected"), /Unauthorized/);
  });
});
