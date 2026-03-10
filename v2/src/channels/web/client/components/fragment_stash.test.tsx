import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { FragmentSourceSummary, SkillFragmentInfo } from "../../shared/trainer_types.ts";
import { FragmentStash } from "./fragment_stash.tsx";

const frag = (id: number, source: string, status: "pending" | "absorbed"): SkillFragmentInfo => ({
  id,
  source,
  sourceId: null,
  observation: `Observation ${id}`,
  domain: null,
  status,
  consumedBy: status === "absorbed" ? "some-skill" : null,
  createdAt: Math.floor(Date.now() / 1000) - id * 3600,
});

describe("FragmentStash", () => {
  it("renders nothing when no fragments", () => {
    const html = render(<FragmentStash fragments={[]} sources={[]} />);
    ok(!html.includes("Fragment Stash"));
  });

  it("renders header with counts", () => {
    const sources: FragmentSourceSummary[] = [{ source: "quest", pending: 3, absorbed: 1 }];
    const fragments = [frag(1, "quest", "pending"), frag(2, "quest", "pending")];
    const html = render(<FragmentStash fragments={fragments} sources={sources} />);
    ok(html.includes("Fragment Stash"));
    ok(html.includes("3 pending"));
    ok(html.includes("4 total"));
  });

  it("renders discovery teasers with links for cross-system sources", () => {
    const sources: FragmentSourceSummary[] = [
      { source: "quest", pending: 3, absorbed: 0 },
      { source: "session", pending: 2, absorbed: 0 },
    ];
    const html = render(
      <FragmentStash fragments={[frag(1, "quest", "pending")]} sources={sources} />,
    );
    ok(html.includes("undiscovered from"));
    ok(html.includes("Quests"));
    ok(html.includes("/quests"));
    ok(html.includes("Sessions"));
    ok(html.includes("/sessions"));
  });

  it("does not show discovery teaser for stoke (same page)", () => {
    const sources: FragmentSourceSummary[] = [{ source: "stoke", pending: 2, absorbed: 0 }];
    const html = render(
      <FragmentStash fragments={[frag(1, "stoke", "pending")]} sources={sources} />,
    );
    ok(!html.includes("undiscovered from"));
  });

  it("renders fragment tiles", () => {
    const sources: FragmentSourceSummary[] = [{ source: "quest", pending: 1, absorbed: 0 }];
    const fragments = [frag(1, "quest", "pending")];
    const html = render(<FragmentStash fragments={fragments} sources={sources} />);
    ok(html.includes("Observation 1"));
  });
});
