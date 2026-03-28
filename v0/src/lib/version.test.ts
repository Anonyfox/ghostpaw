import assert from "node:assert";
import { describe, it } from "node:test";
import { VERSION } from "./version.ts";

describe("VERSION", () => {
  it("is a string that looks like a semver", () => {
    assert.strictEqual(typeof VERSION, "string");
    assert.ok(/^\d+\.\d+\.\d+/.test(VERSION), `VERSION "${VERSION}" does not look like semver`);
  });
});
