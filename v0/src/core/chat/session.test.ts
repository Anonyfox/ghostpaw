import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  renameSession,
  updateSessionModel,
} from "./session.ts";

let db: DatabaseHandle;

beforeEach(() => {
  db = openMemoryDatabase();
});

afterEach(() => {
  db.close();
});

describe("createSession", () => {
  it("creates a session and returns it", () => {
    const session = createSession(db, "test-model", "You are helpful.");
    assert.strictEqual(typeof session.id, "number");
    assert.strictEqual(session.model, "test-model");
    assert.strictEqual(session.system_prompt, "You are helpful.");
    assert.strictEqual(session.title, null);
  });

  it("assigns incrementing IDs", () => {
    const s1 = createSession(db, "m1", "p1");
    const s2 = createSession(db, "m2", "p2");
    assert.ok(s2.id > s1.id);
  });
});

describe("getSession", () => {
  it("returns undefined for nonexistent session", () => {
    assert.strictEqual(getSession(db, 999), undefined);
  });

  it("retrieves a created session", () => {
    const created = createSession(db, "m", "p");
    const fetched = getSession(db, created.id);
    assert.ok(fetched);
    assert.strictEqual(fetched.id, created.id);
    assert.strictEqual(fetched.model, "m");
  });
});

describe("listSessions", () => {
  it("returns empty array when no sessions exist", () => {
    assert.deepStrictEqual(listSessions(db), []);
  });

  it("lists all sessions with message counts", () => {
    createSession(db, "m1", "p1");
    createSession(db, "m2", "p2");
    const list = listSessions(db);
    assert.strictEqual(list.length, 2);
  });
});

describe("renameSession", () => {
  it("updates the session title", () => {
    const s = createSession(db, "m", "p");
    renameSession(db, s.id, "My Chat");
    const fetched = getSession(db, s.id);
    assert.strictEqual(fetched!.title, "My Chat");
  });
});

describe("updateSessionModel", () => {
  it("changes the session model", () => {
    const s = createSession(db, "old-model", "p");
    updateSessionModel(db, s.id, "new-model");
    const fetched = getSession(db, s.id);
    assert.strictEqual(fetched!.model, "new-model");
  });
});

describe("deleteSession", () => {
  it("deletes an existing session and returns true", () => {
    const s = createSession(db, "m", "p");
    const deleted = deleteSession(db, s.id);
    assert.strictEqual(deleted, true);
    assert.strictEqual(getSession(db, s.id), undefined);
  });

  it("returns false for nonexistent session", () => {
    assert.strictEqual(deleteSession(db, 999), false);
  });
});
