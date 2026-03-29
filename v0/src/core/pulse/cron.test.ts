import assert from "node:assert";
import { describe, it } from "node:test";
import { nextCronRun, parseCronExpr } from "./cron.ts";

describe("nextCronRun", () => {
  it("returns next minute for every-minute", () => {
    const after = new Date("2026-03-15T10:30:00.000");
    const next = nextCronRun("* * * * *", after);
    assert.strictEqual(next.getMinutes(), 31);
    assert.strictEqual(next.getHours(), 10);
  });

  it("is strictly after the given date, never equal", () => {
    const exact = new Date("2026-03-15T09:00:00.000");
    const next = nextCronRun("0 9 * * *", exact);
    assert.ok(next.getTime() > exact.getTime());
    assert.strictEqual(next.getDate(), 16);
  });

  it("handles step values (*/15)", () => {
    const after = new Date("2026-03-15T10:14:00.000");
    const next = nextCronRun("*/15 * * * *", after);
    assert.strictEqual(next.getMinutes(), 15);
  });

  it("handles comma-separated values", () => {
    const after = new Date("2026-03-15T10:06:00.000");
    const next = nextCronRun("0,15,30,45 * * * *", after);
    assert.strictEqual(next.getMinutes(), 15);
  });

  it("handles ranges", () => {
    const after = new Date("2026-03-15T18:00:00.000");
    const next = nextCronRun("0 9-17 * * *", after);
    assert.strictEqual(next.getDate(), 16);
    assert.strictEqual(next.getHours(), 9);
  });

  it("@hourly fires at minute 0 of next hour", () => {
    const after = new Date("2026-03-15T10:30:45.000");
    const next = nextCronRun("@hourly", after);
    assert.strictEqual(next.getMinutes(), 0);
    assert.strictEqual(next.getHours(), 11);
  });

  it("@daily fires at midnight next day", () => {
    const after = new Date("2026-03-15T10:00:00.000");
    const next = nextCronRun("@daily", after);
    assert.strictEqual(next.getDate(), 16);
    assert.strictEqual(next.getHours(), 0);
    assert.strictEqual(next.getMinutes(), 0);
  });

  it("@weekly fires on Sunday", () => {
    const after = new Date("2026-03-15T12:00:00.000");
    const next = nextCronRun("@weekly", after);
    assert.strictEqual(next.getDay(), 0);
  });

  it("@monthly fires on 1st at midnight", () => {
    const after = new Date("2026-03-15T10:00:00.000");
    const next = nextCronRun("@monthly", after);
    assert.strictEqual(next.getDate(), 1);
    assert.strictEqual(next.getMonth(), 3);
    assert.strictEqual(next.getHours(), 0);
  });

  it("matches specific cron 0 9 * * *", () => {
    const after = new Date("2026-03-15T08:00:00.000");
    const next = nextCronRun("0 9 * * *", after);
    assert.strictEqual(next.getHours(), 9);
    assert.strictEqual(next.getMinutes(), 0);
    assert.strictEqual(next.getDate(), 15);
  });

  it("treats dow=7 as Sunday (0)", () => {
    const after = new Date("2026-03-16T00:00:00.000");
    const next = nextCronRun("0 0 * * 7", after);
    assert.strictEqual(next.getDay(), 0);
  });

  it("dom/dow union: either match fires", () => {
    const after = new Date("2026-03-14T00:00:00.000");
    const next = nextCronRun("0 0 15 * 1", after);
    const dom = next.getDate();
    const dow = next.getDay();
    assert.ok(dom === 15 || dow === 1, `expected dom=15 or dow=1, got dom=${dom} dow=${dow}`);
  });

  it("throws on malformed expression", () => {
    assert.throws(() => nextCronRun("not enough", new Date()), /5 fields/);
  });

  it("throws on invalid step value", () => {
    assert.throws(() => nextCronRun("*/0 * * * *", new Date()), /invalid cron step/);
  });

  it("throws on non-numeric field", () => {
    assert.throws(() => nextCronRun("abc * * * *", new Date()), /invalid cron field/);
  });

  it("throws when no match in 4 years for impossible combo", () => {
    assert.throws(() => nextCronRun("0 0 31 2 *", new Date("2026-01-01T00:00:00.000")), /4 years/);
  });
});

describe("parseCronExpr", () => {
  it("parses 5 fields correctly", () => {
    const f = parseCronExpr("30 9 15 6 3");
    assert.strictEqual(f.minute(30), true);
    assert.strictEqual(f.minute(0), false);
    assert.strictEqual(f.hour(9), true);
    assert.strictEqual(f.hour(10), false);
    assert.strictEqual(f.month(6), true);
    assert.strictEqual(f.month(7), false);
  });

  it("? is treated as wildcard", () => {
    const f = parseCronExpr("0 0 ? * ?");
    assert.strictEqual(f.domPart, "?");
    assert.strictEqual(f.dowPart, "?");
  });
});
