import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { compressionRatio } from "./compression_ratio.ts";

describe("compressionRatio", () => {
  it("returns a value between 0 and 2 for normal text", async () => {
    const ratio = await compressionRatio("The quick brown fox jumps over the lazy dog.");
    ok(ratio > 0 && ratio < 2);
  });

  it("returns lower ratio for repetitive text", async () => {
    const repetitive = "the the the the the ".repeat(50);
    const varied = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
    ok((await compressionRatio(repetitive)) < (await compressionRatio(varied)));
  });

  it("returns 0 for empty input", async () => {
    strictEqual(await compressionRatio(""), 0);
  });
});
