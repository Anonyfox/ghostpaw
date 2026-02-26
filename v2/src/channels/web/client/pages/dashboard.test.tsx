import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM, waitFor } from "../test_dom.ts";
import { DashboardPage } from "./dashboard.tsx";

const MOCK_STATS = {
  version: "2.0.0",
  uptimeMs: 3_661_000,
  secretsCount: 5,
};

function mockFetch(data: unknown): void {
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => data,
  })) as unknown as typeof fetch;
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

  it("shows loading text initially", () => {
    mockFetch(MOCK_STATS);
    render(<DashboardPage />, dom.container);

    const loading = dom.container.querySelector(".text-muted");
    assert.ok(loading, "loading indicator exists");
    assert.equal(loading!.textContent, "Loading...");
  });

  it("shows the dashboard heading", () => {
    mockFetch(MOCK_STATS);
    render(<DashboardPage />, dom.container);

    const heading = dom.container.querySelector("h2");
    assert.ok(heading, "heading exists");
    assert.equal(heading!.textContent, "Dashboard");
  });

  it("shows stats after fetch resolves", async () => {
    mockFetch(MOCK_STATS);
    render(<DashboardPage />, dom.container);
    await waitFor(() => (dom.container.textContent ?? "").includes("2.0.0"));

    const text = dom.container.textContent ?? "";
    assert.ok(text.includes("1h 1m"), "formatted uptime is rendered");
    assert.ok(text.includes("5"), "secrets count is rendered");
  });
});
