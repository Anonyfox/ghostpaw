import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { clearDistillFailed, markDistillFailed } from "./mark_distill_failed.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("markDistillFailed", () => {
  it("sets distill_failed_at to a recent timestamp", () => {
    const session = createSession(db, "k");
    const before = Date.now();
    markDistillFailed(db, session.id);
    const after = Date.now();
    const found = getSession(db, session.id)!;
    ok(found.distillFailedAt !== null);
    ok(found.distillFailedAt >= before && found.distillFailedAt <= after);
  });

  it("overwrites a previous failure timestamp on retry", () => {
    const session = createSession(db, "k");
    markDistillFailed(db, session.id);
    const first = getSession(db, session.id)!.distillFailedAt;
    markDistillFailed(db, session.id);
    const second = getSession(db, session.id)!.distillFailedAt;
    ok(second! >= first!);
  });

  it("does nothing for a non-existent session", () => {
    markDistillFailed(db, 99999);
    strictEqual(getSession(db, 99999), null);
  });
});

describe("clearDistillFailed", () => {
  it("clears the failure timestamp", () => {
    const session = createSession(db, "k");
    markDistillFailed(db, session.id);
    ok(getSession(db, session.id)!.distillFailedAt !== null);
    clearDistillFailed(db, session.id);
    strictEqual(getSession(db, session.id)!.distillFailedAt, null);
  });

  it("is safe to call when no failure is recorded", () => {
    const session = createSession(db, "k");
    clearDistillFailed(db, session.id);
    strictEqual(getSession(db, session.id)!.distillFailedAt, null);
  });
});
