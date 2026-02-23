import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";

import {
  BudgetExceededError,
  ConfigError,
  DatabaseError,
  GhostpawError,
  ProviderError,
  ToolError,
  ValidationError,
} from "./errors.js";

describe("GhostpawError", () => {
  it("is an instance of Error", () => {
    const err = new GhostpawError("ERR_UNKNOWN", "something broke");
    ok(err instanceof Error);
    ok(err instanceof GhostpawError);
  });

  it("stores code, message, and name", () => {
    const err = new GhostpawError("ERR_UNKNOWN", "test message");
    strictEqual(err.code, "ERR_UNKNOWN");
    strictEqual(err.message, "test message");
    strictEqual(err.name, "GhostpawError");
  });

  it("preserves the cause when provided", () => {
    const cause = new TypeError("original");
    const err = new GhostpawError("ERR_UNKNOWN", "wrapped", { cause });
    strictEqual(err.cause, cause);
  });

  it("includes hint when provided", () => {
    const err = new GhostpawError("ERR_UNKNOWN", "oops", { hint: "try this" });
    strictEqual(err.hint, "try this");
  });

  it("produces a useful formatted string", () => {
    const err = new GhostpawError("ERR_CONFIG", "bad config", { hint: "check config.json" });
    const str = err.format();
    ok(str.includes("ERR_CONFIG"));
    ok(str.includes("bad config"));
    ok(str.includes("check config.json"));
  });

  it("format() works without hint", () => {
    const err = new GhostpawError("ERR_UNKNOWN", "fail");
    const str = err.format();
    ok(str.includes("ERR_UNKNOWN"));
    ok(str.includes("fail"));
    ok(!str.includes("Hint"));
  });

  it("has a proper stack trace", () => {
    const err = new GhostpawError("ERR_UNKNOWN", "traced");
    ok(typeof err.stack === "string");
    ok(err.stack!.includes("errors.test.ts"));
  });

  it("toJSON returns structured data", () => {
    const err = new GhostpawError("ERR_CONFIG", "bad", { hint: "fix it" });
    const json = err.toJSON();
    deepStrictEqual(json, {
      name: "GhostpawError",
      code: "ERR_CONFIG",
      message: "bad",
      hint: "fix it",
    });
  });

  it("toJSON omits hint when not set", () => {
    const json = new GhostpawError("ERR_UNKNOWN", "x").toJSON();
    strictEqual(json.hint, undefined);
  });
});

describe("ConfigError", () => {
  it("has ERR_CONFIG code and correct name", () => {
    const err = new ConfigError("missing api key");
    strictEqual(err.code, "ERR_CONFIG");
    strictEqual(err.name, "ConfigError");
    ok(err instanceof GhostpawError);
    ok(err instanceof ConfigError);
  });

  it("accepts hint and cause", () => {
    const cause = new Error("fs error");
    const err = new ConfigError("read failed", { cause, hint: "check permissions" });
    strictEqual(err.cause, cause);
    strictEqual(err.hint, "check permissions");
  });
});

describe("DatabaseError", () => {
  it("has ERR_DATABASE code and correct name", () => {
    const err = new DatabaseError("table missing");
    strictEqual(err.code, "ERR_DATABASE");
    strictEqual(err.name, "DatabaseError");
    ok(err instanceof GhostpawError);
  });
});

describe("ToolError", () => {
  it("has ERR_TOOL code, stores tool name", () => {
    const err = new ToolError("read", "file not found");
    strictEqual(err.code, "ERR_TOOL");
    strictEqual(err.name, "ToolError");
    strictEqual(err.toolName, "read");
    ok(err instanceof GhostpawError);
  });

  it("includes tool name in formatted output", () => {
    const err = new ToolError("bash", "timeout", { hint: "increase limit" });
    const str = err.format();
    ok(str.includes("bash"));
    ok(str.includes("timeout"));
  });

  it("toJSON includes toolName", () => {
    const json = new ToolError("edit", "no match").toJSON();
    strictEqual(json.toolName, "edit");
  });
});

describe("BudgetExceededError", () => {
  it("has ERR_BUDGET code, stores usage and limit", () => {
    const err = new BudgetExceededError(150_000, 100_000);
    strictEqual(err.code, "ERR_BUDGET");
    strictEqual(err.name, "BudgetExceededError");
    strictEqual(err.usage, 150_000);
    strictEqual(err.limit, 100_000);
    ok(err instanceof GhostpawError);
  });

  it("has a descriptive message", () => {
    const err = new BudgetExceededError(200_000, 100_000);
    ok(err.message.includes("200000"));
    ok(err.message.includes("100000"));
  });

  it("toJSON includes usage and limit", () => {
    const json = new BudgetExceededError(50, 40).toJSON();
    strictEqual(json.usage, 50);
    strictEqual(json.limit, 40);
  });
});

describe("ProviderError", () => {
  it("has ERR_PROVIDER code, stores provider and statusCode", () => {
    const err = new ProviderError("anthropic", "rate limited", { statusCode: 429 });
    strictEqual(err.code, "ERR_PROVIDER");
    strictEqual(err.name, "ProviderError");
    strictEqual(err.provider, "anthropic");
    strictEqual(err.statusCode, 429);
    ok(err instanceof GhostpawError);
  });

  it("statusCode is optional", () => {
    const err = new ProviderError("openai", "network error");
    strictEqual(err.statusCode, undefined);
  });

  it("includes provider in format output", () => {
    const str = new ProviderError("xai", "fail", { statusCode: 500 }).format();
    ok(str.includes("xai"));
    ok(str.includes("fail"));
  });

  it("toJSON includes provider and statusCode", () => {
    const json = new ProviderError("openai", "err", { statusCode: 401 }).toJSON();
    strictEqual(json.provider, "openai");
    strictEqual(json.statusCode, 401);
  });
});

describe("ValidationError", () => {
  it("has ERR_VALIDATION code, stores field and value", () => {
    const err = new ValidationError("temperature", 5, "must be between 0 and 2");
    strictEqual(err.code, "ERR_VALIDATION");
    strictEqual(err.name, "ValidationError");
    strictEqual(err.field, "temperature");
    strictEqual(err.value, 5);
    ok(err instanceof GhostpawError);
  });

  it("produces a clear message", () => {
    const err = new ValidationError("model", "", "cannot be empty");
    ok(err.message.includes("model"));
    ok(err.message.includes("cannot be empty"));
  });

  it("toJSON includes field", () => {
    const json = new ValidationError("x", null, "bad").toJSON();
    strictEqual(json.field, "x");
  });
});
