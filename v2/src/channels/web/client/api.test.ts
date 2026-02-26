import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { apiDelete, apiGet, apiPost } from "./api.ts";

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

describe("apiPost", () => {
  it("sends POST with JSON body", async () => {
    const data = { id: 1 };
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

    const result = await apiPost<{ id: number }>("/api/test", { name: "x" });
    assert.deepEqual(result, data);
    assert.equal(capturedInit?.method, "POST");
    assert.equal(
      (capturedInit?.headers as Record<string, string>)?.["Content-Type"],
      "application/json",
    );
    assert.equal(capturedInit?.body, '{"name":"x"}');
  });

  it("sends POST without body", async () => {
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

    const result = await apiPost("/api/test");
    assert.deepEqual(result, data);
    assert.equal(capturedInit?.method, "POST");
    assert.equal(capturedInit?.body, undefined);
  });

  it("throws on non-ok response", async () => {
    mockFetch(400, { error: "Bad Request" });

    await assert.rejects(
      async () => apiPost("/api/test", {}),
      (err: Error) => {
        assert.equal(err.message, "Bad Request");
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

    await assert.rejects(async () => apiPost("/api/test", {}));
    assert.equal(assignCalledWith, "/login");
  });
});

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
