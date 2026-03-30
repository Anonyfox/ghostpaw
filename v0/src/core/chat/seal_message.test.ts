import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { addMessage } from "./messages.ts";
import { sealMessage } from "./seal_message.ts";
import { createSession } from "./session.ts";

let db: DatabaseHandle;

beforeEach(() => {
  db = openMemoryDatabase();
});

afterEach(() => {
  db.close();
});

describe("sealMessage", () => {
  it("sets sealed_at on the target message", () => {
    const session = createSession(db, "m", "p");
    const msgId = addMessage(db, session.id, "user", "hello");

    sealMessage(db, msgId);

    const row = db.prepare("SELECT sealed_at FROM messages WHERE id = ?").get(msgId) as {
      sealed_at: string | null;
    };
    assert.ok(row.sealed_at !== null, "sealed_at should be set");
  });

  it("is idempotent: does not update sealed_at if already set", () => {
    const session = createSession(db, "m", "p");
    const msgId = addMessage(db, session.id, "user", "hello");

    sealMessage(db, msgId);
    const first = (
      db.prepare("SELECT sealed_at FROM messages WHERE id = ?").get(msgId) as {
        sealed_at: string;
      }
    ).sealed_at;

    sealMessage(db, msgId);
    const second = (
      db.prepare("SELECT sealed_at FROM messages WHERE id = ?").get(msgId) as {
        sealed_at: string;
      }
    ).sealed_at;

    assert.strictEqual(first, second);
  });
});

describe("sealMessage on nonexistent id", () => {
  it("changes zero rows without error", () => {
    sealMessage(db, 999_999);

    const sealed = db
      .prepare("SELECT COUNT(*) as c FROM messages WHERE sealed_at IS NOT NULL")
      .get() as { c: number };
    assert.strictEqual(sealed.c, 0, "no messages should have been sealed");
  });
});
