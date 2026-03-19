import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { MemoryConfidenceBar } from "./memory_confidence_bar.tsx";

describe("MemoryConfidenceBar", () => {
  it("renders a progress bar with correct width", () => {
    const html = render(<MemoryConfidenceBar confidence={0.75} strength="strong" />);
    ok(html.includes("width: 75%"));
    ok(html.includes("bg-success"));
  });

  it("uses warning color for fading strength", () => {
    const html = render(<MemoryConfidenceBar confidence={0.5} strength="fading" />);
    ok(html.includes("bg-warning"));
    ok(html.includes("width: 50%"));
  });

  it("uses secondary color for faint strength", () => {
    const html = render(<MemoryConfidenceBar confidence={0.2} strength="faint" />);
    ok(html.includes("bg-secondary"));
  });
});
