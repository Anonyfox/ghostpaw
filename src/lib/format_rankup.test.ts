import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { formatRankUp } from "./format_rankup.ts";

describe("formatRankUp", () => {
  it("formats rank 1 as Apprentice", () => {
    const result = formatRankUp("deploy", 1);
    ok(result.includes("Apprentice"));
    ok(result.includes("deploy"));
    ok(result.includes("rank 1"));
  });

  it("formats rank 10 as Master", () => {
    strictEqual(formatRankUp("testing", 10), "testing reached Master (rank 10)");
  });

  it("formats rank 0 as Uncheckpointed", () => {
    ok(formatRankUp("new-skill", 0).includes("Uncheckpointed"));
  });
});
