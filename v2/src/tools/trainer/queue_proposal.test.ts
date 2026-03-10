import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initSkillHealthTables, pendingProposals } from "../../core/skills/skill_health.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { createQueueProposalTool } from "./queue_proposal.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSkillHealthTables(db);
});

afterEach(() => {
  db.close();
});

describe("queue_proposal tool", () => {
  it("creates a tool with correct name", () => {
    const tool = createQueueProposalTool(db);
    strictEqual(tool.name, "queue_proposal");
  });

  it("queues a proposal", async () => {
    const tool = createQueueProposalTool(db);
    const ctx = { model: "test", provider: "test" };
    const result = await tool.execute({
      args: { title: "api-resilience", rationale: "Repeated timeout issues", fragmentIds: "3,7" },
      ctx,
    });
    ok((result as { queued: boolean }).queued);
    const proposals = pendingProposals(db);
    strictEqual(proposals.length, 1);
    strictEqual(proposals[0].title, "api-resilience");
  });
});
