import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { SkillRankBadge } from "./skill_rank_badge.tsx";

describe("SkillRankBadge", () => {
  it("renders compact rank 0 as Novice style", () => {
    const html = render(<SkillRankBadge rank={0} />);
    ok(html.includes("Rank 0"));
    ok(html.includes("text-muted"));
  });

  it("renders compact rank 2 as Apprentice style", () => {
    const html = render(<SkillRankBadge rank={2} />);
    ok(html.includes("Rank 2"));
    ok(html.includes("text-secondary"));
  });

  it("renders compact rank 4 as Journeyman style", () => {
    const html = render(<SkillRankBadge rank={4} />);
    ok(html.includes("Rank 4"));
    ok(html.includes("text-info"));
  });

  it("renders compact rank 7 as Expert style", () => {
    const html = render(<SkillRankBadge rank={7} />);
    ok(html.includes("Rank 7"));
    ok(html.includes("text-warning"));
  });

  it("renders compact rank 12 as Master style", () => {
    const html = render(<SkillRankBadge rank={12} />);
    ok(html.includes("Rank 12"));
    ok(html.includes("text-danger"));
  });

  it("full variant includes tier label", () => {
    const html = render(<SkillRankBadge rank={5} variant="full" />);
    ok(html.includes("Rank 5"));
    ok(html.includes("Journeyman"));
  });

  it("compact variant omits tier label", () => {
    const html = render(<SkillRankBadge rank={5} variant="compact" />);
    ok(html.includes("Rank 5"));
    ok(!html.includes("Journeyman"));
  });
});
