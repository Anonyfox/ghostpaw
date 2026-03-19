import { deepStrictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRRuleInterval } from "./rrule_interval.ts";

describe("parseRRuleInterval", () => {
  it("parses FREQ=DAILY", () => {
    deepStrictEqual(parseRRuleInterval("FREQ=DAILY"), 86_400_000);
  });

  it("parses FREQ=WEEKLY", () => {
    deepStrictEqual(parseRRuleInterval("FREQ=WEEKLY"), 604_800_000);
  });

  it("parses FREQ=WEEKLY with BYDAY reducing interval", () => {
    const result = parseRRuleInterval("FREQ=WEEKLY;BYDAY=MO,WE,FR");
    deepStrictEqual(result, Math.floor(604_800_000 / 3));
  });

  it("parses FREQ=WEEKLY with single BYDAY as full week", () => {
    deepStrictEqual(parseRRuleInterval("FREQ=WEEKLY;BYDAY=MO"), 604_800_000);
  });

  it("parses FREQ=MONTHLY", () => {
    deepStrictEqual(parseRRuleInterval("FREQ=MONTHLY"), 2_592_000_000);
  });

  it("parses FREQ=YEARLY", () => {
    deepStrictEqual(parseRRuleInterval("FREQ=YEARLY"), 31_536_000_000);
  });

  it("parses complex RRULE with COUNT", () => {
    deepStrictEqual(parseRRuleInterval("FREQ=DAILY;COUNT=10"), 86_400_000);
  });

  it("parses RRULE with UNTIL", () => {
    deepStrictEqual(parseRRuleInterval("FREQ=WEEKLY;UNTIL=20260401T000000Z"), 604_800_000);
  });

  it("throws for missing FREQ", () => {
    throws(() => parseRRuleInterval("BYDAY=MO"), /Cannot parse FREQ/);
  });

  it("throws for unsupported FREQ", () => {
    throws(() => parseRRuleInterval("FREQ=SECONDLY"), /Unsupported FREQ/);
  });
});
