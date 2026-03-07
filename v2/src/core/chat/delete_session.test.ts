import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { deleteSession } from "./delete_session.ts";
import { getSession } from "./get_session.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("deleteSession", () => {
  it("deletes session and its messages without affecting others", () => {
    const s1 = createSession(db, "k1");
    const s2 = createSession(db, "k2");
    addMessage(db, { sessionId: s1.id, role: "user", content: "hello" });
    addMessage(db, { sessionId: s2.id, role: "user", content: "world" });
    deleteSession(db, s1.id);
    strictEqual(getSession(db, s1.id), null);
    ok(getSession(db, s2.id));
    strictEqual((db.prepare("SELECT COUNT(*) AS c FROM messages").get() as { c: number }).c, 1);
  });

  it("is a no-op for a non-existent session", () => {
    deleteSession(db, 99999);
  });
});
