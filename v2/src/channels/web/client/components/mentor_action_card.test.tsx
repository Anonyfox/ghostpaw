import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { MentorActionCard } from "./mentor_action_card.tsx";

describe("MentorActionCard", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders title, description, and button label", () => {
    render(
      <MentorActionCard
        title="Review"
        description="Assess the soul"
        buttonLabel="Start"
        disabled={false}
        active={false}
        onClick={() => {}}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("Review"));
    assert.ok(dom.container.textContent?.includes("Assess the soul"));
    const btn = dom.container.querySelector("button");
    assert.ok(btn);
    assert.ok(btn!.textContent?.includes("Start"));
  });

  it("fires onClick when button is clicked", () => {
    const fn = mock.fn();
    render(
      <MentorActionCard
        title="Refine"
        description="Guide growth"
        buttonLabel="Refine"
        disabled={false}
        active={false}
        onClick={fn}
      />,
      dom.container,
    );
    dom.container.querySelector("button")!.click();
    assert.strictEqual(fn.mock.callCount(), 1);
  });

  it("disables button when disabled prop is true", () => {
    const fn = mock.fn();
    render(
      <MentorActionCard
        title="Level Up"
        description="Level up"
        buttonLabel="Level Up"
        disabled={true}
        active={false}
        onClick={fn}
      />,
      dom.container,
    );
    const btn = dom.container.querySelector("button") as HTMLButtonElement;
    assert.ok(btn.disabled);
  });

  it("applies border-info when active", () => {
    render(
      <MentorActionCard
        title="Review"
        description="d"
        buttonLabel="b"
        disabled={false}
        active={true}
        onClick={() => {}}
      />,
      dom.container,
    );
    const card = dom.container.querySelector(".card");
    assert.ok(card?.className.includes("border-info"));
  });

  it("applies border-warning when variant is ready", () => {
    render(
      <MentorActionCard
        title="Level Up"
        description="d"
        buttonLabel="b"
        disabled={false}
        active={false}
        variant="ready"
        onClick={() => {}}
      />,
      dom.container,
    );
    const card = dom.container.querySelector(".card");
    assert.ok(card?.className.includes("border-warning"));
  });

  it("renders statusText when provided", () => {
    render(
      <MentorActionCard
        title="Level Up"
        description="d"
        buttonLabel="b"
        disabled={false}
        active={false}
        statusText="8/10"
        onClick={() => {}}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("8/10"));
  });

  it("reduces opacity when disabled and not active", () => {
    render(
      <MentorActionCard
        title="Review"
        description="d"
        buttonLabel="b"
        disabled={true}
        active={false}
        onClick={() => {}}
      />,
      dom.container,
    );
    const card = dom.container.querySelector(".card") as HTMLElement;
    assert.ok(card.style.opacity === "0.5" || card.getAttribute("style")?.includes("opacity"));
  });
});
