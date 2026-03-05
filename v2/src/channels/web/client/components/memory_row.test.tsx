import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { MemoryInfo } from "../../shared/memory_types.ts";
import { MemoryRow } from "./memory_row.tsx";

const noop = () => {};

function makeMemory(overrides?: Partial<MemoryInfo>): MemoryInfo {
  return {
    id: 1,
    claim: "User prefers dark mode",
    confidence: 0.85,
    evidenceCount: 3,
    createdAt: Date.now() - 86_400_000,
    verifiedAt: Date.now() - 3_600_000,
    source: "explicit",
    category: "preference",
    supersededBy: null,
    strength: "strong",
    freshness: 0.9,
    ...overrides,
  };
}

describe("MemoryRow", () => {
  it("renders claim text", () => {
    const html = render(
      <MemoryRow
        memory={makeMemory()}
        isExpanded={false}
        onToggle={noop}
        onConfirm={noop}
        onForget={noop}
        selectMode={false}
        selected={false}
        onSelect={noop}
      />,
    );
    ok(html.includes("User prefers dark mode"));
  });

  it("renders strength dot", () => {
    const html = render(
      <MemoryRow
        memory={makeMemory()}
        isExpanded={false}
        onToggle={noop}
        onConfirm={noop}
        onForget={noop}
        selectMode={false}
        selected={false}
        onSelect={noop}
      />,
    );
    ok(html.includes("text-success"));
  });

  it("renders category badge", () => {
    const html = render(
      <MemoryRow
        memory={makeMemory({ category: "fact" })}
        isExpanded={false}
        onToggle={noop}
        onConfirm={noop}
        onForget={noop}
        selectMode={false}
        selected={false}
        onSelect={noop}
      />,
    );
    ok(html.includes("bg-info"));
    ok(html.includes("fact"));
  });

  it("shows evidence count", () => {
    const html = render(
      <MemoryRow
        memory={makeMemory({ evidenceCount: 5 })}
        isExpanded={false}
        onToggle={noop}
        onConfirm={noop}
        onForget={noop}
        selectMode={false}
        selected={false}
        onSelect={noop}
      />,
    );
    ok(html.includes("5x confirmed"));
  });

  it("renders checkbox in select mode", () => {
    const html = render(
      <MemoryRow
        memory={makeMemory()}
        isExpanded={false}
        onToggle={noop}
        onConfirm={noop}
        onForget={noop}
        selectMode={true}
        selected={false}
        onSelect={noop}
      />,
    );
    ok(html.includes("form-check-input"));
  });

  it("truncates long claims", () => {
    const longClaim = "A".repeat(200);
    const html = render(
      <MemoryRow
        memory={makeMemory({ claim: longClaim })}
        isExpanded={false}
        onToggle={noop}
        onConfirm={noop}
        onForget={noop}
        selectMode={false}
        selected={false}
        onSelect={noop}
      />,
    );
    ok(html.includes("..."));
  });
});
