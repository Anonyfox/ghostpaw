import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
import { AddSecretForm } from "./add_secret_form.tsx";

function noop() {}

describe("AddSecretForm", () => {
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

  it("renders an Add Secret button when collapsed", () => {
    render(<AddSecretForm onAdded={noop} />, dom.container);

    const btn = dom.container.querySelector("button");
    assert.ok(btn);
    assert.equal(btn!.textContent?.trim(), "Add Secret");
  });

  it("shows key and value inputs when Add Secret is clicked", async () => {
    render(<AddSecretForm onAdded={noop} />, dom.container);

    dom.container.querySelector("button")!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') !== null);

    const valueInput = dom.container.querySelector('input[type="password"]');
    assert.ok(valueInput, "value input shown");
  });

  it("hides the form when Cancel is clicked", async () => {
    render(<AddSecretForm onAdded={noop} />, dom.container);

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
      <AddSecretForm
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
    const valueInput = dom.container.querySelector('input[type="password"]') as HTMLInputElement;
    keyInput.value = "MY_API_KEY";
    valueInput.value = "secret-value-123";

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

    render(<AddSecretForm onAdded={noop} />, dom.container);
    dom.container.querySelector("button")!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') !== null);

    const keyInput = dom.container.querySelector(
      'input[placeholder="Key name"]',
    ) as HTMLInputElement;
    const valueInput = dom.container.querySelector('input[type="password"]') as HTMLInputElement;
    keyInput.value = "MY_KEY";
    valueInput.value = "my-value";

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
      json: async () => ({ error: "Key already exists." }),
    })) as unknown as typeof fetch;

    render(<AddSecretForm onAdded={noop} />, dom.container);
    dom.container.querySelector("button")!.click();
    await waitFor(() => dom.container.querySelector('input[placeholder="Key name"]') !== null);

    const keyInput = dom.container.querySelector(
      'input[placeholder="Key name"]',
    ) as HTMLInputElement;
    const valueInput = dom.container.querySelector('input[type="password"]') as HTMLInputElement;
    keyInput.value = "BAD_KEY";
    valueInput.value = "value";

    const save = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save",
    );
    save!.click();
    await waitFor(() => dom.container.querySelector(".alert-danger") !== null);
  });
});
