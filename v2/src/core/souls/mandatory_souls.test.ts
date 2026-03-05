import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { DEFAULT_SOULS } from "./defaults.ts";
import { isMandatorySoulId, MANDATORY_SOUL_IDS, MANDATORY_SOUL_NAMES } from "./mandatory_souls.ts";

describe("MANDATORY_SOUL_IDS", () => {
  it("assigns ghostpaw ID 1", () => {
    strictEqual(MANDATORY_SOUL_IDS.ghostpaw, 1);
  });

  it("assigns js-engineer ID 2", () => {
    strictEqual(MANDATORY_SOUL_IDS["js-engineer"], 2);
  });

  it("assigns prompt-engineer ID 3", () => {
    strictEqual(MANDATORY_SOUL_IDS["prompt-engineer"], 3);
  });

  it("assigns mentor ID 4", () => {
    strictEqual(MANDATORY_SOUL_IDS.mentor, 4);
  });

  it("assigns trainer ID 5", () => {
    strictEqual(MANDATORY_SOUL_IDS.trainer, 5);
  });

  it("has exactly five entries", () => {
    strictEqual(Object.keys(MANDATORY_SOUL_IDS).length, 5);
  });
});

describe("MANDATORY_SOUL_NAMES", () => {
  it("contains all five mandatory soul names", () => {
    ok(MANDATORY_SOUL_NAMES.includes("ghostpaw"));
    ok(MANDATORY_SOUL_NAMES.includes("js-engineer"));
    ok(MANDATORY_SOUL_NAMES.includes("prompt-engineer"));
    ok(MANDATORY_SOUL_NAMES.includes("mentor"));
    ok(MANDATORY_SOUL_NAMES.includes("trainer"));
    strictEqual(MANDATORY_SOUL_NAMES.length, 5);
  });

  it("matches the keys of DEFAULT_SOULS exactly", () => {
    const defaultKeys = Object.keys(DEFAULT_SOULS).sort();
    const mandatoryNames = [...MANDATORY_SOUL_NAMES].sort();
    deepStrictEqual(mandatoryNames, defaultKeys);
  });
});

describe("isMandatorySoulId", () => {
  it("returns true for mandatory IDs", () => {
    ok(isMandatorySoulId(1));
    ok(isMandatorySoulId(2));
    ok(isMandatorySoulId(3));
    ok(isMandatorySoulId(4));
  });

  it("returns true for trainer ID", () => {
    ok(isMandatorySoulId(5));
  });

  it("returns false for non-mandatory IDs", () => {
    ok(!isMandatorySoulId(0));
    ok(!isMandatorySoulId(6));
    ok(!isMandatorySoulId(100));
    ok(!isMandatorySoulId(-1));
  });
});
