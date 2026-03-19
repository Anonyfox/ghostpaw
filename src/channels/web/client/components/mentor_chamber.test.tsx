import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import type { SoulDetailResponse } from "../../shared/soul_types.ts";
import { createTestDOM } from "../create_test_dom.ts";
import { waitFor } from "../wait_for.ts";
import { MentorChamber } from "./mentor_chamber.tsx";

function makeSoul(overrides?: Partial<SoulDetailResponse>): SoulDetailResponse {
  return {
    id: 2,
    name: "JS Engineer",
    essence: "You are a JS engineer.",
    description: "Expert JS dev.",
    level: 1,
    traitLimit: 10,
    isMandatory: true,
    deletedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    traits: Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      principle: `Trait ${i + 1}`,
      provenance: "test",
      generation: 0,
      status: "active" as const,
      mergedInto: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })),
    levels: [],
    mentorAvailable: true,
    ...overrides,
  };
}

const mentorResponse = {
  content: "The soul is performing well.",
  succeeded: true,
  cost: { totalUsd: 0.03 },
};

function mockFetchOk(data: unknown) {
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => data,
  })) as unknown as typeof fetch;
}

function mockFetchError(status: number, error: string) {
  globalThis.fetch = (async () => ({
    ok: false,
    status,
    statusText: "Error",
    json: async () => ({ error }),
  })) as unknown as typeof fetch;
}

describe("MentorChamber", () => {
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

  it("shows three action cards when mentorAvailable is true", () => {
    const soul = makeSoul();
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    assert.ok(dom.container.textContent?.includes("Review"));
    assert.ok(dom.container.textContent?.includes("Refine"));
    assert.ok(dom.container.textContent?.includes("Level Up"));
    assert.ok(dom.container.textContent?.includes("Mentor's Chamber"));
  });

  it("shows not-available message when mentorAvailable is false", () => {
    const soul = makeSoul({ mentorAvailable: false });
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    assert.ok(dom.container.textContent?.includes("LLM provider"));
    assert.ok(dom.container.textContent?.includes("Settings"));
  });

  it("disables all action buttons when mentorAvailable is false", () => {
    const soul = makeSoul({ mentorAvailable: false });
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    const buttons = dom.container.querySelectorAll("button");
    for (const btn of buttons) {
      assert.ok((btn as HTMLButtonElement).disabled);
    }
  });

  it("review: triggers review API and shows result", async () => {
    mockFetchOk(mentorResponse);
    const soul = makeSoul();
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    const reviewBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Review"),
    );
    reviewBtn!.click();
    await waitFor(() => dom.container.textContent?.includes("performing well") === true);
    assert.ok(dom.container.textContent?.includes("$0.03"));
    assert.ok(dom.container.textContent?.includes("Success"));
  });

  it("refine: shows input on click then submits feedback", async () => {
    const soul = makeSoul();
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    const refineBtn = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent === "Refine",
    );
    refineBtn!.click();
    await waitFor(() => dom.container.querySelector("textarea") !== null);
    assert.ok(dom.container.querySelector("textarea"));

    mockFetchOk(mentorResponse);
    const textarea = dom.container.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "improve error handling";
    const submitBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Submit"),
    );
    submitBtn!.click();
    await waitFor(() => dom.container.textContent?.includes("performing well") === true);
  });

  it("level-up: disabled when not at trait capacity", () => {
    const soul = makeSoul();
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    const levelUpBtn = Array.from(dom.container.querySelectorAll("button")).find(
      (b) => b.textContent === "Level Up",
    );
    assert.ok(levelUpBtn);
    assert.ok((levelUpBtn as HTMLButtonElement).disabled);
  });

  it("level-up: shows confirm when ready and clicked", async () => {
    const traits = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      principle: `Trait ${i + 1}`,
      provenance: "test",
      generation: 0,
      status: "active" as const,
      mergedInto: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    const soul = makeSoul({ traits });
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    const levelUpBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Level Up Now"),
    );
    assert.ok(levelUpBtn);
    assert.ok(!(levelUpBtn as HTMLButtonElement).disabled);
    levelUpBtn!.click();
    await waitFor(() => dom.container.textContent?.includes("cannot be undone") === true);
  });

  it("shows error alert on API failure", async () => {
    mockFetchError(500, "Internal server error.");
    const soul = makeSoul();
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    const reviewBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Review"),
    );
    reviewBtn!.click();
    await waitFor(() => dom.container.querySelector(".alert-danger") !== null);
    assert.ok(dom.container.textContent?.includes("Internal server error"));
  });

  it("close resets to idle state", async () => {
    mockFetchOk(mentorResponse);
    const soul = makeSoul();
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    const reviewBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Review"),
    );
    reviewBtn!.click();
    await waitFor(() => dom.container.textContent?.includes("performing well") === true);
    const closeBtn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Close"),
    );
    closeBtn!.click();
    await waitFor(() => !dom.container.textContent?.includes("performing well"));
  });

  it("shows trait status on Level Up card", () => {
    const soul = makeSoul();
    render(<MentorChamber soul={soul} onUpdated={async () => soul} />, dom.container);
    assert.ok(dom.container.textContent?.includes("3/10"));
  });
});
