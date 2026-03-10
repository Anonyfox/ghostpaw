import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import {
  initSkillEventsTables,
  logSkillEvent,
  readinessForAll,
  skillReadiness,
} from "./skill_events.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSkillEventsTables(db);
});

afterEach(() => {
  db.close();
});

describe("logSkillEvent", () => {
  it("inserts an event row", () => {
    logSkillEvent(db, "deploy", "read", "sess-1");
    const row = db.prepare("SELECT skill, event, session_id FROM skill_events").get() as Record<
      string,
      unknown
    >;
    strictEqual(row.skill, "deploy");
    strictEqual(row.event, "read");
    strictEqual(row.session_id, "sess-1");
  });

  it("handles null session_id", () => {
    logSkillEvent(db, "deploy", "checkpoint");
    const row = db.prepare("SELECT session_id FROM skill_events").get() as Record<string, unknown>;
    strictEqual(row.session_id, null);
  });
});

describe("skillReadiness", () => {
  it("returns grey when no events exist", () => {
    const r = skillReadiness(db, "deploy");
    deepStrictEqual(r, { color: "grey", readsSinceCheckpoint: 0 });
  });

  it("returns green after 1 read", () => {
    logSkillEvent(db, "deploy", "read");
    const r = skillReadiness(db, "deploy");
    deepStrictEqual(r, { color: "green", readsSinceCheckpoint: 1 });
  });

  it("returns yellow after 3 reads", () => {
    for (let i = 0; i < 3; i++) logSkillEvent(db, "deploy", "read");
    const r = skillReadiness(db, "deploy");
    deepStrictEqual(r, { color: "yellow", readsSinceCheckpoint: 3 });
  });

  it("returns orange after 6 reads", () => {
    for (let i = 0; i < 6; i++) logSkillEvent(db, "deploy", "read");
    const r = skillReadiness(db, "deploy");
    deepStrictEqual(r, { color: "orange", readsSinceCheckpoint: 6 });
  });

  it("resets after checkpoint", () => {
    for (let i = 0; i < 5; i++) logSkillEvent(db, "deploy", "read");
    logSkillEvent(db, "deploy", "checkpoint");
    const r = skillReadiness(db, "deploy");
    deepStrictEqual(r, { color: "grey", readsSinceCheckpoint: 0 });
  });

  it("counts only reads after latest checkpoint", () => {
    for (let i = 0; i < 5; i++) logSkillEvent(db, "deploy", "read");
    logSkillEvent(db, "deploy", "checkpoint");
    logSkillEvent(db, "deploy", "read");
    logSkillEvent(db, "deploy", "read");
    const r = skillReadiness(db, "deploy");
    deepStrictEqual(r, { color: "green", readsSinceCheckpoint: 2 });
  });

  it("isolates skills from each other", () => {
    for (let i = 0; i < 6; i++) logSkillEvent(db, "deploy", "read");
    logSkillEvent(db, "testing", "read");
    strictEqual(skillReadiness(db, "deploy").color, "orange");
    strictEqual(skillReadiness(db, "testing").color, "green");
  });
});

describe("readinessForAll", () => {
  it("returns readiness for multiple skills", () => {
    for (let i = 0; i < 6; i++) logSkillEvent(db, "deploy", "read");
    logSkillEvent(db, "testing", "read");
    const result = readinessForAll(db, ["deploy", "testing", "unknown"]);
    strictEqual(result.deploy.color, "orange");
    strictEqual(result.testing.color, "green");
    strictEqual(result.unknown.color, "grey");
  });
});
