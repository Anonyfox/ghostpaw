import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { TrainerInput } from "./trainer_input.tsx";

describe("TrainerInput", () => {
  it("scout mode renders textarea with direction placeholder", () => {
    const html = render(<TrainerInput mode="scout" onSubmit={() => {}} onCancel={() => {}} />);
    ok(html.includes("Scouting direction"));
    ok(html.includes("Begin Scouting"));
  });

  it("train mode with skills renders a select", () => {
    const skills = [
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
    ok(html.includes("Rank 3"));
    ok(html.includes("Analyze Skill"));
  });

  it("train mode without skills renders textarea", () => {
    const html = render(<TrainerInput mode="train" onSubmit={() => {}} onCancel={() => {}} />);
    ok(html.includes("textarea"));
  });

  it("renders cancel button", () => {
    const html = render(<TrainerInput mode="scout" onSubmit={() => {}} onCancel={() => {}} />);
    ok(html.includes("Cancel"));
  });

  it("disables inputs when disabled prop is true", () => {
    const html = render(
      <TrainerInput mode="scout" onSubmit={() => {}} onCancel={() => {}} disabled={true} />,
    );
    ok(html.includes("disabled"));
  });
});
