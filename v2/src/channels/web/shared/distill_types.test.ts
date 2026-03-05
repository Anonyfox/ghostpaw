import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  DistillStatusResponse,
  DistillSweepResponse,
  DistillToolCallsInfo,
} from "./distill_types.ts";

describe("distill_types", () => {
  it("DistillStatusResponse is importable", () => {
    const s: DistillStatusResponse = { undistilledCount: 3 };
    strictEqual(s.undistilledCount, 3);
  });

  it("DistillToolCallsInfo is importable", () => {
    const t: DistillToolCallsInfo = { recall: 1, remember: 2, revise: 0, forget: 0 };
    strictEqual(t.remember, 2);
  });

  it("DistillSweepResponse is importable", () => {
    const r: DistillSweepResponse = {
      sessionsProcessed: 3,
      sessionsSkipped: 1,
      totalToolCalls: { recall: 5, remember: 3, revise: 2, forget: 0 },
    };
    ok(r.sessionsProcessed > 0);
  });
});
