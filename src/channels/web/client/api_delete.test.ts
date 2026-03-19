import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { apiDelete } from "./api_delete.ts";

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

describe("apiDelete", () => {
  it("sends DELETE and returns parsed JSON", async () => {
    const data = { ok: true };
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => data,
      } as Response;
    }) as typeof fetch;

    const result = await apiDelete<{ ok: boolean }>("/api/test/key");
    assert.deepEqual(result, data);
    assert.equal(capturedInit?.method, "DELETE");
  });

  it("throws on non-ok response", async () => {
    mockFetch(404, { error: "Not Found" });
    await assert.rejects(
      async () => apiDelete("/api/test/key"),
      (err: Error) => {
        assert.equal(err.message, "Not Found");
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
    await assert.rejects(async () => apiDelete("/api/test/key"));
    assert.equal(assignCalledWith, "/login");
  });
});
