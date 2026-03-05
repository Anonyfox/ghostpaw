import { describe, it } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { parseTrainerOptions } from "./trainer_parse_options.ts";

describe("parseTrainerOptions", () => {
  it("parses well-formatted options", () => {
    const text = [
      "Here is my analysis:",
      "",
      "### Option 1: Add retry logic",
      "The MCP client fails silently on transient errors. Adding retries would fix this.",
      "",
      "### Option 2: Expand edge cases",
      "Several memory entries show edge cases not covered by the skill.",
      "",
      "### Option 3: Compress verbose steps",
      "Steps 4-7 can be merged into two without losing clarity.",
    ].join("\n");

    const opts = parseTrainerOptions(text);
    strictEqual(opts.length, 3);
    deepStrictEqual(opts[0], {
      id: "1",
      title: "Add retry logic",
      description:
        "The MCP client fails silently on transient errors. Adding retries would fix this.",
    });
    strictEqual(opts[1].id, "2");
    strictEqual(opts[2].title, "Compress verbose steps");
  });

  it("falls back to single option for unstructured text", () => {
    const text = "The skill looks good overall but could use some polishing.";
    const opts = parseTrainerOptions(text);
    strictEqual(opts.length, 1);
    strictEqual(opts[0].id, "1");
    strictEqual(opts[0].description, text);
  });

  it("returns empty array for empty input", () => {
    const opts = parseTrainerOptions("");
    strictEqual(opts.length, 0);
  });

  it("handles options with multi-line descriptions", () => {
    const text = [
      "### Option 1: Multi-line improvement",
      "First line of the description.",
      "Second line with more detail.",
      "",
      "### Option 2: Another path",
      "Short description.",
    ].join("\n");

    const opts = parseTrainerOptions(text);
    strictEqual(opts.length, 2);
    strictEqual(opts[0].description.includes("Second line"), true);
  });
});
