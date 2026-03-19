import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { QuestDetail } from "./quest_detail.tsx";

const noop = () => {};

describe("QuestDetail", () => {
  it("exports a function component", () => {
    ok(typeof QuestDetail === "function");
  });

  it("renders loading state before data arrives", () => {
    const html = render(<QuestDetail questId={1} storylines={[]} onUpdated={noop} onDone={noop} />);
    ok(html.includes("Loading"));
  });
});
