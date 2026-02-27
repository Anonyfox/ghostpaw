import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { apiGet } from "./api_get.ts";

// biome-ignore lint/suspicious/noExplicitAny: save/restore globalThis mocks
let originalFetch: any;
// biome-ignore lint/suspicious/noExplicitAny: save/restore globalThis mocks
let originalWindow: any;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalWindow = globalThis.window;
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  (globalThis as any).window = { location: { assign: () => {} } };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  (globalThis as any).window = originalWindow;
});

function mockFetch(status: number, body: unknown): void {
  globalThis.fetch = (async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Test",
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("apiGet", () => {
  it("fetches with GET and returns parsed JSON", async () => {
    const data = { foo: "bar" };
    mockFetch(200, data);
    const result = await apiGet<{ foo: string }>("/api/test");
    assert.deepEqual(result, data);
  });

  it("throws on non-ok response", async () => {
    mockFetch(500, { error: "Internal Server Error" });
    await assert.rejects(
      async () => apiGet("/api/test"),
      (err: Error) => {
        assert.equal(err.message, "Internal Server Error");
        return true;
      },
    );
  });

  it("uses statusText when error field is missing", async () => {
    mockFetch(404, {});
    await assert.rejects(
      async () => apiGet("/api/test"),
      (err: Error) => {
        assert.equal(err.message, "Test");
        return true;
      },
    );
  });

  it("redirects to /login on 401", async () => {
    let assignCalledWith: string | null = null;
    mockFetch(401, {});
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    (globalThis as any).window = {
      location: {
        assign: (url: string) => {
          assignCalledWith = url;
        },
      },
    };
    await assert.rejects(async () => apiGet("/api/test"));
    assert.equal(assignCalledWith, "/login");
  });
});
