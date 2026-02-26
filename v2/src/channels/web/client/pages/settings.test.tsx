import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM, waitFor } from "../test_dom.ts";
import { SettingsPage } from "./settings.tsx";

const MOCK_SECRETS = {
  secrets: [
    {
      key: "API_KEY_ANTHROPIC",
      label: "Anthropic",
      category: "llm",
      configured: true,
      isActiveSearch: false,
    },
    {
      key: "API_KEY_OPENAI",
      label: "OpenAI",
      category: "llm",
      configured: false,
      isActiveSearch: false,
    },
    {
      key: "BRAVE_API_KEY",
      label: "Brave Search",
      category: "search",
      configured: true,
      isActiveSearch: true,
    },
    {
      key: "MY_CUSTOM_KEY",
      label: "MY_CUSTOM_KEY",
      category: "custom",
      configured: true,
      isActiveSearch: false,
    },
  ],
};

function mockFetch(data: unknown): void {
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => data,
  })) as unknown as typeof fetch;
}

describe("SettingsPage", () => {
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

  it("shows loading state initially", () => {
    mockFetch(MOCK_SECRETS);
    render(<SettingsPage />, dom.container);

    const loading = dom.container.querySelector(".text-muted");
    assert.ok(loading);
    assert.equal(loading!.textContent, "Loading...");
  });

  it("renders the Settings heading", () => {
    mockFetch(MOCK_SECRETS);
    render(<SettingsPage />, dom.container);

    const heading = dom.container.querySelector("h2");
    assert.ok(heading);
    assert.equal(heading!.textContent, "Settings");
  });

  it("renders all three sections after loading", async () => {
    mockFetch(MOCK_SECRETS);
    render(<SettingsPage />, dom.container);
    await waitFor(() => (dom.container.textContent ?? "").includes("Custom Secrets"));

    const text = dom.container.textContent ?? "";
    assert.ok(text.includes("LLM Providers"), "has LLM section");
    assert.ok(text.includes("Search Providers"), "has Search section");
  });

  it("shows configured status for each secret", async () => {
    mockFetch(MOCK_SECRETS);
    render(<SettingsPage />, dom.container);
    await waitFor(() => (dom.container.textContent ?? "").includes("Anthropic"));

    const text = dom.container.textContent ?? "";
    assert.ok(text.includes("OpenAI"), "shows OpenAI");
    assert.ok(text.includes("Brave Search"), "shows Brave");
  });

  it("shows custom secrets in the Custom section", async () => {
    mockFetch(MOCK_SECRETS);
    render(<SettingsPage />, dom.container);
    await waitFor(() => (dom.container.textContent ?? "").includes("MY_CUSTOM_KEY"));
  });

  it("always shows the Custom Secrets section with Add Secret button", async () => {
    mockFetch({ secrets: MOCK_SECRETS.secrets.filter((s) => s.category !== "custom") });
    render(<SettingsPage />, dom.container);
    await waitFor(() => (dom.container.textContent ?? "").includes("Custom Secrets"));

    const text = dom.container.textContent ?? "";
    assert.ok(text.includes("Add Secret"), "Add Secret button present");
  });

  it("shows error state when fetch fails", async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      statusText: "Server Error",
      json: async () => ({ error: "Server Error" }),
    })) as unknown as typeof fetch;

    render(<SettingsPage />, dom.container);
    await waitFor(() => dom.container.querySelector(".alert-danger") !== null);
  });
});
