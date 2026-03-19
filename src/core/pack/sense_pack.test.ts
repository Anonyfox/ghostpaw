import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { meetMember } from "./meet_member.ts";
import { initPackTables } from "./runtime/schema.ts";
import { sensePack } from "./sense_pack.ts";
import { updateBond } from "./update_bond.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initPackTables(db);
});

describe("sensePack", () => {
  it("returns empty array when no members exist", () => {
    strictEqual(sensePack(db).length, 0);
  });

  it("includes active and dormant members", () => {
    meetMember(db, { name: "Active", kind: "human" });
    const dormant = meetMember(db, { name: "Dormant", kind: "human" });
    updateBond(db, dormant.id, { status: "dormant" });

    const pack = sensePack(db);
    strictEqual(pack.length, 2);
    const names = pack.map((m) => m.name);
    ok(names.includes("Active"));
    ok(names.includes("Dormant"));
  });

  it("excludes lost members", () => {
    const lost = meetMember(db, { name: "Lost", kind: "human" });
    updateBond(db, lost.id, { status: "lost" });
    meetMember(db, { name: "Active", kind: "human" });

    const pack = sensePack(db);
    strictEqual(pack.length, 1);
    strictEqual(pack[0].name, "Active");
  });

  it("returns PackMemberSummary shape", () => {
    meetMember(db, { name: "Shape", kind: "agent" });
    const pack = sensePack(db);
    const keys = Object.keys(pack[0]);
    ok(keys.includes("id"));
    ok(keys.includes("name"));
    ok(keys.includes("kind"));
    ok(keys.includes("trust"));
    ok(keys.includes("status"));
    ok(keys.includes("lastContact"));
    ok(keys.includes("interactionCount"));
  });
});
