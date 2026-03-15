import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateOpenLoops } from "../write/update_open_loops.ts";
import { updatePairingWisdom } from "../write/update_pairing_wisdom.ts";
import { updateTrailState } from "../write/update_trail_state.ts";
import { writeChronicle } from "../write/write_chronicle.ts";
import { getPairHistorySummary } from "./get_pair_history_summary.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getPairHistorySummary", () => {
  it("returns empty summary when no trail data exists", () => {
    const summary = getPairHistorySummary(db);
    strictEqual(summary.chapter, null);
    strictEqual(summary.momentum, "stable");
    strictEqual(summary.latestChronicle, null);
    strictEqual(summary.topWisdom.length, 0);
    strictEqual(summary.activeLoopCount, 0);
  });

  it("assembles chapter, chronicle, wisdom and loop count", () => {
    updateTrailState(db, { createChapter: { label: "Getting Started", momentum: "rising" } });
    writeChronicle(db, {
      date: "2026-03-15",
      title: "Day One",
      narrative: "First day narrative.",
    });
    updatePairingWisdom(db, {
      create: [
        { category: "tone", pattern: "Be concise", guidance: "Short answers", confidence: 0.8 },
      ],
    });
    updateOpenLoops(db, { create: [{ description: "Pending thread" }] });

    const summary = getPairHistorySummary(db);
    strictEqual(summary.chapter?.label, "Getting Started");
    strictEqual(summary.momentum, "rising");
    strictEqual(summary.latestChronicle?.title, "Day One");
    strictEqual(summary.topWisdom.length, 1);
    strictEqual(summary.activeLoopCount, 1);
  });

  it("filters wisdom below confidence threshold", () => {
    updatePairingWisdom(db, {
      create: [
        { category: "tone", pattern: "Strong", guidance: "yes", confidence: 0.8 },
        { category: "tone", pattern: "Weak", guidance: "no", confidence: 0.2 },
      ],
    });
    const summary = getPairHistorySummary(db);
    strictEqual(summary.topWisdom.length, 1);
    strictEqual(summary.topWisdom[0].pattern, "Strong");
  });
});
