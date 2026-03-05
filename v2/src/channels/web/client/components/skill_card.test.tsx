import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { SkillSummaryInfo } from "../../shared/trainer_types.ts";
import { SkillCard } from "./skill_card.tsx";

const base: SkillSummaryInfo = {
  name: "deploy",
  description: "Deploy the application to production",
  rank: 3,
  hasPendingChanges: false,
  fileCount: 4,
  bodyLines: 30,
};

describe("SkillCard", () => {
  it("renders skill name and description", () => {
    const html = render(<SkillCard skill={base} onClick={() => {}} />);
    ok(html.includes("deploy"));
    ok(html.includes("Deploy the application"));
  });

  it("shows rank badge", () => {
    const html = render(<SkillCard skill={base} onClick={() => {}} />);
    ok(html.includes("Rank 3"));
  });

  it("shows file count", () => {
    const html = render(<SkillCard skill={base} onClick={() => {}} />);
    ok(html.includes("4 files"));
  });

  it("shows singular file for count 1", () => {
    const html = render(<SkillCard skill={{ ...base, fileCount: 1 }} onClick={() => {}} />);
    ok(html.includes("1 file"));
    ok(!html.includes("1 files"));
  });

  it("uses warning border for pending changes", () => {
    const html = render(
      <SkillCard skill={{ ...base, hasPendingChanges: true }} onClick={() => {}} />,
    );
    ok(html.includes("border-warning"));
    ok(html.includes("Modified"));
  });

  it("uses info border for high rank skills", () => {
    const html = render(<SkillCard skill={{ ...base, rank: 7 }} onClick={() => {}} />);
    ok(html.includes("border-info"));
  });

  it("uses secondary border for low rank default", () => {
    const html = render(<SkillCard skill={{ ...base, rank: 1 }} onClick={() => {}} />);
    ok(html.includes("border-secondary"));
  });

  it("is clickable as a button element", () => {
    const html = render(<SkillCard skill={base} onClick={() => {}} />);
    ok(html.includes("<button"));
    ok(html.includes("cursor: pointer"));
  });
});
