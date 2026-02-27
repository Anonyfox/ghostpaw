import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
import type { SecretInfo } from "./secret_info.ts";
import { SecretsPanel } from "./secrets_panel.tsx";

const MOCK_SECRETS: SecretInfo[] = [
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
    key: "MY_CUSTOM_SECRET",
    label: "MY_CUSTOM_SECRET",
    category: "custom",
    configured: true,
    isActiveSearch: false,
  },
];

function mockFetchSecrets(data: SecretInfo[] = MOCK_SECRETS) {
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({ secrets: data }),
  })) as unknown as typeof fetch;
}

describe("SecretsPanel", () => {
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
    render(<SecretsPanel />, dom.container);
    assert.ok(dom.container.textContent?.includes("Loading"));
  });

  it("renders LLM and Search sections", async () => {
    mockFetchSecrets();
    render(<SecretsPanel />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Anthropic") ?? false);

    assert.ok(dom.container.textContent?.includes("LLM Providers"));
    assert.ok(dom.container.textContent?.includes("Search Providers"));
  });

  it("renders secret rows", async () => {
    mockFetchSecrets();
    render(<SecretsPanel />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Anthropic") ?? false);

    assert.ok(dom.container.textContent?.includes("Anthropic"));
    assert.ok(dom.container.textContent?.includes("OpenAI"));
    assert.ok(dom.container.textContent?.includes("Brave Search"));
  });

  it("renders custom secrets section with Add Secret button", async () => {
    mockFetchSecrets();
    render(<SecretsPanel />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Anthropic") ?? false);

    assert.ok(dom.container.textContent?.includes("Custom Secrets"));
    const buttons = dom.container.querySelectorAll("button");
    const addBtn = Array.from(buttons).find((b) => b.textContent?.trim() === "Add Secret");
    assert.ok(addBtn, "Add Secret button shown");
  });

  it("shows error on API failure", async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: "Server error." }),
    })) as unknown as typeof fetch;

    render(<SecretsPanel />, dom.container);
    await waitFor(() => dom.container.querySelector(".alert-danger") !== null);
  });
});
