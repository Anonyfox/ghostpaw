import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { SkillSummaryInfo } from "../../shared/trainer_types.ts";
import { RewardMenu } from "./reward_menu.tsx";

const noop = () => {};

describe("RewardMenu", () => {
  it("renders nothing when no actionable items", () => {
    const html = render(
      <RewardMenu
        skills={[]}
        health={null}
        proposals={[]}
        onApproveProposal={noop}
        onDismissProposal={noop}
        onTrainSkill={noop}
      />,
    );
    ok(!html.includes("Attention"));
  });

  it("shows skills ready for training", () => {
    const skills: SkillSummaryInfo[] = [
      {
        name: "deploy",
        description: "Deploy",
        rank: 3,
        tier: "Journeyman",
        readiness: "orange",
        hasPendingChanges: false,
        fileCount: 2,
        bodyLines: 20,
      },
    ];
    const html = render(
      <RewardMenu
        skills={skills}
        health={null}
        proposals={[]}
        onApproveProposal={noop}
        onDismissProposal={noop}
        onTrainSkill={noop}
      />,
    );
    ok(html.includes("Ready for training"));
    ok(html.includes("deploy"));
  });

  it("shows pending proposals", () => {
    const html = render(
      <RewardMenu
        skills={[]}
        health={null}
        proposals={[
          {
            id: 1,
            title: "New skill idea",
            rationale: "Seen friction",
            fragmentIds: "",
            status: "pending" as const,
            createdAt: 1700000000,
          },
        ]}
        onApproveProposal={noop}
        onDismissProposal={noop}
        onTrainSkill={noop}
      />,
    );
    ok(html.includes("Stoke proposals"));
    ok(html.includes("New skill idea"));
  });
});
