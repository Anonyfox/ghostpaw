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

  it("sets display_name on an existing session", () => {
    const session = createSession(db, "test:1", { purpose: "chat" });
    strictEqual(session.displayName, null);

    renameSession(db, session.id as number, "My Chat Title");

    const updated = getSession(db, session.id as number);
    strictEqual(updated!.displayName, "My Chat Title");
  });

  it("overwrites a previously set display_name", () => {
    const session = createSession(db, "test:2", { purpose: "chat" });
    renameSession(db, session.id as number, "First Title");
    renameSession(db, session.id as number, "Second Title");

    const updated = getSession(db, session.id as number);
    strictEqual(updated!.displayName, "Second Title");
  });

  it("does nothing for a non-existent session id", () => {
    renameSession(db, 99999, "Ghost Title");
    const result = getSession(db, 99999);
    strictEqual(result, null);
  });

  it("preserves other session fields when renaming", () => {
    const session = createSession(db, "test:3", { purpose: "delegate" });
    renameSession(db, session.id as number, "Renamed");

    const updated = getSession(db, session.id as number);
    strictEqual(updated!.key, "test:3");
    strictEqual(updated!.purpose, "delegate");
    strictEqual(updated!.displayName, "Renamed");
  });
});
