import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
import { DashboardPage } from "./dashboard.tsx";

const MOCK_STATS = {
  version: "2.0.0",
  uptimeMs: 3_661_000,
  secretsCount: 5,
};

function mockFetch(urlMap: Record<string, unknown>): void {
  globalThis.fetch = (async (url: string) => {
    for (const [pattern, data] of Object.entries(urlMap)) {
      if (url.includes(pattern)) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => data,
        };
      }
    }
    return {
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: "Not found" }),
    };
  }) as unknown as typeof fetch;
}

describe("DashboardPage", () => {
  let dom: ReturnType<typeof createTestDOM>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
    globalThis.fetch = originalFetch;
  });

  it("shows the dashboard heading", () => {
    mockFetch({ "/api/dashboard": MOCK_STATS });
    render(<DashboardPage />, dom.container);

    const heading = dom.container.querySelector("h2");
    assert.ok(heading, "heading exists");
    assert.equal(heading!.textContent, "Dashboard");
  });

  it("shows stats after fetch resolves", async () => {
    mockFetch({ "/api/dashboard": MOCK_STATS });
    render(<DashboardPage />, dom.container);
    await waitFor(() => (dom.container.textContent ?? "").includes("2.0.0"));

    const text = dom.container.textContent ?? "";
    assert.ok(text.includes("1h 1m"), "formatted uptime is rendered");
    assert.ok(text.includes("5"), "secrets count is rendered");
  });
});
