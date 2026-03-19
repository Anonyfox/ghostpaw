import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { MemoryStrengthDot } from "./memory_strength_dot.tsx";

describe("MemoryStrengthDot", () => {
  it("renders green dot for strong", () => {
    const html = render(<MemoryStrengthDot strength="strong" />);
    ok(html.includes("text-success"));
  });

  it("renders warning dot for fading", () => {
    const html = render(<MemoryStrengthDot strength="fading" />);
    ok(html.includes("text-warning"));
  });

  it("renders muted dot for faint", () => {
    const html = render(<MemoryStrengthDot strength="faint" />);
    ok(html.includes("text-body-tertiary"));
  });
});
