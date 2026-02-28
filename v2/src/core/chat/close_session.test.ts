import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { closeSession } from "./close_session.ts";
import { createSession } from "./create_session.ts";
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

describe("closeSession", () => {
  it("sets closed_at to a recent timestamp", () => {
    const session = createSession(db, "k");
    const before = Date.now();
    closeSession(db, session.id);
    const after = Date.now();
    const found = getSession(db, session.id);
    ok(found);
    ok(found.closedAt !== null);
    ok(found.closedAt >= before && found.closedAt <= after);
  });

  it("is idempotent — does not overwrite existing closed_at", () => {
    const session = createSession(db, "k");
    closeSession(db, session.id);
    const first = getSession(db, session.id)!.closedAt;
    closeSession(db, session.id);
    const second = getSession(db, session.id)!.closedAt;
    strictEqual(first, second);
  });

  it("does nothing for a non-existent session", () => {
    closeSession(db, 99999);
    strictEqual(getSession(db, 99999), null);
  });
});
