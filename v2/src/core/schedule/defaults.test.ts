import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { DEFAULT_SCHEDULES } from "./defaults.ts";

describe("DEFAULT_SCHEDULES", () => {
  it("contains haunt, distill, stoke, attune, and trail_sweep", () => {
    const names = DEFAULT_SCHEDULES.map((s) => s.name);
    ok(names.includes("haunt"));
    ok(names.includes("distill"));
    ok(names.includes("stoke"));
    ok(names.includes("attune"));
    ok(names.includes("trail_sweep"));
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

  it("all builtins have a positive timeout", () => {
    for (const s of DEFAULT_SCHEDULES) {
      ok(s.timeoutMs !== undefined && s.timeoutMs > 0, `${s.name} missing timeout`);
      ok(s.timeoutMs! < s.intervalMs, `${s.name} timeout should be less than interval`);
    }
  });
});
