import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
import type { SecretInfo } from "./secret_info.ts";
import { SecretRow } from "./secret_row.tsx";

const CONFIGURED: SecretInfo = {
  key: "API_KEY_ANTHROPIC",
  label: "Anthropic",
  category: "llm",
  configured: true,
  isActiveSearch: false,
};

const UNCONFIGURED: SecretInfo = {
  key: "API_KEY_OPENAI",
  label: "OpenAI",
  category: "llm",
  configured: false,
  isActiveSearch: false,
};

const ACTIVE_SEARCH: SecretInfo = {
  key: "BRAVE_API_KEY",
  label: "Brave Search",
  category: "search",
  configured: true,
  isActiveSearch: true,
};

function noop() {}

describe("SecretRow", () => {
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

  it("renders the secret label and not-set badge for unconfigured key", () => {
    render(<SecretRow secret={UNCONFIGURED} onChanged={noop} />, dom.container);

    assert.ok(dom.container.textContent?.includes("OpenAI"));
    const badges = dom.container.querySelectorAll(".badge");
    const notSet = Array.from(badges).find((b) => b.textContent?.includes("not set"));
    assert.ok(notSet, "not set badge shown");
  });

  it("renders configured badge for configured key", () => {
    render(<SecretRow secret={CONFIGURED} onChanged={noop} />, dom.container);

    const badges = dom.container.querySelectorAll(".badge");
    const configured = Array.from(badges).find((b) => b.textContent?.includes("configured"));
    assert.ok(configured, "configured badge shown");
  });

  it("renders active search badge when applicable", () => {
    render(<SecretRow secret={ACTIVE_SEARCH} onChanged={noop} />, dom.container);

    const badges = dom.container.querySelectorAll(".badge");
    const active = Array.from(badges).find((b) => b.textContent?.includes("active"));
    assert.ok(active, "active badge shown");
  });

  it("shows Set button for unconfigured key", () => {
    render(<SecretRow secret={UNCONFIGURED} onChanged={noop} />, dom.container);

    const buttons = dom.container.querySelectorAll("button");
    const setBtn = Array.from(buttons).find((b) => b.textContent?.trim() === "Set");
    assert.ok(setBtn, "Set button shown");
  });

  it("shows Update and Remove buttons for configured key", () => {
    render(<SecretRow secret={CONFIGURED} onChanged={noop} />, dom.container);

    const buttons = dom.container.querySelectorAll("button");
    const update = Array.from(buttons).find((b) => b.textContent?.trim() === "Update");
    const remove = Array.from(buttons).find((b) => b.textContent?.trim() === "Remove");
    assert.ok(update, "Update button shown");
    assert.ok(remove, "Remove button shown");
  });

  it("opens inline edit form when Set is clicked", async () => {
    render(<SecretRow secret={UNCONFIGURED} onChanged={noop} />, dom.container);

    const setBtn = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Set",
    );
    setBtn!.click();
    await waitFor(() => dom.container.querySelector('input[type="password"]') !== null);

    const cancel = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Cancel",
    );
    assert.ok(cancel, "Cancel button appears");
  });

  it("closes edit form when Cancel is clicked", async () => {
    render(<SecretRow secret={UNCONFIGURED} onChanged={noop} />, dom.container);

    const setBtn = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Set",
    );
    setBtn!.click();
    await waitFor(() => dom.container.querySelector('input[type="password"]') !== null);

    const cancel = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Cancel",
    );
    cancel!.click();
    await waitFor(() => dom.container.querySelector('input[type="password"]') === null);
  });

  it("calls onChanged after successful save", async () => {
    let changed = false;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })) as unknown as typeof fetch;

    render(
      <SecretRow
        secret={UNCONFIGURED}
        onChanged={() => {
          changed = true;
        }}
      />,
      dom.container,
    );
    const setBtn = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Set",
    );
    setBtn!.click();
    await waitFor(() => dom.container.querySelector('input[type="password"]') !== null);

    const input = dom.container.querySelector('input[type="password"]') as HTMLInputElement;
    input.value = "sk-test-value";
    const save = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save",
    );
    save!.click();
    await waitFor(() => changed);
  });

  it("calls onChanged after successful remove", async () => {
    let changed = false;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })) as unknown as typeof fetch;

    render(
      <SecretRow
        secret={CONFIGURED}
        onChanged={() => {
          changed = true;
        }}
      />,
      dom.container,
    );
    const remove = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Remove",
    );
    remove!.click();
    await waitFor(() => changed);
  });
});
