import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionRunInfo } from "../../shared/session_types.ts";
import { SessionRunRow } from "./session_run_row.tsx";

describe("SessionRunRow", () => {
  const run: SessionRunInfo = {
    id: 1,
    specialist: "Researcher",
    model: "claude-sonnet-4-6",
    task: "Summarize the article about recent developments in quantum computing",
    status: "completed",
    result: "Summary here",
    error: null,
    costUsd: 0.04,
    tokensIn: 5000,
    tokensOut: 2000,
    createdAt: Date.now() - 120000,
    completedAt: Date.now() - 60000,
    childSessionId: 5,
  };

  it("exports a function component", () => {
    ok(typeof SessionRunRow === "function");
  });

  it("renders completed run", () => {
    const el = SessionRunRow({ run });
    ok(el);
  });

  it("renders failed run with error", () => {
    const failedRun = { ...run, status: "failed" as const, error: "Out of tokens" };
    const el = SessionRunRow({ run: failedRun });
    ok(el);
  });
});
