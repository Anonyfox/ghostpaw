import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionStatsResponse } from "../../shared/session_types.ts";
import { SessionStatsBar } from "./session_stats_bar.tsx";

describe("SessionStatsBar", () => {
  it("exports a function component", () => {
    ok(typeof SessionStatsBar === "function");
  });

  it("accepts stats props without error", () => {
    const stats: SessionStatsResponse = {
      total: 50,
      open: 3,
      closed: 40,
      distilled: 7,
      byChannel: { web: 30, telegram: 15, delegate: 5 },
      byPurpose: { chat: 35, delegate: 10, system: 5 },
    };
    ok(SessionStatsBar({ stats }));
  });
});
