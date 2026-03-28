import assert from "node:assert";
import { describe, it } from "node:test";
import { createAgent } from "./agent.ts";
import { openMemoryDatabase } from "./core/db/open.ts";

describe("createAgent", () => {
  it("returns an Agent with streamTurn and executeTurn methods", () => {
    const db = openMemoryDatabase();
    const agent = createAgent(db, []);

    assert.strictEqual(typeof agent.streamTurn, "function");
    assert.strictEqual(typeof agent.executeTurn, "function");
    db.close();
  });
});
