import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { listUnsealedStaleSessions } from "./list_unsealed_stale_sessions.ts";
import { addMessage } from "./messages.ts";
import { createSession } from "./session.ts";

let db: DatabaseHandle;

beforeEach(() => {
  db = openMemoryDatabase();
});

afterEach(() => {
  db.close();
});

describe("listUnsealedStaleSessions", () => {
  it("returns empty when no sessions exist", () => {
    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 0);
  });

  it("returns sessions with unsealed messages that are past stale threshold", () => {
    const session = createSession(db, "m", "p", {
      purpose: "chat",
      soulId: 1,
    });
    addMessage(db, session.id, "user", "old message");

    // Backdate the session's updated_at to be old enough
    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, session.id);
  });

  it("excludes sessions with no unsealed messages", () => {
    const session = createSession(db, "m", "p", {
      purpose: "chat",
      soulId: 1,
    });
    const msgId = addMessage(db, session.id, "user", "message");

    // Seal the message
    db.prepare(
      "UPDATE messages SET sealed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    ).run(msgId);

    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 0);
  });

  it("excludes sessions without soul_id", () => {
    const session = createSession(db, "m", "p", { purpose: "chat" });
    addMessage(db, session.id, "user", "no soul");
    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 0);
  });

  it("excludes sessions with non-sealable purposes", () => {
    const session = createSession(db, "m", "p", { purpose: "system", soulId: 1 });
    addMessage(db, session.id, "user", "system");
    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 0);
  });

  it("excludes recently updated sessions", () => {
    const session = createSession(db, "m", "p", {
      purpose: "chat",
      soulId: 1,
    });
    addMessage(db, session.id, "user", "recent");

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 0);
  });

  it("excludes session where only the last message is sealed (boundary-only)", () => {
    const session = createSession(db, "m", "p", {
      purpose: "chat",
      soulId: 1,
    });
    addMessage(db, session.id, "user", "first");
    const lastId = addMessage(db, session.id, "assistant", "reply");

    db.prepare(
      "UPDATE messages SET sealed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    ).run(lastId);

    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 0, "should not return session with sealed tail");
  });

  it("excludes session with no messages", () => {
    const session = createSession(db, "m", "p", {
      purpose: "chat",
      soulId: 1,
    });
    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 0);
  });

  it("includes stale subsystem_turn sessions", () => {
    const session = createSession(db, "m", "p", {
      purpose: "subsystem_turn",
      soulId: 1,
    });
    addMessage(db, session.id, "user", "task");
    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].purpose, "subsystem_turn");
  });

  it("includes stale pulse sessions", () => {
    const session = createSession(db, "m", "p", {
      purpose: "pulse",
      soulId: 2,
    });
    addMessage(db, session.id, "user", "job");
    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].purpose, "pulse");
  });

  it("returns session when new messages exist after a previous seal", () => {
    const session = createSession(db, "m", "p", {
      purpose: "chat",
      soulId: 1,
    });
    addMessage(db, session.id, "user", "first");
    const firstLast = addMessage(db, session.id, "assistant", "reply");

    db.prepare(
      "UPDATE messages SET sealed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    ).run(firstLast);

    addMessage(db, session.id, "user", "second");
    addMessage(db, session.id, "assistant", "reply2");

    db.prepare("UPDATE sessions SET updated_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(
      session.id,
    );

    const result = listUnsealedStaleSessions(db, 60);
    assert.strictEqual(result.length, 1, "should return session with unsealed tail after seal");
  });
});
