import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  SkillDetailInfo,
  SkillSummaryInfo,
  TrainerExecuteResponse,
  TrainerOption,
  TrainerProposalResponse,
  TrainerStatusResponse,
} from "./trainer_types.ts";

describe("trainer_types", () => {
  it("TrainerOption is importable", () => {
    const o: TrainerOption = { id: "1", title: "Add retries", description: "Handle flakes" };
    ok(o.title);
  });

  it("TrainerProposalResponse is importable", () => {
    const r: TrainerProposalResponse = {
      options: [{ id: "1", title: "Test", description: "Desc" }],
      rawContent: "full text",
      sessionId: 42,
      cost: { totalUsd: 0.01 },
    };
    ok(r.sessionId);
  });

  it("TrainerExecuteResponse is importable", () => {
    const r: TrainerExecuteResponse = { content: "ok", succeeded: true, cost: { totalUsd: 0.01 } };
    ok(r.succeeded);
  });

  it("TrainerStatusResponse is importable", () => {
    const s: TrainerStatusResponse = {
      skillCount: 3,
      totalRanks: 12,
      pendingChanges: 1,
      trainerAvailable: true,
    };
    ok(s.trainerAvailable);
  });

  it("SkillSummaryInfo is importable", () => {
    const s: SkillSummaryInfo = {
      name: "deploy",
      description: "Deploy the app",
      rank: 3,
      hasPendingChanges: false,
      fileCount: 2,
      bodyLines: 20,
    };
    ok(s.name);
  });

  it("SkillDetailInfo is importable", () => {
    const d: SkillDetailInfo = {
      name: "deploy",
      description: "Deploy",
      body: "# Deploy",
      rank: 3,
      hasPendingChanges: false,
      files: { scripts: [], references: [], assets: [], other: [] },
      validation: { valid: true, issues: [] },
    };
    ok(d.validation.valid);
  });
});
