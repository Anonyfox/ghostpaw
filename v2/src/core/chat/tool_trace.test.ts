import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import {
  parseToolCallData,
  parseToolResultData,
  serializeToolCallData,
  serializeToolResultData,
} from "./tool_trace.ts";

describe("tool trace serialization", () => {
  it("serializes and parses tool call payloads", () => {
    const raw = serializeToolCallData([{ id: "call_1", name: "read", arguments: "{}" }]);
    deepStrictEqual(parseToolCallData(raw), [{ id: "call_1", name: "read", arguments: "{}" }]);
  });

  it("parses legacy array-shaped tool call payloads", () => {
    const raw = JSON.stringify([{ id: "call_1", name: "read", arguments: "{}" }]);
    deepStrictEqual(parseToolCallData(raw), [{ id: "call_1", name: "read", arguments: "{}" }]);
  });

  it("serializes and parses tool result payloads", () => {
    const raw = serializeToolResultData({
      toolCallId: "call_1",
      success: false,
      error: "boom",
    });
    deepStrictEqual(parseToolResultData(raw), {
      kind: "tool_result",
      toolCallId: "call_1",
      success: false,
      error: "boom",
    });
  });

  it("parses legacy tool result payloads", () => {
    const raw = JSON.stringify({ toolCallId: "call_1" });
    strictEqual(parseToolResultData(raw)?.toolCallId, "call_1");
    strictEqual(parseToolResultData(raw)?.success, null);
  });
});
