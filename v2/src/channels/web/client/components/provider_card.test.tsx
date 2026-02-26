import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import type { ProviderInfo } from "../../shared/models_types.ts";
import { createTestDOM } from "../test_dom.ts";
import { ProviderCard } from "./provider_card.tsx";

const ACTIVE_PROVIDER: ProviderInfo = {
  id: "anthropic",
  name: "Anthropic",
  hasKey: true,
  isCurrent: true,
  models: ["claude-sonnet-4-6", "claude-opus-4"],
  modelsSource: "live",
};

const READY_PROVIDER: ProviderInfo = {
  id: "openai",
  name: "OpenAI",
  hasKey: true,
  isCurrent: false,
  models: ["gpt-4o", "gpt-4o-mini"],
  modelsSource: "live",
};

const NO_KEY_PROVIDER: ProviderInfo = {
  id: "xai",
  name: "xAI",
  hasKey: false,
  isCurrent: false,
  models: ["grok-3"],
  modelsSource: "static",
};

const DEGRADED_PROVIDER: ProviderInfo = {
  id: "openai",
  name: "OpenAI",
  hasKey: true,
  isCurrent: false,
  models: ["gpt-4o", "gpt-4o-mini"],
  modelsSource: "static",
  error: "Timed out after 5000ms",
};

function noop() {}

describe("ProviderCard", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders provider name", () => {
    render(
      <ProviderCard
        provider={ACTIVE_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("Anthropic"));
  });

  it("shows Active badge for current provider", () => {
    render(
      <ProviderCard
        provider={ACTIVE_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    const badges = dom.container.querySelectorAll(".badge");
    const active = Array.from(badges).find((b) => b.textContent?.includes("Active"));
    assert.ok(active, "Active badge shown");
  });

  it("shows Ready badge for keyed non-current provider", () => {
    render(
      <ProviderCard
        provider={READY_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    const badges = dom.container.querySelectorAll(".badge");
    const ready = Array.from(badges).find((b) => b.textContent?.includes("Ready"));
    assert.ok(ready, "Ready badge shown");
  });

  it("shows No Key badge for keyless provider", () => {
    render(
      <ProviderCard
        provider={NO_KEY_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    const badges = dom.container.querySelectorAll(".badge");
    const noKey = Array.from(badges).find((b) => b.textContent?.includes("No Key"));
    assert.ok(noKey, "No Key badge shown");
  });

  it("shows Degraded badge when error is present", () => {
    render(
      <ProviderCard
        provider={DEGRADED_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    const badges = dom.container.querySelectorAll(".badge");
    const degraded = Array.from(badges).find((b) => b.textContent?.includes("Degraded"));
    assert.ok(degraded, "Degraded badge shown");
  });

  it("renders model dropdown for keyed provider", () => {
    render(
      <ProviderCard
        provider={READY_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    const select = dom.container.querySelector("select");
    assert.ok(select, "select dropdown rendered");
    const options = dom.container.querySelectorAll("option");
    assert.equal(options.length, 2);
  });

  it("shows Current button (disabled) for active provider", () => {
    render(
      <ProviderCard
        provider={ACTIVE_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    const btns = dom.container.querySelectorAll("button");
    const current = Array.from(btns).find((b) => b.textContent?.includes("Current"));
    assert.ok(current, "Current button shown");
    assert.ok(current!.disabled, "Current button is disabled");
  });

  it("shows Activate button for ready provider", () => {
    render(
      <ProviderCard
        provider={READY_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    const btns = dom.container.querySelectorAll("button");
    const activate = Array.from(btns).find((b) => b.textContent?.includes("Activate"));
    assert.ok(activate, "Activate button shown");
    assert.ok(!activate!.disabled, "Activate button is enabled");
  });

  it("shows No Key label for keyless provider", () => {
    render(
      <ProviderCard
        provider={NO_KEY_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    const noKeySpan = dom.container.querySelector(".btn.disabled");
    assert.ok(noKeySpan, "No Key element shown");
    assert.ok(noKeySpan!.textContent?.includes("No Key"));
  });

  it("shows live from API source indicator", () => {
    render(
      <ProviderCard
        provider={READY_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("live from API"));
  });

  it("shows known models source indicator for static", () => {
    render(
      <ProviderCard
        provider={DEGRADED_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("known models"));
  });

  it("calls onActivate with selected model when Activate is clicked", () => {
    let activated = "";
    render(
      <ProviderCard
        provider={READY_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={(m) => {
          activated = m;
        }}
        activating={false}
      />,
      dom.container,
    );
    const activate = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Activate"),
    );
    activate!.click();
    assert.ok(activated, "onActivate called");
  });

  it("shows Switching... when activating", () => {
    render(
      <ProviderCard
        provider={READY_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={true}
      />,
      dom.container,
    );
    const btns = dom.container.querySelectorAll("button");
    const switching = Array.from(btns).find((b) => b.textContent?.includes("Switching"));
    assert.ok(switching, "Switching... text shown");
  });

  it("does not show source badge for keyless provider", () => {
    render(
      <ProviderCard
        provider={NO_KEY_PROVIDER}
        currentModel="claude-sonnet-4-6"
        onActivate={noop}
        activating={false}
      />,
      dom.container,
    );
    assert.ok(!dom.container.textContent?.includes("live from API"));
    assert.ok(!dom.container.textContent?.includes("known models"));
  });
});
