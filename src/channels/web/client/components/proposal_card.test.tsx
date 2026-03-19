import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { SkillProposalInfo } from "../../shared/trainer_types.ts";
import { ProposalCard } from "./proposal_card.tsx";

const proposal: SkillProposalInfo = {
  id: 1,
  title: "Error recovery patterns",
  rationale: "3 sessions showed retry logic gaps",
  fragmentIds: "",
  status: "pending",
  createdAt: 1700000000,
};

describe("ProposalCard", () => {
  it("renders title and rationale", () => {
    const html = render(
      <ProposalCard proposal={proposal} onApprove={() => {}} onDismiss={() => {}} />,
    );
    ok(html.includes("Error recovery patterns"));
    ok(html.includes("retry logic gaps"));
  });

  it("renders approve and dismiss buttons", () => {
    const html = render(
      <ProposalCard proposal={proposal} onApprove={() => {}} onDismiss={() => {}} />,
    );
    ok(html.includes("Approve"));
    ok(html.includes("Dismiss"));
  });
});
