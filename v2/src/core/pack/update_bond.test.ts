import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./schema.ts";
import { updateBond } from "./update_bond.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("updateBond", () => {
  it("updates the bond narrative", () => {
    const m = meetMember(db, { name: "Alice", kind: "human" });
    const updated = updateBond(db, m.id, { bond: "A reliable partner." });
    strictEqual(updated.bond, "A reliable partner.");
  });

  it("trims bond text", () => {
    const m = meetMember(db, { name: "Bob", kind: "human" });
    const updated = updateBond(db, m.id, { bond: "  padded  " });
    strictEqual(updated.bond, "padded");
  });

  it("updates trust and clamps to [0, 1]", () => {
    const m = meetMember(db, { name: "C", kind: "human" });
    strictEqual(updateBond(db, m.id, { trust: 0.9 }).trust, 0.9);
    strictEqual(updateBond(db, m.id, { trust: -0.5 }).trust, 0);
    strictEqual(updateBond(db, m.id, { trust: 2.0 }).trust, 1);
  });

  it("updates status", () => {
    const m = meetMember(db, { name: "D", kind: "human" });
    strictEqual(updateBond(db, m.id, { status: "dormant" }).status, "dormant");
    strictEqual(updateBond(db, m.id, { status: "lost" }).status, "lost");
    strictEqual(updateBond(db, m.id, { status: "active" }).status, "active");
  });

  it("renames a member", () => {
    const m = meetMember(db, { name: "Old", kind: "human" });
    const updated = updateBond(db, m.id, { name: "New" });
    strictEqual(updated.name, "New");
  });

  it("toggles isUser flag", () => {
    const m = meetMember(db, { name: "E", kind: "human" });
    strictEqual(m.isUser, false);
    const updated = updateBond(db, m.id, { isUser: true });
    strictEqual(updated.isUser, true);
    const cleared = updateBond(db, m.id, { isUser: false });
    strictEqual(cleared.isUser, false);
  });

  it("bumps updated_at on any change", () => {
    const m = meetMember(db, { name: "F", kind: "human" });
    const updated = updateBond(db, m.id, { bond: "changed" });
    ok(updated.updatedAt >= m.updatedAt);
  });

  it("returns the member unchanged when input is empty", () => {
    const m = meetMember(db, { name: "G", kind: "human" });
    const same = updateBond(db, m.id, {});
    strictEqual(same.bond, m.bond);
    strictEqual(same.trust, m.trust);
  });

  it("throws on nonexistent member", () => {
    throws(() => updateBond(db, 999, { bond: "nope" }), /not found/);
  });

  it("throws on invalid status", () => {
    const m = meetMember(db, { name: "H", kind: "human" });
    throws(() => updateBond(db, m.id, { status: "gone" as "lost" }), /Invalid status/);
  });

  it("throws on NaN trust", () => {
    const m = meetMember(db, { name: "I", kind: "human" });
    throws(() => updateBond(db, m.id, { trust: Number.NaN }), /number between/);
  });

  it("throws on empty name", () => {
    const m = meetMember(db, { name: "K", kind: "human" });
    throws(() => updateBond(db, m.id, { name: "" }), /non-empty/);
  });

  it("updates universal columns", () => {
    const m = meetMember(db, { name: "J", kind: "human" });
    const updated = updateBond(db, m.id, {
      nickname: "Jay",
      timezone: "America/New_York",
      location: "NYC",
      pronouns: "they/them",
      birthday: "1995-12-25",
    });
    strictEqual(updated.nickname, "Jay");
    strictEqual(updated.timezone, "America/New_York");
    strictEqual(updated.location, "NYC");
    strictEqual(updated.pronouns, "they/them");
    strictEqual(updated.birthday, "1995-12-25");
  });

  it("clears a universal column with empty string", () => {
    const m = meetMember(db, { name: "L", kind: "human", timezone: "Europe/Berlin" });
    strictEqual(m.timezone, "Europe/Berlin");
    const updated = updateBond(db, m.id, { timezone: "" });
    strictEqual(updated.timezone, null);
  });
});
