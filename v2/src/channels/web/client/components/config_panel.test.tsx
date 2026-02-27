import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import type { ConfigInfo } from "../../shared/config_types.ts";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
import { ConfigPanel } from "./config_panel.tsx";

const MOCK_CONFIGS: ConfigInfo[] = [
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
    value: "10",
    type: "number",
    category: "cost",
    source: "web",
    isDefault: false,
    label: "Max Cost Per Day",
  },
  {
    key: "my_flag",
    value: "true",
    type: "boolean",
    category: "custom",
    source: "cli",
    isDefault: false,
  },
];

function mockFetchConfigs(data: ConfigInfo[] = MOCK_CONFIGS) {
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({ config: data }),
  })) as unknown as typeof fetch;
}

describe("ConfigPanel", () => {
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
    globalThis.fetch = (async () => new Promise(() => {})) as unknown as typeof fetch;
    render(<ConfigPanel />, dom.container);
    assert.ok(dom.container.textContent?.includes("Loading"));
  });

  it("renders category sections after loading", async () => {
    mockFetchConfigs();
    render(<ConfigPanel />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Max Cost Per Day") ?? false);

    assert.ok(dom.container.textContent?.includes("Cost"));
    assert.ok(dom.container.textContent?.includes("Custom"));
  });

  it("hides default_model from display", async () => {
    mockFetchConfigs();
    render(<ConfigPanel />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Max Cost Per Day") ?? false);

    assert.ok(!dom.container.textContent?.includes("Default Model"), "default_model is hidden");
  });

  it("renders config rows for visible entries", async () => {
    mockFetchConfigs();
    render(<ConfigPanel />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Max Cost Per Day") ?? false);

    assert.ok(dom.container.textContent?.includes("Max Cost Per Day"));
    assert.ok(dom.container.textContent?.includes("my_flag"));
  });

  it("renders Add Custom Config button in custom section", async () => {
    mockFetchConfigs();
    render(<ConfigPanel />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Max Cost Per Day") ?? false);

    const buttons = dom.container.querySelectorAll("button");
    const addBtn = Array.from(buttons).find((b) => b.textContent?.trim() === "Add Custom Config");
    assert.ok(addBtn, "Add Custom Config button shown");
  });

  it("shows error state on API failure", async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: "Server error." }),
    })) as unknown as typeof fetch;

    render(<ConfigPanel />, dom.container);
    await waitFor(() => dom.container.querySelector(".alert-danger") !== null);
  });

  it("hides empty non-custom categories", async () => {
    const costOnly: ConfigInfo[] = [
      {
        key: "max_cost_per_day",
        value: "10",
        type: "number",
        category: "cost",
        source: "default",
        isDefault: true,
        label: "Max Cost Per Day",
      },
    ];
    mockFetchConfigs(costOnly);
    render(<ConfigPanel />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Max Cost Per Day") ?? false);

    assert.ok(!dom.container.textContent?.includes("Behavior"));
    assert.ok(dom.container.textContent?.includes("Custom"));
  });

  it("hides Model section when only default_model exists in it", async () => {
    mockFetchConfigs([MOCK_CONFIGS[0]]);
    render(<ConfigPanel />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Custom") ?? false);

    const sections = dom.container.querySelectorAll("h5");
    const modelSection = Array.from(sections).find((h) => h.textContent === "Model");
    assert.ok(!modelSection, "Model section hidden when only default_model is in it");
  });
});
