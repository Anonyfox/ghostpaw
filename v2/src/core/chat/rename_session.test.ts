import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { renameSession } from "./rename_session.ts";
import { initChatTables } from "./schema.ts";

describe("renameSession", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initChatTables(db);
  });

  afterEach(() => {
    db.close();
  });

  it("sets and overwrites display_name", () => {
    const session = createSession(db, "test:1");
    strictEqual(session.displayName, null);
    renameSession(db, session.id as number, "First");
    strictEqual(getSession(db, session.id as number)!.displayName, "First");
    renameSession(db, session.id as number, "Second");
    strictEqual(getSession(db, session.id as number)!.displayName, "Second");
  });

  it("does nothing for a non-existent session id", () => {
    renameSession(db, 99999, "Ghost Title");
    strictEqual(getSession(db, 99999), null);
  });
});
