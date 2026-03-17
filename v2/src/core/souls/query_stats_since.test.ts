import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "../chat/runtime/index.ts";
import { initConfigTable } from "../config/runtime/index.ts";
import { MANDATORY_SOUL_IDS } from "./api/read/index.ts";
import { queryStatsSince } from "./query_stats_since.ts";
import { ensureMandatorySouls, initSoulsTables } from "./runtime/index.ts";

describe("queryStatsSince", () => {
  it("returns zero stats when no delegations exist", async () => {
    const db = await openTestDatabase();
    initSoulsTables(db);
    initChatTables(db);
    initConfigTable(db);
    ensureMandatorySouls(db);

    const result = queryStatsSince(db, MANDATORY_SOUL_IDS.warden, 0);
    strictEqual(result.total, 0);
    strictEqual(result.completed, 0);
    strictEqual(result.failed, 0);
  });
});
