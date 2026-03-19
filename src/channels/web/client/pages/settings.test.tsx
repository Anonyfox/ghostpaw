import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
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

const MOCK_CONFIG = {
  config: [
    {
      key: "default_model",
      value: "claude-sonnet-4-6",
      type: "string",
      category: "model",
      source: "default",
      isDefault: true,
      label: "Default Model",
    },
    {
      key: "max_cost_per_day",
      value: "5",
      type: "number",
      category: "cost",
      source: "default",
      isDefault: true,
      label: "Max Cost Per Day",
    },
  ],
};

const MOCK_MODELS = {
  currentModel: "claude-sonnet-4-6",
  currentProvider: "anthropic",
  providers: [
    {
      id: "anthropic",
      name: "Anthropic",
      hasKey: true,
      isCurrent: true,
      models: ["claude-sonnet-4-6"],
      modelsSource: "live",
    },
    {
      id: "openai",
      name: "OpenAI",
      hasKey: false,
      isCurrent: false,
      models: [],
      modelsSource: "static",
    },
    { id: "xai", name: "xAI", hasKey: false, isCurrent: false, models: [], modelsSource: "static" },
  ],
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

const ALL_MOCKS = {
  "/api/secrets": MOCK_SECRETS,
  "/api/config": MOCK_CONFIG,
  "/api/models": MOCK_MODELS,
};

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

  it("renders the Settings heading", () => {
    mockFetch(ALL_MOCKS);
    render(<SettingsPage />, dom.container);

    const heading = dom.container.querySelector("h2");
    assert.ok(heading);
    assert.equal(heading!.textContent, "Settings");
  });

  it("renders the model selector above tabs", async () => {
    mockFetch(ALL_MOCKS);
    render(<SettingsPage />, dom.container);
    await waitFor(() => (dom.container.textContent ?? "").includes("Active Model"));

    const html = dom.container.innerHTML;
    const modelPos = html.indexOf("Active Model");
    const tabPos = html.indexOf("nav-tabs");
    assert.ok(modelPos < tabPos, "model selector appears before tabs");
  });

  it("renders two tab buttons", () => {
    mockFetch(ALL_MOCKS);
    render(<SettingsPage />, dom.container);

    const tabs = dom.container.querySelectorAll(".nav-link");
    assert.equal(tabs.length, 2);
    assert.equal(tabs[0].textContent, "API Keys");
    assert.equal(tabs[1].textContent, "Configuration");
  });

  it("shows API Keys tab as active by default", () => {
    mockFetch(ALL_MOCKS);
    render(<SettingsPage />, dom.container);

    const activeTab = dom.container.querySelector(".nav-link.active");
    assert.ok(activeTab);
    assert.equal(activeTab!.textContent, "API Keys");
  });

  it("shows secrets content on API Keys tab", async () => {
    mockFetch(ALL_MOCKS);
    render(<SettingsPage />, dom.container);
    await waitFor(() => (dom.container.textContent ?? "").includes("Anthropic"));

    assert.ok(dom.container.textContent?.includes("LLM Providers"));
    assert.ok(dom.container.textContent?.includes("Search Providers"));
  });

  it("switches to Configuration tab when clicked", async () => {
    mockFetch(ALL_MOCKS);
    render(<SettingsPage />, dom.container);

    const configTab = Array.from(dom.container.querySelectorAll(".nav-link")).find(
      (b) => b.textContent === "Configuration",
    );
    assert.ok(configTab);
    (configTab as HTMLElement).click();

    await waitFor(
      () => dom.container.querySelector(".nav-link.active")?.textContent === "Configuration",
    );
    await waitFor(() => (dom.container.textContent ?? "").includes("Max Cost Per Day"));

    assert.ok(dom.container.textContent?.includes("Cost"));
    assert.ok(!dom.container.textContent?.includes("LLM Providers"));
  });

  it("switches back to API Keys tab", async () => {
    mockFetch(ALL_MOCKS);
    render(<SettingsPage />, dom.container);

    const configTab = Array.from(dom.container.querySelectorAll(".nav-link")).find(
      (b) => b.textContent === "Configuration",
    ) as HTMLElement;
    configTab.click();
    await waitFor(
      () => dom.container.querySelector(".nav-link.active")?.textContent === "Configuration",
    );

    const secretsTab = Array.from(dom.container.querySelectorAll(".nav-link")).find(
      (b) => b.textContent === "API Keys",
    ) as HTMLElement;
    secretsTab.click();
    await waitFor(
      () => dom.container.querySelector(".nav-link.active")?.textContent === "API Keys",
    );
    await waitFor(() => (dom.container.textContent ?? "").includes("Anthropic"));
  });
});
