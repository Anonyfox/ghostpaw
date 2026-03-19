import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateOpenLoops } from "../write/update_open_loops.ts";
import { getCuriosityHowlCandidate } from "./get_curiosity_howl_candidate.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getCuriosityHowlCandidate", () => {
  it("returns null when no curiosity loops exist", () => {
    strictEqual(getCuriosityHowlCandidate(db), null);
  });

  it("returns the highest-significance curiosity loop", () => {
    updateOpenLoops(db, {
      create: [
        {
          description: "Low prio",
          category: "curiosity",
          significance: 0.3,
          recommendedAction: "ask",
        },
        {
          description: "High prio",
          category: "curiosity",
          significance: 0.9,
          recommendedAction: "ask",
        },
      ],
    });
    const candidate = getCuriosityHowlCandidate(db);
    ok(candidate);
    strictEqual(candidate.question, "High prio");
  });

  it("ignores organic loops", () => {
    updateOpenLoops(db, {
      create: [{ description: "Organic", significance: 0.9, recommendedAction: "ask" }],
    });
    strictEqual(getCuriosityHowlCandidate(db), null);
  });

  it("ignores loops with future resurface window", () => {
    updateOpenLoops(db, {
      create: [
        {
          description: "Too early",
          category: "curiosity",
          significance: 0.9,
          recommendedAction: "ask",
          earliestResurface: Date.now() + 86_400_000,
        },
      ],
    });
    strictEqual(getCuriosityHowlCandidate(db), null);
  });

  it("includes loops with past resurface window", () => {
    updateOpenLoops(db, {
      create: [
        {
          description: "Ready",
          category: "curiosity",
          significance: 0.9,
          recommendedAction: "ask",
          earliestResurface: Date.now() - 1000,
        },
      ],
    });
    ok(getCuriosityHowlCandidate(db));
  });
});
