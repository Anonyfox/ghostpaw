import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../lib/index.ts";
import { initTrailTables } from "../schema.ts";
import { scoreSurprise } from "./surprise.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("scoreSurprise", () => {
  const emptySlices = {
    memory: null,
    costs: null,
    chat: null,
    pack: null,
    quests: null,
    skills: null,
    souls: null,
  };

  it("returns empty on empty database", () => {
    const result = scoreSurprise(db, emptySlices);
    strictEqual(result.scores.length, 0);
    strictEqual(result.omensForResolution.length, 0);
  });

  it("identifies omens with elapsed horizons", () => {
    const past = Date.now() - 10_000;
    db.prepare(
      "INSERT INTO trail_omens (forecast, confidence, horizon, created_at) VALUES (?, ?, ?, ?)",
    ).run("User will return", 0.7, past, past - 86_400_000);
    const result = scoreSurprise(db, emptySlices);
    strictEqual(result.omensForResolution.length, 1);
    ok(result.omensForResolution[0].evidence.includes("User will return"));
  });

  it("ignores omens without horizon", () => {
    const now = Date.now();
    db.prepare("INSERT INTO trail_omens (forecast, confidence, created_at) VALUES (?, ?, ?)").run(
      "Open-ended forecast",
      0.5,
      now,
    );
    const result = scoreSurprise(db, emptySlices);
    strictEqual(result.omensForResolution.length, 0);
  });

  it("computes divergence scores from calibration", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO trail_calibration (key, value, domain, updated_at) VALUES (?, ?, ?, ?)",
    ).run("chat.session_count", 5, "chat", now);
    const slicesWithChat = {
      ...emptySlices,
      chat: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
    };
    const result = scoreSurprise(db, slicesWithChat);
    strictEqual(result.scores.length, 1);
    strictEqual(result.scores[0].expected, 5);
    strictEqual(result.scores[0].actual, 10);
    ok(result.scores[0].divergence > 0);
  });
});
