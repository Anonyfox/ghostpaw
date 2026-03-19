import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { computeQuestMarker } from "./quest_marker.ts";

describe("computeQuestMarker", () => {
  it("returns yellow ? for done quests", () => {
    deepStrictEqual(computeQuestMarker({ status: "done" }), { symbol: "?", color: "yellow" });
  });

  it("returns yellow ! for offered quests", () => {
    deepStrictEqual(computeQuestMarker({ status: "offered" }), { symbol: "!", color: "yellow" });
  });

  it("returns blue ! for recurring active quests", () => {
    deepStrictEqual(computeQuestMarker({ status: "active", rrule: "FREQ=DAILY" }), {
      symbol: "!",
      color: "blue",
    });
  });

  it("returns grey ? for accepted quests", () => {
    deepStrictEqual(computeQuestMarker({ status: "accepted" }), { symbol: "?", color: "grey" });
  });

  it("returns grey ? for active quests without rrule", () => {
    deepStrictEqual(computeQuestMarker({ status: "active" }), { symbol: "?", color: "grey" });
  });

  it("returns grey ? for blocked quests", () => {
    deepStrictEqual(computeQuestMarker({ status: "blocked" }), { symbol: "?", color: "grey" });
  });

  it("returns null for turned_in quests", () => {
    strictEqual(computeQuestMarker({ status: "turned_in" }), null);
  });

  it("returns null for failed quests", () => {
    strictEqual(computeQuestMarker({ status: "failed" }), null);
  });

  it("returns null for abandoned quests", () => {
    strictEqual(computeQuestMarker({ status: "abandoned" }), null);
  });

  it("returns null for recurring terminal quests", () => {
    strictEqual(computeQuestMarker({ status: "turned_in", rrule: "FREQ=WEEKLY" }), null);
  });
});
