import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packPatrol from "./pack_patrol.ts";

describe("pack_patrol CLI command", () => {
  it("exports a citty command object", () => {
    assert.equal(typeof packPatrol, "object");
    assert.ok(packPatrol.meta);
    assert.ok(packPatrol.args);
    assert.equal(typeof packPatrol.run, "function");
  });
});
