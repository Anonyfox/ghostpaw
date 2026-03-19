import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import type { SkillHealthData } from "./api/read/health.ts";
import { pendingProposals, readSkillHealth } from "./api/read/index.ts";
import {
  approveProposal,
  dismissProposal,
  queueProposal,
  writeSkillHealth,
} from "./api/write/index.ts";
import { initSkillHealthTables } from "./runtime/health.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSkillHealthTables(db);
});

afterEach(() => {
  db.close();
});

const sampleHealth: SkillHealthData = {
  computedAt: 0,
  totalSkills: 7,
  rankDistribution: { Apprentice: 2, Journeyman: 3, Expert: 1, Master: 1 },
  staleSkills: ["old-deploy"],
  dormantSkills: ["skill-mcp"],
  oversizedSkills: [],
  pendingFragments: 12,
  expiredFragments: 3,
  repairsApplied: 1,
  proposalsQueued: 2,
  explored: true,
};

describe("writeSkillHealth + readSkillHealth", () => {
  it("round-trips health data", () => {
    writeSkillHealth(db, sampleHealth);
    const read = readSkillHealth(db);
    strictEqual(read?.totalSkills, 7);
    deepStrictEqual(read?.rankDistribution, { Apprentice: 2, Journeyman: 3, Expert: 1, Master: 1 });
    deepStrictEqual(read?.staleSkills, ["old-deploy"]);
    deepStrictEqual(read?.dormantSkills, ["skill-mcp"]);
    deepStrictEqual(read?.oversizedSkills, []);
    strictEqual(read?.pendingFragments, 12);
    strictEqual(read?.expiredFragments, 3);
    strictEqual(read?.repairsApplied, 1);
    strictEqual(read?.proposalsQueued, 2);
    strictEqual(read?.explored, true);
  });

  it("returns null when no health data exists", () => {
    strictEqual(readSkillHealth(db), null);
  });

  it("returns most recent entry", () => {
    writeSkillHealth(db, { ...sampleHealth, totalSkills: 5 });
    writeSkillHealth(db, { ...sampleHealth, totalSkills: 8 });
    strictEqual(readSkillHealth(db)?.totalSkills, 8);
  });
});

describe("skill proposals", () => {
  it("queues and retrieves pending proposals", () => {
    queueProposal(db, "api-resilience", "4 observations about retry patterns", [1, 2, 3, 4]);
    const proposals = pendingProposals(db);
    strictEqual(proposals.length, 1);
    strictEqual(proposals[0].title, "api-resilience");
    strictEqual(proposals[0].status, "pending");
  });

  it("dismisses a proposal", () => {
    queueProposal(db, "api-resilience", "rationale", []);
    dismissProposal(db, 1);
    strictEqual(pendingProposals(db).length, 0);
  });

  it("approves a proposal", () => {
    queueProposal(db, "api-resilience", "rationale", []);
    approveProposal(db, 1);
    strictEqual(pendingProposals(db).length, 0);
  });

  it("returns empty array when no pending proposals", () => {
    deepStrictEqual(pendingProposals(db), []);
  });
});
