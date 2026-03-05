import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { CreateRunInput, DelegationRun, RunStatus } from "./types.ts";

describe("runs type compatibility", () => {
  it("RunStatus accepts all valid values", () => {
    const statuses: RunStatus[] = ["running", "completed", "failed"];
    strictEqual(statuses.length, 3);
  });

  it("DelegationRun has all required fields", () => {
    const run: DelegationRun = {
      id: 1,
      parentSessionId: 10,
      childSessionId: null,
      specialist: "default",
      model: "gpt-4o",
      task: "do something",
      status: "running",
      result: null,
      error: null,
      tokensIn: 0,
      tokensOut: 0,
      reasoningTokens: 0,
      cachedTokens: 0,
      costUsd: 0,
      createdAt: Date.now(),
      completedAt: null,
    };
    strictEqual(run.status, "running");
    strictEqual(run.childSessionId, null);
  });

  it("CreateRunInput requires parentSessionId, model, and task", () => {
    const input: CreateRunInput = {
      parentSessionId: 1,
      model: "claude-sonnet-4-20250514",
      task: "analyze code",
    };
    ok(input.parentSessionId > 0);
    strictEqual(input.specialist, undefined);
  });

  it("CreateRunInput accepts optional specialist", () => {
    const input: CreateRunInput = {
      parentSessionId: 1,
      model: "gpt-4o",
      task: "write tests",
      specialist: "js-engineer",
    };
    strictEqual(input.specialist, "js-engineer");
  });
});
