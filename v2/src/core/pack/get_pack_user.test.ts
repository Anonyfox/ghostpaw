import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { getPackUser } from "./get_pack_user.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("getPackUser", () => {
  it("returns null when no user member exists", () => {
    strictEqual(getPackUser(db), null);
  });

  it("returns null when only non-user members exist", () => {
    meetMember(db, { name: "Alice", kind: "human" });
    strictEqual(getPackUser(db), null);
  });

  it("returns the member marked as user", () => {
    meetMember(db, { name: "Colleague", kind: "human" });
    const user = meetMember(db, { name: "Fox", kind: "human", isUser: true });
    const found = getPackUser(db);
    strictEqual(found?.id, user.id);
    strictEqual(found?.name, "Fox");
    strictEqual(found?.isUser, true);
  });

  it("excludes lost user members", () => {
    const user = meetMember(db, { name: "Gone", kind: "human", isUser: true });
    db.prepare("UPDATE pack_members SET status = 'lost' WHERE id = ?").run(user.id);
    strictEqual(getPackUser(db), null);
  });
});
