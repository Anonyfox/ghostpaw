import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { DEFAULT_SCHEDULES } from "./defaults.ts";

describe("DEFAULT_SCHEDULES", () => {
  it("contains haunt and distill", () => {
    const names = DEFAULT_SCHEDULES.map((s) => s.name);
    ok(names.includes("haunt"));
    ok(names.includes("distill"));
  });

  it("all defaults are builtin type", () => {
    for (const s of DEFAULT_SCHEDULES) {
      strictEqual(s.type, "builtin");
    }
  });

  it("all intervals are at least 1 minute", () => {
    for (const s of DEFAULT_SCHEDULES) {
      ok(s.intervalMs >= 60_000, `${s.name} interval too short: ${s.intervalMs}`);
    }
  });
});
