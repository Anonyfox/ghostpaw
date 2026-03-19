import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { markDistilled } from "./mark_distilled.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("markDistilled", () => {
  it("sets distilled_at to a recent timestamp", () => {
    const session = createSession(db, "k");
    const before = Date.now();
    markDistilled(db, session.id);
    const after = Date.now();
    const found = getSession(db, session.id);
    ok(found);
    ok(found.distilledAt !== null);
    ok(found.distilledAt >= before && found.distilledAt <= after);
  });

  it("is idempotent — does not overwrite existing distilled_at", () => {
    const session = createSession(db, "k");
    markDistilled(db, session.id);
    const first = getSession(db, session.id)!.distilledAt;
    markDistilled(db, session.id);
    const second = getSession(db, session.id)!.distilledAt;
    strictEqual(first, second);
  });

  it("does nothing for a non-existent session", () => {
    markDistilled(db, 99999);
    strictEqual(getSession(db, 99999), null);
  });
});
