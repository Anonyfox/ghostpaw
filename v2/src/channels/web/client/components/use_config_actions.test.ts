import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { useConfigActions } from "./use_config_actions.ts";

describe("useConfigActions", () => {
  it("returns three handler functions", () => {
    const fakeRef = { current: null };
    const noop = () => {};
    const result = useConfigActions(
      {
        key: "test",
        value: "1",
        type: "number",
        category: "behavior",
        source: "default",
        isDefault: true,
      },
      fakeRef,
      noop,
      noop,
      noop,
      noop,
    );
    ok(typeof result.handleSave === "function");
    ok(typeof result.handleUndo === "function");
    ok(typeof result.handleReset === "function");
  });
});
