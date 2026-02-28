import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { markAbsorbed } from "./mark_absorbed.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("markAbsorbed", () => {
  it("sets absorbed_at to a recent timestamp", () => {
    const session = createSession(db, "k");
    const before = Date.now();
    markAbsorbed(db, session.id);
    const after = Date.now();
    const found = getSession(db, session.id);
    ok(found);
    ok(found.absorbedAt !== null);
    ok(found.absorbedAt >= before && found.absorbedAt <= after);
  });

  it("is idempotent — does not overwrite existing absorbed_at", () => {
    const session = createSession(db, "k");
    markAbsorbed(db, session.id);
    const first = getSession(db, session.id)!.absorbedAt;
    markAbsorbed(db, session.id);
    const second = getSession(db, session.id)!.absorbedAt;
    strictEqual(first, second);
  });

  it("does nothing for a non-existent session", () => {
    markAbsorbed(db, 99999);
    strictEqual(getSession(db, 99999), null);
  });
});
