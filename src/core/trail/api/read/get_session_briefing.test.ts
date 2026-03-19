import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateOpenLoops } from "../write/update_open_loops.ts";
import { updateTrailState } from "../write/update_trail_state.ts";
import { writeOmens } from "../write/write_omens.ts";
import { getSessionBriefing } from "./get_session_briefing.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getSessionBriefing", () => {
  it("returns empty briefing with no data", () => {
    const b = getSessionBriefing(db);
    strictEqual(b.chapter, null);
    strictEqual(b.openLoops.length, 0);
    strictEqual(b.unresolvedOmens.length, 0);
  });

  it("assembles from multiple sources", () => {
    updateTrailState(db, { createChapter: { label: "Ch" } });
    updateOpenLoops(db, { create: [{ description: "Loop", significance: 0.9 }] });
    writeOmens(db, [{ forecast: "Omen", confidence: 0.7 }]);
    const b = getSessionBriefing(db);
    strictEqual(b.chapter?.label, "Ch");
    strictEqual(b.openLoops.length, 1);
    strictEqual(b.unresolvedOmens.length, 1);
  });

  it("caps open loops at 7", () => {
    for (let i = 0; i < 10; i++) {
      updateOpenLoops(db, { create: [{ description: `L${i}`, significance: i * 0.1 }] });
    }
    const b = getSessionBriefing(db);
    strictEqual(b.openLoops.length, 7);
  });
});
