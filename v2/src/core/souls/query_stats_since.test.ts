import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/index.ts";
import { initConfigTable } from "../config/index.ts";
import { ensureMandatorySouls, initSoulsTables, MANDATORY_SOUL_IDS } from "./index.ts";
import { queryStatsSince } from "./query_stats_since.ts";

describe("queryStatsSince", () => {
  it("returns zero stats when no delegations exist", async () => {
    const db = await openTestDatabase();
    initSoulsTables(db);
    initChatTables(db);
    initConfigTable(db);
    ensureMandatorySouls(db);

    const result = queryStatsSince(db, MANDATORY_SOUL_IDS["js-engineer"], 0);
    strictEqual(result.total, 0);
    strictEqual(result.completed, 0);
    strictEqual(result.failed, 0);
  });
});
