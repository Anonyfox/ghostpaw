import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { compilePreamble } from "../write/compile_preamble.ts";
import { getCompiledPreamble } from "./get_compiled_preamble.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getCompiledPreamble", () => {
  it("returns null when no preamble exists", () => {
    strictEqual(getCompiledPreamble(db), null);
  });

  it("returns the latest preamble", () => {
    compilePreamble(db, "First");
    compilePreamble(db, "Second");
    const p = getCompiledPreamble(db);
    strictEqual(p?.text, "Second");
    strictEqual(p?.version, 2);
  });
});
