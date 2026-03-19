import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import type { ConfigInfo } from "../../shared/config_types.ts";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
import { ConfigRow } from "./config_row.tsx";

const DEFAULT_CONFIG: ConfigInfo = {
  key: "default_model",
  value: "claude-sonnet-4-6",
  type: "string",
  category: "model",
  source: "default",
  isDefault: true,
  label: "Default Model",
};

const OVERRIDDEN_CONFIG: ConfigInfo = {
  key: "max_cost_per_day",
  value: "10",
  type: "number",
  category: "cost",
  source: "web",
  isDefault: false,
  label: "Max Cost Per Day",
};

const CUSTOM_CONFIG: ConfigInfo = {
  key: "my_flag",
  value: "true",
  type: "boolean",
  category: "custom",
  source: "cli",
  isDefault: false,
};

function noop() {}

describe("ConfigRow", () => {
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

  it("renders label and default badge for default config", () => {
    render(<ConfigRow config={DEFAULT_CONFIG} onChanged={noop} />, dom.container);

    assert.ok(dom.container.textContent?.includes("Default Model"));
    const badges = dom.container.querySelectorAll(".badge");
    const defaultBadge = Array.from(badges).find((b) => b.textContent?.includes("default"));
    assert.ok(defaultBadge, "default badge shown");
  });

  it("renders overridden badge for non-default config", () => {
    render(<ConfigRow config={OVERRIDDEN_CONFIG} onChanged={noop} />, dom.container);

    const badges = dom.container.querySelectorAll(".badge");
    const overridden = Array.from(badges).find((b) => b.textContent?.includes("overridden"));
    assert.ok(overridden, "overridden badge shown");
  });

  it("renders type badge", () => {
    render(<ConfigRow config={DEFAULT_CONFIG} onChanged={noop} />, dom.container);

    const badges = dom.container.querySelectorAll(".badge");
    const typeBadge = Array.from(badges).find((b) => b.textContent?.includes("string"));
    assert.ok(typeBadge, "type badge shown");
  });

  it("shows key name when label is absent", () => {
    render(<ConfigRow config={CUSTOM_CONFIG} onChanged={noop} />, dom.container);
    assert.ok(dom.container.textContent?.includes("my_flag"));
  });

  it("shows current value for non-editing state", () => {
    render(<ConfigRow config={DEFAULT_CONFIG} onChanged={noop} />, dom.container);
    assert.ok(dom.container.textContent?.includes("claude-sonnet-4-6"));
  });

  it("shows Edit button for all configs", () => {
    render(<ConfigRow config={DEFAULT_CONFIG} onChanged={noop} />, dom.container);
    const buttons = dom.container.querySelectorAll("button");
    const edit = Array.from(buttons).find((b) => b.textContent?.trim() === "Edit");
    assert.ok(edit, "Edit button shown");
  });

  it("shows Undo and Reset buttons only for overridden configs", () => {
    render(<ConfigRow config={OVERRIDDEN_CONFIG} onChanged={noop} />, dom.container);
    const buttons = dom.container.querySelectorAll("button");
    const undo = Array.from(buttons).find((b) => b.textContent?.trim() === "Undo");
    const reset = Array.from(buttons).find((b) => b.textContent?.trim() === "Reset");
    assert.ok(undo, "Undo button shown");
    assert.ok(reset, "Reset button shown");
  });

  it("hides Undo and Reset for default configs", () => {
    render(<ConfigRow config={DEFAULT_CONFIG} onChanged={noop} />, dom.container);
    const buttons = dom.container.querySelectorAll("button");
    const undo = Array.from(buttons).find((b) => b.textContent?.trim() === "Undo");
    const reset = Array.from(buttons).find((b) => b.textContent?.trim() === "Reset");
    assert.ok(!undo, "Undo button hidden");
    assert.ok(!reset, "Reset button hidden");
  });

  it("opens inline edit form when Edit is clicked", async () => {
    render(<ConfigRow config={DEFAULT_CONFIG} onChanged={noop} />, dom.container);

    const edit = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Edit",
    );
    edit!.click();
    await waitFor(() => dom.container.querySelector('input[type="text"]') !== null);

    const cancel = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Cancel",
    );
    assert.ok(cancel, "Cancel button appears");
  });

  it("closes edit form when Cancel is clicked", async () => {
    render(<ConfigRow config={DEFAULT_CONFIG} onChanged={noop} />, dom.container);

    const edit = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Edit",
    );
    edit!.click();
    await waitFor(() => dom.container.querySelector('input[type="text"]') !== null);

    const cancel = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Cancel",
    );
    cancel!.click();
    await waitFor(() => dom.container.querySelector('input[type="text"]') === null);
  });

  it("calls onChanged after successful save", async () => {
    let changed = false;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })) as unknown as typeof fetch;

    render(
      <ConfigRow
        config={DEFAULT_CONFIG}
        onChanged={() => {
          changed = true;
        }}
      />,
      dom.container,
    );

    const edit = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Edit",
    );
    edit!.click();
    await waitFor(() => dom.container.querySelector('input[type="text"]') !== null);

    const input = dom.container.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = "gpt-4o";
    const save = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save",
    );
    save!.click();
    await waitFor(() => changed);
  });

  it("calls onChanged after successful undo", async () => {
    let changed = false;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })) as unknown as typeof fetch;

    render(
      <ConfigRow
        config={OVERRIDDEN_CONFIG}
        onChanged={() => {
          changed = true;
        }}
      />,
      dom.container,
    );

    const undo = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Undo",
    );
    undo!.click();
    await waitFor(() => changed);
  });

  it("calls onChanged after successful reset", async () => {
    let changed = false;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })) as unknown as typeof fetch;

    render(
      <ConfigRow
        config={OVERRIDDEN_CONFIG}
        onChanged={() => {
          changed = true;
        }}
      />,
      dom.container,
    );

    const reset = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Reset",
    );
    reset!.click();
    await waitFor(() => changed);
  });
});
