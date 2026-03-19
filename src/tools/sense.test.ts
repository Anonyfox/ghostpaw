import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createSenseTool } from "./sense.ts";

type ToolResult = Record<string, unknown>;

let execute: (args: Record<string, unknown>) => Promise<ToolResult>;

beforeEach(() => {
  const tool = createSenseTool();
  execute = (args) =>
    tool.execute({ args, ctx: { model: "test", provider: "test" } }) as Promise<ToolResult>;
});

describe("sense tool", () => {
  it("has correct metadata", () => {
    const tool = createSenseTool();
    strictEqual(tool.name, "sense");
    ok(tool.description.length > 20);
    ok(tool.description.includes("status"));
    ok(tool.description.includes("ok"));
    ok(tool.description.includes("attention"));
  });

  it("returns a complete reading for prose text", async () => {
    const text = [
      "The system processes incoming requests through a series of well-defined stages.",
      "Each stage validates the data according to established protocols.",
      "The validated data is then passed to the next processing component.",
      "This component transforms the data into the required output format.",
      "The output is cached for subsequent retrieval by downstream consumers.",
      "Logging occurs at each stage to maintain an audit trail.",
      "Error handling follows a consistent pattern across all processing stages.",
    ].join(" ");

    const result = await execute({ text });
    ok(typeof result.status === "string");
    ok(result.status === "ok" || result.status === "attention");
    ok(typeof result.state === "string");
    ok(typeof result.confidence === "string");
    ok(typeof result.metrics === "object");
    ok(typeof result.textInfo === "object");
    ok(!("assessment" in result));
  });

  it("returns insufficient for very short text", async () => {
    const result = await execute({ text: "Hello." });
    strictEqual(result.state, "insufficient");
    strictEqual(result.status, "ok");
  });

  it("returns error for empty text", async () => {
    const result = await execute({ text: "" });
    ok(typeof result.error === "string");
  });

  it("returns error for whitespace-only text", async () => {
    const result = await execute({ text: "   " });
    ok(typeof result.error === "string");
  });

  it("accepts previous reading JSON for velocity", async () => {
    const text1 = [
      "The system processes incoming requests through a series of well-defined stages.",
      "Each stage validates the data according to established protocols.",
      "The validated data is then passed to the next processing component.",
      "This component transforms the data into the required output format.",
      "The output is cached for subsequent retrieval by downstream consumers.",
    ].join(" ");

    const text2 = [
      "I'm not sure this approach is right.",
      "Something doesn't fit in the architecture.",
      "The obvious answer isn't the real one here.",
      "What if we're wrong about the premise entirely?",
      "Not the surface problem — the thing underneath it.",
    ].join(" ");

    const first = await execute({ text: text1 });
    const second = await execute({
      text: text2,
      previous: JSON.stringify(first),
    });

    ok(second.velocity !== undefined);
    const vel = second.velocity as Record<string, unknown>;
    ok(typeof vel.speed === "number");
    ok(typeof vel.trajectory === "string");
    ok(typeof vel.dominant === "string");
  });

  it("returns error for invalid previous JSON", async () => {
    const result = await execute({
      text: "Some text that is long enough for basic measurement at minimum.",
      previous: "not valid json {{{",
    });
    ok(typeof result.error === "string");
    ok((result.error as string).includes("Invalid JSON"));
  });

  it("ignores previous when it lacks metrics", async () => {
    const result = await execute({
      text: [
        "The system processes incoming requests through a series of well-defined stages.",
        "Each stage validates the data according to established protocols.",
        "The validated data is then passed to the next processing component.",
        "This component transforms the data into the required output format.",
        "The output is cached for subsequent retrieval by downstream consumers.",
      ].join(" "),
      previous: JSON.stringify({ foo: "bar" }),
    });
    strictEqual(result.velocity, undefined);
  });
});
