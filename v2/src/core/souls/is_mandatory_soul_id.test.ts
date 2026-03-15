import { ok } from "node:assert";
import { describe, it } from "node:test";
import { isMandatorySoulId } from "./is_mandatory_soul_id.ts";

describe("isMandatorySoulId", () => {
  it("returns true for mandatory IDs", () => {
    ok(isMandatorySoulId(1));
    ok(isMandatorySoulId(2));
    ok(isMandatorySoulId(3));
    ok(isMandatorySoulId(4));
    ok(isMandatorySoulId(5));
    ok(isMandatorySoulId(6));
    ok(isMandatorySoulId(7));
  });

  it("returns false for non-mandatory IDs", () => {
    ok(!isMandatorySoulId(0));
    ok(!isMandatorySoulId(8));
    ok(!isMandatorySoulId(100));
    ok(!isMandatorySoulId(-1));
  });
});
