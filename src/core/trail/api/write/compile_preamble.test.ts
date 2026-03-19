import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { compilePreamble } from "./compile_preamble.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("compilePreamble", () => {
  it("stores the first preamble as version 1", () => {
    const result = compilePreamble(db, "User prefers brevity.");
    ok(result.changed);
    if (result.changed) {
      strictEqual(result.preamble.version, 1);
      strictEqual(result.preamble.text, "User prefers brevity.");
    }
  });

  it("returns unchanged when text is identical", () => {
    compilePreamble(db, "Same text.");
    const result = compilePreamble(db, "Same text.");
    strictEqual(result.changed, false);
  });

  it("increments version on new text", () => {
    compilePreamble(db, "Version 1");
    const result = compilePreamble(db, "Version 2");
    ok(result.changed);
    if (result.changed) {
      strictEqual(result.preamble.version, 2);
    }
  });

  it("returns unchanged for empty candidate", () => {
    const result = compilePreamble(db, "   ");
    strictEqual(result.changed, false);
  });
});
