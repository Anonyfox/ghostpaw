import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../lib/index.ts";
import { initChatTables } from "../../chat/runtime/index.ts";
import { initMemoryTable } from "../../memory/runtime/index.ts";
import { initPackTables } from "../../pack/runtime/schema.ts";
import { initQuestTables } from "../../quests/runtime/index.ts";
import { initSkillEventsTables } from "../../skills/runtime/events.ts";
import { initSoulsTables } from "../../souls/runtime/index.ts";
import { initTrailTables } from "../schema.ts";
import { gatherSlices } from "./gather.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initMemoryTable(db);
  initPackTables(db);
  initQuestTables(db);
  initSkillEventsTables(db);
  initSoulsTables(db);
  initTrailTables(db);
});

describe("gatherSlices", () => {
  it("returns all nulls on empty database", () => {
    const slices = gatherSlices(db, 0);
    strictEqual(slices.memory, null);
    strictEqual(slices.chat, null);
    strictEqual(slices.pack, null);
    strictEqual(slices.quests, null);
    strictEqual(slices.skills, null);
    strictEqual(slices.souls, null);
  });

  it("returns non-null chat slice when sessions exist", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO sessions (key, purpose, created_at, last_active_at) VALUES (?, ?, ?, ?)",
    ).run("s1", "user", now, now);
    const slices = gatherSlices(db, now - 1000);
    strictEqual(Array.isArray(slices.chat), true);
  });
});
