import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { SkillSummaryInfo } from "../../shared/trainer_types.ts";
import { SkillInventory } from "./skill_inventory.tsx";

describe("SkillInventory", () => {
  it("shows empty state when no skills", () => {
    const html = render(<SkillInventory skills={[]} onSelectSkill={() => {}} />);
    ok(html.includes("No skills discovered yet"));
  });

  it("renders skill cards for each skill", () => {
    const skills: SkillSummaryInfo[] = [
      {
        name: "deploy",
        description: "Deploy",
        rank: 3,
        hasPendingChanges: false,
        fileCount: 2,
        bodyLines: 20,
      },
      {
        name: "testing",
        description: "Test",
        rank: 1,
        hasPendingChanges: true,
        fileCount: 1,
        bodyLines: 10,
      },
    ];
    const html = render(<SkillInventory skills={skills} onSelectSkill={() => {}} />);
    ok(html.includes("deploy"));
    ok(html.includes("testing"));
    ok(html.includes("Skill Inventory"));
  });

  it("renders in a responsive grid", () => {
    const skills: SkillSummaryInfo[] = [
      {
        name: "deploy",
        description: "Deploy",
        rank: 3,
        hasPendingChanges: false,
        fileCount: 2,
        bodyLines: 20,
      },
    ];
    const html = render(<SkillInventory skills={skills} onSelectSkill={() => {}} />);
    ok(html.includes("col-md-6"));
    ok(html.includes("col-lg-4"));
  });
});
