import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateOpenLoops } from "../write/update_open_loops.ts";
import { updatePairingWisdom } from "../write/update_pairing_wisdom.ts";
import { listSkillOpportunitySignals } from "./list_skill_opportunity_signals.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("listSkillOpportunitySignals", () => {
  it("returns empty when no relevant data exists", () => {
    strictEqual(listSkillOpportunitySignals(db).length, 0);
  });

  it("returns skill-tagged open loops", () => {
    updateOpenLoops(db, {
      create: [
        { description: "Deploy procedure gap", sourceType: "skill", significance: 0.8 },
        { description: "Unrelated thread", sourceType: "quest", significance: 0.9 },
      ],
    });
    const signals = listSkillOpportunitySignals(db);
    strictEqual(signals.length, 1);
    strictEqual(signals[0].source, "open_loop");
    strictEqual(signals[0].description, "Deploy procedure gap");
  });

  it("returns workflow pairing wisdom", () => {
    updatePairingWisdom(db, {
      create: [
        { category: "workflow", pattern: "Manual deploys", guidance: "Automate", confidence: 0.7 },
        { category: "tone", pattern: "Be formal", guidance: "Always", confidence: 0.9 },
      ],
    });
    const signals = listSkillOpportunitySignals(db);
    strictEqual(signals.length, 1);
    strictEqual(signals[0].source, "wisdom");
  });

  it("merges and sorts by significance, respects limit", () => {
    updateOpenLoops(db, {
      create: [{ description: "Low loop", sourceType: "skill", significance: 0.3 }],
    });
    updatePairingWisdom(db, {
      create: [
        { category: "workflow", pattern: "High wisdom", guidance: "Do it", confidence: 0.9 },
      ],
    });
    const signals = listSkillOpportunitySignals(db, 1);
    strictEqual(signals.length, 1);
    strictEqual(signals[0].source, "wisdom");
  });
});
