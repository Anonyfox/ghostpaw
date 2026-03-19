import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "./create_test_dom.ts";

describe("createTestDOM", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("provides a working DOM environment for Preact", () => {
    assert.ok(dom.document, "document exists");
    assert.ok(dom.container, "container exists");
    assert.equal(dom.container.id, "test-root");
    assert.ok(globalThis.document, "document is globally accessible");
  });

  it("renders a TSX component into the container", () => {
    function Greeting({ name }: { name: string }) {
      return <p class="greeting">Hello, {name}</p>;
    }

    render(<Greeting name="Ghostpaw" />, dom.container);

    const el = dom.container.querySelector(".greeting");
    assert.ok(el, "rendered element exists");
    assert.equal(el!.textContent, "Hello, Ghostpaw");
  });

  it("renders nested components with props", () => {
    function Badge({ label }: { label: string }) {
      return <span class="badge">{label}</span>;
    }

    function Card({ title, children }: { title: string; children?: preact.ComponentChildren }) {
      return (
        <div class="card">
          <h2>{title}</h2>
          {children}
        </div>
      );
    }

    render(
      <Card title="Status">
        <Badge label="Online" />
      </Card>,
      dom.container,
    );

    assert.equal(dom.container.querySelector("h2")?.textContent, "Status");
    assert.equal(dom.container.querySelector(".badge")?.textContent, "Online");
  });

  it("isolates DOM state between tests", () => {
    render(<div class="unique-marker" />, dom.container);
    assert.ok(dom.container.querySelector(".unique-marker"));
  });

  it("cleans up after previous test", () => {
    assert.equal(
      dom.container.querySelector(".unique-marker"),
      null,
      "previous test's DOM content should not leak",
    );
  });
});
