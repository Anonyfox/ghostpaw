import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updatePairingWisdom } from "../write/update_pairing_wisdom.ts";
import { updateTrailState } from "../write/update_trail_state.ts";
import { listSoulRelevantSignals } from "./list_soul_relevant_signals.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("listSoulRelevantSignals", () => {
  it("returns empty when no trail data exists", () => {
    strictEqual(listSoulRelevantSignals(db).length, 0);
  });

  it("returns trailmarks of relevant kinds", () => {
    updateTrailState(db, {
      trailmarks: [
        { kind: "milestone", description: "First delegation", significance: 0.9 },
        { kind: "shift", description: "Mood change", significance: 0.6 },
      ],
    });
    const signals = listSoulRelevantSignals(db);
    strictEqual(signals.length, 2);
    strictEqual(signals[0].kind, "trailmark");
    strictEqual(signals[0].description.includes("milestone"), true);
  });

  it("returns high-confidence pairing wisdom", () => {
    updatePairingWisdom(db, {
      create: [
        { category: "tone", pattern: "Direct style", guidance: "Be crisp", confidence: 0.8 },
        { category: "tone", pattern: "Weak signal", guidance: "Ignore", confidence: 0.2 },
      ],
    });
    const signals = listSoulRelevantSignals(db);
    strictEqual(signals.length, 1);
    strictEqual(signals[0].kind, "wisdom");
  });

  it("includes chapter context when active", () => {
    updateTrailState(db, { createChapter: { label: "Ascent", momentum: "rising" } });
    const signals = listSoulRelevantSignals(db);
    strictEqual(signals.length, 1);
    strictEqual(signals[0].kind, "chapter");
  });

  it("sorts by significance and respects limit", () => {
    updateTrailState(db, {
      createChapter: { label: "Test", momentum: "stable" },
      trailmarks: [
        { kind: "turning_point", description: "Big turn", significance: 1.0 },
        { kind: "first", description: "First thing", significance: 0.5 },
      ],
    });
    const signals = listSoulRelevantSignals(db, 2);
    strictEqual(signals.length, 2);
    strictEqual(signals[0].significance >= signals[1].significance, true);
  });
});
