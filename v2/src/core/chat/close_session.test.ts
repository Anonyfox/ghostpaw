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
  it("sets closed_at and optionally error", () => {
    const session = createSession(db, "k");
    const before = Date.now();
    closeSession(db, session.id);
    const found = getSession(db, session.id)!;
    ok(found.closedAt! >= before);
    strictEqual(found.error, null);

    const s2 = createSession(db, "k2");
    closeSession(db, s2.id, "something went wrong");
    strictEqual(getSession(db, s2.id)!.error, "something went wrong");
  });

  it("is idempotent — does not overwrite closed_at or error", () => {
    const session = createSession(db, "k");
    closeSession(db, session.id, "first error");
    const first = getSession(db, session.id)!;
    closeSession(db, session.id, "second error");
    const second = getSession(db, session.id)!;
    strictEqual(first.closedAt, second.closedAt);
    strictEqual(second.error, "first error");
  });

  it("does nothing for a non-existent session", () => {
    closeSession(db, 99999);
    strictEqual(getSession(db, 99999), null);
  });
});
