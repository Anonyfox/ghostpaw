import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
import { ModelSelector } from "./model_selector.tsx";

const MOCK_RESPONSE = {
  currentModel: "claude-sonnet-4-6",
  currentProvider: "anthropic",
  providers: [
    {
      id: "anthropic",
      name: "Anthropic",
      hasKey: true,
      isCurrent: true,
      models: ["claude-sonnet-4-6", "claude-opus-4"],
      modelsSource: "live",
    },
    {
      id: "openai",
      name: "OpenAI",
      hasKey: true,
      isCurrent: false,
      models: ["gpt-4o", "gpt-4o-mini"],
      modelsSource: "live",
    },
    {
      id: "xai",
      name: "xAI",
      hasKey: false,
      isCurrent: false,
      models: ["grok-3"],
      modelsSource: "static",
    },
  ],
};

const NO_KEYS_RESPONSE = {
  currentModel: "claude-sonnet-4-6",
  currentProvider: "anthropic",
  providers: [
    {
      id: "anthropic",
      name: "Anthropic",
      hasKey: false,
      isCurrent: false,
      models: [],
      modelsSource: "static",
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

const STALE_MODEL_RESPONSE = {
  currentModel: "unknown-model",
  currentProvider: null,
  providers: MOCK_RESPONSE.providers.map((p) => ({ ...p, isCurrent: false })),
};

function mockFetchModels(data: unknown = MOCK_RESPONSE) {
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => data,
  })) as unknown as typeof fetch;
}

describe("ModelSelector", () => {
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
    render(<ModelSelector />, dom.container);
    assert.ok(dom.container.textContent?.includes("Loading providers"));
  });

  it("renders Active Model header", async () => {
    mockFetchModels();
    render(<ModelSelector />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Anthropic") ?? false);
    assert.ok(dom.container.textContent?.includes("Active Model"));
  });

  it("shows current model name", async () => {
    mockFetchModels();
    render(<ModelSelector />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("claude-sonnet-4-6") ?? false);
  });

  it("renders all three provider cards", async () => {
    mockFetchModels();
    render(<ModelSelector />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Anthropic") ?? false);

    assert.ok(dom.container.textContent?.includes("Anthropic"));
    assert.ok(dom.container.textContent?.includes("OpenAI"));
    assert.ok(dom.container.textContent?.includes("xAI"));
  });

  it("shows no-keys banner when no providers have keys", async () => {
    mockFetchModels(NO_KEYS_RESPONSE);
    render(<ModelSelector />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("No API keys") ?? false);
    assert.ok(dom.container.textContent?.includes("API Keys tab"));
  });

  it("shows stale model warning when currentProvider is null", async () => {
    mockFetchModels(STALE_MODEL_RESPONSE);
    render(<ModelSelector />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("does not match") ?? false);
  });

  it("shows error state on API failure", async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ error: "Server error." }),
    })) as unknown as typeof fetch;

    render(<ModelSelector />, dom.container);
    await waitFor(() => dom.container.querySelector(".alert-danger") !== null);
  });

  it("calls POST /api/models when Activate is clicked", async () => {
    let postCalled = false;
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") {
        postCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, model: "gpt-4o", provider: "openai" }),
        };
      }
      return { ok: true, status: 200, json: async () => MOCK_RESPONSE };
    }) as unknown as typeof fetch;

    render(<ModelSelector />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Anthropic") ?? false);

    const activateBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Activate"),
    );
    assert.ok(activateBtn, "Activate button found");
    activateBtn!.click();
    await waitFor(() => postCalled);
  });

  it("shows success feedback as inline badge after switching", async () => {
    globalThis.fetch = (async (_url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, model: "gpt-4o", provider: "openai" }),
        };
      }
      return { ok: true, status: 200, json: async () => MOCK_RESPONSE };
    }) as unknown as typeof fetch;

    render(<ModelSelector />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Anthropic") ?? false);

    const activateBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Activate"),
    );
    activateBtn!.click();
    await waitFor(() => dom.container.textContent?.includes("Switched to") ?? false);

    const badge = dom.container.querySelector(".badge.bg-success");
    assert.ok(badge, "feedback rendered as inline badge, not block alert");
  });

  it("fetches from server on each mount (server-side caching)", async () => {
    let fetchCount = 0;
    globalThis.fetch = (async () => {
      fetchCount++;
      return { ok: true, status: 200, json: async () => MOCK_RESPONSE };
    }) as unknown as typeof fetch;

    render(<ModelSelector />, dom.container);
    await waitFor(() => dom.container.textContent?.includes("Anthropic") ?? false);
    assert.equal(fetchCount, 1);
  });
});
