import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { TrainerInput } from "./trainer_input.tsx";

describe("TrainerInput", () => {
  it("create mode renders textarea with topic placeholder", () => {
    const html = render(<TrainerInput mode="create" onSubmit={() => {}} onCancel={() => {}} />);
    ok(html.includes("Focus topic"));
    ok(html.includes("Begin Exploration"));
  });

  it("train mode with skills renders a select", () => {
    const skills: import("../../shared/trainer_types.ts").SkillSummaryInfo[] = [
      {
        name: "deploy",
        description: "Deploy",
        rank: 3,
        tier: "Journeyman",
        readiness: "grey",
        hasPendingChanges: false,
        fileCount: 2,
        bodyLines: 20,
      },
      {
        name: "testing",
        description: "Test",
        rank: 1,
        tier: "Apprentice",
        readiness: "grey",
        hasPendingChanges: false,
        fileCount: 1,
        bodyLines: 10,
      },
    ];
    const html = render(
      <TrainerInput mode="train" skills={skills} onSubmit={() => {}} onCancel={() => {}} />,
    );
    ok(html.includes("Select a skill"));
    ok(html.includes("deploy"));
    ok(html.includes("Analyze Skill"));
  });

  it("train mode without skills renders textarea", () => {
    const html = render(<TrainerInput mode="train" onSubmit={() => {}} onCancel={() => {}} />);
    ok(html.includes("textarea"));
  });

  it("renders cancel button", () => {
    const html = render(<TrainerInput mode="create" onSubmit={() => {}} onCancel={() => {}} />);
    ok(html.includes("Cancel"));
  });

  it("disables inputs when disabled prop is true", () => {
    const html = render(
      <TrainerInput mode="create" onSubmit={() => {}} onCancel={() => {}} disabled={true} />,
    );
    ok(html.includes("disabled"));
  });
});
