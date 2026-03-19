import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { handleApiResponse } from "./handle_api_response.ts";

// biome-ignore lint/suspicious/noExplicitAny: save/restore globalThis mocks
let originalWindow: any;

beforeEach(() => {
  originalWindow = globalThis.window;
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  (globalThis as any).window = { location: { assign: () => {} } };
});

afterEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  (globalThis as any).window = originalWindow;
});

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "Test",
    json: async () => body,
  } as Response;
}

describe("handleApiResponse", () => {
  it("returns parsed JSON on success", async () => {
    const result = await handleApiResponse<{ ok: boolean }>(mockResponse(200, { ok: true }));
    assert.deepEqual(result, { ok: true });
  });

  it("throws with error field on non-ok response", async () => {
    await assert.rejects(
      () => handleApiResponse(mockResponse(500, { error: "Server Error" })),
      (err: Error) => {
        assert.equal(err.message, "Server Error");
        return true;
      },
    );
  });

  it("falls back to statusText when error field missing", async () => {
    await assert.rejects(
      () => handleApiResponse(mockResponse(404, {})),
      (err: Error) => {
        assert.equal(err.message, "Test");
        return true;
      },
    );
  });

  it("redirects to /login on 401", async () => {
    let assignCalledWith: string | null = null;
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    (globalThis as any).window = {
      location: {
        assign: (url: string) => {
          assignCalledWith = url;
        },
      },
    };
    await assert.rejects(() => handleApiResponse(mockResponse(401, {})));
    assert.equal(assignCalledWith, "/login");
  });
});
