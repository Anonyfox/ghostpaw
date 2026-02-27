import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
import { AddConfigForm } from "./add_config_form.tsx";

function noop() {}

describe("AddConfigForm", () => {
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

  it("renders an Add Custom Config button when collapsed", () => {
    render(<AddConfigForm onAdded={noop} />, dom.container);

    const btn = dom.container.querySelector("button");
    assert.ok(btn);
    assert.equal(btn!.textContent?.trim(), "Add Custom Config");
  });

  it("shows key, type select, and value inputs when opened", async () => {
    render(<AddConfigForm onAdded={noop} />, dom.container);

    dom.container.querySelector("button")!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') !== null);

    const select = dom.container.querySelector("select");
    assert.ok(select, "type select shown");
    const options = dom.container.querySelectorAll("option");
    assert.equal(options.length, 4);

    const valueInput = dom.container.querySelector('input[placeholder="Value"]');
    assert.ok(valueInput, "value input shown");
  });

  it("hides the form when Cancel is clicked", async () => {
    render(<AddConfigForm onAdded={noop} />, dom.container);

    dom.container.querySelector("button")!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') !== null);

    const cancel = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Cancel",
    );
    cancel!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') === null);
  });

  it("calls onAdded after successful save", async () => {
    let added = false;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })) as unknown as typeof fetch;

    render(
      <AddConfigForm
        onAdded={() => {
          added = true;
        }}
      />,
      dom.container,
    );
    dom.container.querySelector("button")!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') !== null);

    const keyInput = dom.container.querySelector(
      'input[placeholder="Key name"]',
    ) as HTMLInputElement;
    const valueInput = dom.container.querySelector(
      'input[placeholder="Value"]',
    ) as HTMLInputElement;
    keyInput.value = "my_custom_key";
    valueInput.value = "hello";

    const save = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save",
    );
    save!.click();
    await waitFor(() => added);
  });

  it("collapses back after successful save", async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })) as unknown as typeof fetch;

    render(<AddConfigForm onAdded={noop} />, dom.container);
    dom.container.querySelector("button")!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') !== null);

    const keyInput = dom.container.querySelector(
      'input[placeholder="Key name"]',
    ) as HTMLInputElement;
    const valueInput = dom.container.querySelector(
      'input[placeholder="Value"]',
    ) as HTMLInputElement;
    keyInput.value = "my_key";
    valueInput.value = "val";

    const save = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save",
    );
    save!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') === null);
  });

  it("shows error when API call fails", async () => {
    globalThis.fetch = (async () => ({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: "Constraint violation." }),
    })) as unknown as typeof fetch;

    render(<AddConfigForm onAdded={noop} />, dom.container);
    dom.container.querySelector("button")!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') !== null);

    const keyInput = dom.container.querySelector(
      'input[placeholder="Key name"]',
    ) as HTMLInputElement;
    const valueInput = dom.container.querySelector(
      'input[placeholder="Value"]',
    ) as HTMLInputElement;
    keyInput.value = "some_key";
    valueInput.value = "bad_value";

    const save = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save",
    );
    save!.click();
    await waitFor(() => dom.container.querySelector(".alert-danger") !== null);
  });
});
