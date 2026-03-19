import { ok } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { executeStatus, formatBytes, formatUptime } from "./cmd_status.ts";
import type { CommandContext } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initConfigTable(db);
});

afterEach(() => {
  db.close();
});

function makeCtx(): CommandContext {
  return {
    db,
    sessionId: 1,
    sessionKey: "web:1",
    configuredKeys: new Set(),
    workspace: "/tmp/test-gp",
    version: "2.5.0",
  };
}

describe("formatUptime", () => {
  it("formats seconds only", () => {
    ok(formatUptime(45).includes("45s"));
  });

  it("formats minutes and seconds", () => {
    const result = formatUptime(125);
    ok(result.includes("2m"));
    ok(result.includes("5s"));
  });

  it("formats hours and minutes", () => {
    const result = formatUptime(3661);
    ok(result.includes("1h"));
    ok(result.includes("1m"));
  });

  it("formats days", () => {
    const result = formatUptime(86400 + 3600 * 5 + 60 * 13);
    ok(result.includes("1d"));
    ok(result.includes("5h"));
    ok(result.includes("13m"));
  });
});

describe("formatBytes", () => {
  it("formats bytes", () => {
    ok(formatBytes(512).includes("512 B"));
  });

  it("formats kilobytes", () => {
    ok(formatBytes(2048).includes("KB"));
  });

  it("formats megabytes", () => {
    ok(formatBytes(5 * 1024 * 1024).includes("MB"));
  });

  it("formats gigabytes", () => {
    ok(formatBytes(3 * 1024 * 1024 * 1024).includes("GB"));
  });
});

describe("executeStatus", () => {
  it("output contains version string", async () => {
    const result = await executeStatus(makeCtx(), "");
    ok(result.text.includes("2.5.0"));
  });

  it("output contains uptime", async () => {
    const result = await executeStatus(makeCtx(), "");
    ok(result.text.toLowerCase().includes("uptime"));
  });

  it("output contains disk info", async () => {
    const result = await executeStatus(makeCtx(), "");
    ok(result.text.toLowerCase().includes("disk"));
  });

  it("returns no action", async () => {
    const result = await executeStatus(makeCtx(), "");
    ok(!result.action);
  });
});
