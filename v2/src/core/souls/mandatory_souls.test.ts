import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { DEFAULT_SOULS } from "./defaults.ts";
import { MANDATORY_SOUL_IDS, MANDATORY_SOUL_NAMES } from "./mandatory_souls.ts";

describe("MANDATORY_SOUL_IDS", () => {
  it("assigns ghostpaw ID 1", () => {
    strictEqual(MANDATORY_SOUL_IDS.ghostpaw, 1);
  });

  it("assigns js-engineer ID 2", () => {
    strictEqual(MANDATORY_SOUL_IDS["js-engineer"], 2);
  });

  it("assigns mentor ID 3", () => {
    strictEqual(MANDATORY_SOUL_IDS.mentor, 3);
  });

  it("assigns trainer ID 4", () => {
    strictEqual(MANDATORY_SOUL_IDS.trainer, 4);
  });

  it("assigns warden ID 5", () => {
    strictEqual(MANDATORY_SOUL_IDS.warden, 5);
  });

  it("assigns chamberlain ID 6", () => {
    strictEqual(MANDATORY_SOUL_IDS.chamberlain, 6);
  });

  it("has exactly six entries", () => {
    strictEqual(Object.keys(MANDATORY_SOUL_IDS).length, 6);
  });
});

describe("MANDATORY_SOUL_NAMES", () => {
  it("contains all six mandatory soul names", () => {
    ok(MANDATORY_SOUL_NAMES.includes("ghostpaw"));
    ok(MANDATORY_SOUL_NAMES.includes("js-engineer"));
    ok(MANDATORY_SOUL_NAMES.includes("mentor"));
    ok(MANDATORY_SOUL_NAMES.includes("trainer"));
    ok(MANDATORY_SOUL_NAMES.includes("warden"));
    ok(MANDATORY_SOUL_NAMES.includes("chamberlain"));
    strictEqual(MANDATORY_SOUL_NAMES.length, 6);
  });

  it("matches the keys of DEFAULT_SOULS exactly", () => {
    const defaultKeys = Object.keys(DEFAULT_SOULS).sort();
    const mandatoryNames = [...MANDATORY_SOUL_NAMES].sort();
    deepStrictEqual(mandatoryNames, defaultKeys);
  });
});
