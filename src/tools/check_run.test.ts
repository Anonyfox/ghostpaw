import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "../core/database.js";
import { createRunStore, type RunStore } from "../core/runs.js";
import { createSessionStore, type SessionStore } from "../core/session.js";
import { createCheckRunTool } from "./check_run.js";

let db: GhostpawDatabase;
let sessions: SessionStore;
let runs: RunStore;

async function exec(
  tool: ReturnType<typeof createCheckRunTool>,
  args: Record<string, unknown>,
) {
  return tool.execute({ args } as Parameters<ReturnType<typeof createCheckRunTool>["execute"]>[0]);
}

beforeEach(async () => {
  db = await createDatabase(":memory:");
  sessions = createSessionStore(db);
  runs = createRunStore(db);
});

describe("check_run tool - metadata", () => {
  it("has correct name and description", () => {
    const tool = createCheckRunTool(runs);
    strictEqual(tool.name, "check_run");
    ok(tool.description.includes("status"));
    ok(tool.description.includes("background"));
  });
});

describe("check_run tool - execution", () => {
  it("returns error for unknown run ID", async () => {
    const tool = createCheckRunTool(runs);
    const result = (await exec(tool, { run_id: "nonexistent" })) as { error: string };
    ok(result.error.includes("No run found"));
  });

  it("returns running run details", async () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "running task" });

    const tool = createCheckRunTool(runs);
    const result = (await exec(tool, { run_id: run.id })) as {
      status: string;
      prompt: string;
      agent: string;
      startedAt: number;
    };
    strictEqual(result.status, "running");
    strictEqual(result.prompt, "running task");
    strictEqual(result.agent, "default");
    ok(result.startedAt > 0);
  });

  it("returns completed run with result", async () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "task" });
    runs.complete(run.id, "here is the result");

    const tool = createCheckRunTool(runs);
    const result = (await exec(tool, { run_id: run.id })) as {
      status: string;
      result: string;
      completedAt: number;
    };
    strictEqual(result.status, "completed");
    strictEqual(result.result, "here is the result");
    ok(result.completedAt > 0);
  });

  it("returns failed run with error", async () => {
    const session = sessions.createSession("test");
    const run = runs.create({ sessionId: session.id, prompt: "task" });
    runs.fail(run.id, "connection timeout");

    const tool = createCheckRunTool(runs);
    const result = (await exec(tool, { run_id: run.id })) as { status: string; error: string };
    strictEqual(result.status, "failed");
    strictEqual(result.error, "connection timeout");
  });
});
