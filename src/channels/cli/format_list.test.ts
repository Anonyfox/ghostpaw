import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { setSecret } from "../../core/secrets/api/write/index.ts";
import { initSecretsTable } from "../../core/secrets/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { formatSecretsList } from "./format_list.ts";

let db: DatabaseHandle;

const ENV_KEYS = [
  "BRAVE_API_KEY",
  "TAVILY_API_KEY",
  "SERPER_API_KEY",
  "MY_TEST_KEY",
  "CUSTOM_A",
  "CUSTOM_B",
];
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
  db = await openTestDatabase();
  initSecretsTable(db);
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  db.close();
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("formatSecretsList", () => {
  it("returns lines for empty store without throwing", () => {
    const lines = formatSecretsList(db);
    ok(Array.isArray(lines));
    ok(lines.length > 0);
  });

  it("shows checkmark for configured keys", () => {
    setSecret(db, "TAVILY_API_KEY", "tvly-test");
    const lines = formatSecretsList(db);
    const tavilyLine = lines.find((l) => l.includes("Tavily"));
    ok(tavilyLine);
  });

  it("shows custom keys section when non-provider keys exist", () => {
    setSecret(db, "MY_TEST_KEY", "custom-val");
    const lines = formatSecretsList(db);
    const customLine = lines.find((l) => l.includes("MY_TEST_KEY"));
    ok(customLine);
  });

  it("marks active search provider", () => {
    setSecret(db, "BRAVE_API_KEY", "BSAtest");
    const lines = formatSecretsList(db);
    const braveLine = lines.find((l) => l.includes("Brave"));
    ok(braveLine);
  });

  it("shows DDG fallback hint when no search provider is configured", () => {
    const lines = formatSecretsList(db);
    const ddgLine = lines.find((l) => l.includes("DDG"));
    ok(ddgLine);
  });

  it("hides DDG fallback hint when a search provider is configured", () => {
    setSecret(db, "BRAVE_API_KEY", "BSAtest");
    const lines = formatSecretsList(db);
    const ddgLine = lines.find((l) => l.includes("DDG"));
    strictEqual(ddgLine, undefined);
  });

  it("includes a usage hint", () => {
    const lines = formatSecretsList(db);
    const hint = lines.find((l) => l.includes("ghostpaw secrets set"));
    ok(hint);
  });

  it("lists multiple custom keys sorted", () => {
    setSecret(db, "CUSTOM_A", "a");
    setSecret(db, "CUSTOM_B", "b");
    const lines = formatSecretsList(db);
    const aIdx = lines.findIndex((l) => l.includes("CUSTOM_A"));
    const bIdx = lines.findIndex((l) => l.includes("CUSTOM_B"));
    ok(aIdx > -1);
    ok(bIdx > aIdx);
  });
});
