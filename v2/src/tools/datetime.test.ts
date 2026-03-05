import { ok, strictEqual, throws } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { addToDate, computeDiff, createDatetimeTool, describeDate, parseDate } from "./datetime.ts";

type ToolResult = Record<string, unknown>;

let execute: (args: Record<string, unknown>) => Promise<ToolResult>;

beforeEach(() => {
  const tool = createDatetimeTool();
  execute = (args) =>
    tool.execute({ args, ctx: { model: "test", provider: "test" } }) as Promise<ToolResult>;
});

// --- Tool interface ---

describe("datetime tool", () => {
  it("has correct metadata", () => {
    const tool = createDatetimeTool();
    strictEqual(tool.name, "datetime");
    ok(tool.description.includes("date"));
    ok(tool.description.includes("time"));
  });

  it("now returns current time info", async () => {
    const before = Date.now();
    const r = await execute({ operation: "now" });
    const after = Date.now();
    ok(typeof r.iso === "string");
    ok(typeof r.weekday === "string");
    ok(typeof r.timezone === "string");
    ok((r.unixMs as number) >= before && (r.unixMs as number) <= after);
  });

  it("parse returns date info", async () => {
    const r = await execute({ operation: "parse", date: "2024-03-15" });
    strictEqual(r.year, 2024);
    strictEqual(r.month, 3);
    strictEqual(r.day, 15);
    strictEqual(r.weekday, "Friday");
  });

  it("diff returns comprehensive result", async () => {
    const r = await execute({ operation: "diff", date: "2024-01-01", date2: "2024-07-01" });
    ok(typeof r.readable === "string");
    ok(typeof r.direction === "string");
    ok(r.calendar !== undefined);
    ok(r.total !== undefined);
  });

  it("add returns original and result", async () => {
    const r = await execute({
      operation: "add",
      date: "2024-01-15",
      amount: 30,
      unit: "days",
    });
    ok(r.original !== undefined);
    ok(r.result !== undefined);
    const result = r.result as Record<string, unknown>;
    strictEqual(result.year, 2024);
    strictEqual(result.month, 2);
    strictEqual(result.day, 14);
  });

  it("returns error for unknown operation", async () => {
    const r = await execute({ operation: "foo" });
    ok(typeof r.error === "string");
    ok(typeof r.hint === "string");
  });

  it("returns error for missing operation", async () => {
    const r = await execute({ operation: "" });
    ok(typeof r.error === "string");
  });

  it("returns error for missing date in parse", async () => {
    const r = await execute({ operation: "parse" });
    ok(typeof r.error === "string");
  });

  it("returns error for missing date2 in diff", async () => {
    const r = await execute({ operation: "diff", date: "2024-01-01" });
    ok(typeof r.error === "string");
    ok((r.error as string).includes("date2"));
  });

  it("returns error for missing amount in add", async () => {
    const r = await execute({ operation: "add", date: "2024-01-01", unit: "days" });
    ok(typeof r.error === "string");
    ok((r.error as string).includes("amount"));
  });

  it("returns error for missing unit in add", async () => {
    const r = await execute({ operation: "add", date: "2024-01-01", amount: 5 });
    ok(typeof r.error === "string");
    ok((r.error as string).includes("unit"));
  });
});

// --- describeDate ---

describe("describeDate", () => {
  it("returns all fields for a known date", () => {
    const d = new Date(2024, 2, 15, 14, 30, 45, 123);
    const info = describeDate(d);
    strictEqual(info.year, 2024);
    strictEqual(info.month, 3);
    strictEqual(info.day, 15);
    strictEqual(info.hour, 14);
    strictEqual(info.minute, 30);
    strictEqual(info.second, 45);
    strictEqual(info.millisecond, 123);
    strictEqual(info.weekday, "Friday");
    strictEqual(info.date, "2024-03-15");
    strictEqual(info.time, "14:30:45");
    ok(typeof info.iso === "string");
    ok(typeof info.weekNumber === "number");
    ok(typeof info.dayOfYear === "number");
    ok(typeof info.timezone === "string");
    ok(typeof info.utcOffset === "string");
    strictEqual(info.unixMs, d.getTime());
    strictEqual(info.unixS, Math.floor(d.getTime() / 1000));
  });

  it("pads single-digit components", () => {
    const d = new Date(2024, 0, 5, 3, 7, 9);
    const info = describeDate(d);
    strictEqual(info.date, "2024-01-05");
    strictEqual(info.time, "03:07:09");
  });
});

// --- parseDate ---

describe("parseDate", () => {
  it("parses 'now' to current time", () => {
    const before = Date.now();
    const d = parseDate("now");
    ok(d.getTime() >= before && d.getTime() <= Date.now());
  });

  it("parses 'today' to midnight", () => {
    const d = parseDate("today");
    const now = new Date();
    strictEqual(d.getFullYear(), now.getFullYear());
    strictEqual(d.getMonth(), now.getMonth());
    strictEqual(d.getDate(), now.getDate());
    strictEqual(d.getHours(), 0);
    strictEqual(d.getMinutes(), 0);
  });

  it("parses 'yesterday'", () => {
    const d = parseDate("yesterday");
    const expected = new Date();
    expected.setDate(expected.getDate() - 1);
    strictEqual(d.getDate(), expected.getDate());
    strictEqual(d.getHours(), 0);
  });

  it("parses 'tomorrow'", () => {
    const d = parseDate("tomorrow");
    const expected = new Date();
    expected.setDate(expected.getDate() + 1);
    strictEqual(d.getDate(), expected.getDate());
    strictEqual(d.getHours(), 0);
  });

  it("is case-insensitive for keywords", () => {
    const d = parseDate("TODAY");
    strictEqual(d.getHours(), 0);
  });

  it("parses YYYY-MM-DD", () => {
    const d = parseDate("2024-03-15");
    strictEqual(d.getFullYear(), 2024);
    strictEqual(d.getMonth(), 2);
    strictEqual(d.getDate(), 15);
  });

  it("parses YYYY-MM-DDTHH:mm:ss", () => {
    const d = parseDate("2024-03-15T14:30:45");
    strictEqual(d.getHours(), 14);
    strictEqual(d.getMinutes(), 30);
    strictEqual(d.getSeconds(), 45);
  });

  it("parses YYYY-MM-DD HH:mm:ss (space separator)", () => {
    const d = parseDate("2024-03-15 14:30:45");
    strictEqual(d.getHours(), 14);
    strictEqual(d.getMinutes(), 30);
  });

  it("parses YYYY-MM-DD HH:mm (no seconds)", () => {
    const d = parseDate("2024-03-15 14:30");
    strictEqual(d.getHours(), 14);
    strictEqual(d.getMinutes(), 30);
    strictEqual(d.getSeconds(), 0);
  });

  it("parses unix seconds", () => {
    const d = parseDate("1710513600");
    ok(d.getFullYear() >= 2024);
  });

  it("parses unix milliseconds", () => {
    const d = parseDate("1710513600000");
    ok(d.getFullYear() >= 2024);
  });

  it("rejects invalid date like Feb 30", () => {
    throws(() => parseDate("2024-02-30"), /Invalid date.*30/);
  });

  it("accepts Feb 29 in leap year", () => {
    const d = parseDate("2024-02-29");
    strictEqual(d.getDate(), 29);
  });

  it("rejects Feb 29 in non-leap year", () => {
    throws(() => parseDate("2023-02-29"), /Invalid date/);
  });

  it("rejects unparseable string", () => {
    throws(() => parseDate("not-a-date"), /Cannot parse/);
  });

  it("rejects absurdly large timestamp", () => {
    throws(() => parseDate("99999999999999999"), /too large/);
  });
});

// --- computeDiff ---

describe("computeDiff", () => {
  it("computes diff between two dates", () => {
    const from = new Date(2024, 0, 1);
    const to = new Date(2024, 6, 1);
    const diff = computeDiff(from, to);
    strictEqual(diff.direction, "future");
    strictEqual(diff.calendar.years, 0);
    strictEqual(diff.calendar.months, 6);
    strictEqual(diff.calendar.days, 0);
    ok(diff.total.days >= 181 && diff.total.days <= 182);
    strictEqual(diff.readable, "6 months");
  });

  it("handles reverse direction", () => {
    const from = new Date(2024, 6, 1);
    const to = new Date(2024, 0, 1);
    const diff = computeDiff(from, to);
    strictEqual(diff.direction, "past");
    strictEqual(diff.calendar.months, 6);
  });

  it("handles same date", () => {
    const d = new Date(2024, 0, 1);
    const diff = computeDiff(d, d);
    strictEqual(diff.direction, "same");
    strictEqual(diff.total.seconds, 0);
    ok(diff.readable.includes("0"));
  });

  it("handles multi-year diff", () => {
    const from = new Date(2020, 0, 1);
    const to = new Date(2024, 6, 15);
    const diff = computeDiff(from, to);
    strictEqual(diff.calendar.years, 4);
    strictEqual(diff.calendar.months, 6);
    strictEqual(diff.calendar.days, 14);
  });

  it("handles sub-day diff", () => {
    const from = new Date(2024, 0, 1, 10, 0, 0);
    const to = new Date(2024, 0, 1, 13, 30, 0);
    const diff = computeDiff(from, to);
    ok(diff.readable.includes("3 hours"));
    ok(diff.readable.includes("30 minutes"));
  });
});

// --- addToDate ---

describe("addToDate", () => {
  it("adds days", () => {
    const base = new Date(2024, 0, 15);
    const result = addToDate(base, 30, "days");
    strictEqual(result.getMonth(), 1);
    strictEqual(result.getDate(), 14);
  });

  it("subtracts days with negative amount", () => {
    const base = new Date(2024, 0, 15);
    const result = addToDate(base, -10, "days");
    strictEqual(result.getDate(), 5);
  });

  it("adds months", () => {
    const base = new Date(2024, 0, 15);
    const result = addToDate(base, 1, "month");
    strictEqual(result.getMonth(), 1);
    strictEqual(result.getDate(), 15);
  });

  it("adding month to month-end overflows correctly", () => {
    const base = new Date(2024, 0, 31);
    const result = addToDate(base, 1, "month");
    ok(result.getMonth() >= 1);
  });

  it("adds years", () => {
    const base = new Date(2024, 2, 15);
    const result = addToDate(base, 2, "years");
    strictEqual(result.getFullYear(), 2026);
  });

  it("adds weeks", () => {
    const base = new Date(2024, 0, 1);
    const result = addToDate(base, 2, "weeks");
    strictEqual(result.getDate(), 15);
  });

  it("adds hours", () => {
    const base = new Date(2024, 0, 1, 10, 0, 0);
    const result = addToDate(base, 5, "hours");
    strictEqual(result.getHours(), 15);
  });

  it("adds minutes", () => {
    const base = new Date(2024, 0, 1, 10, 0, 0);
    const result = addToDate(base, 90, "minutes");
    strictEqual(result.getHours(), 11);
    strictEqual(result.getMinutes(), 30);
  });

  it("adds seconds", () => {
    const base = new Date(2024, 0, 1, 10, 0, 0);
    const result = addToDate(base, 3661, "seconds");
    strictEqual(result.getHours(), 11);
    strictEqual(result.getMinutes(), 1);
    strictEqual(result.getSeconds(), 1);
  });

  it("accepts 'ms' alias for milliseconds", () => {
    const base = new Date(2024, 0, 1);
    const result = addToDate(base, 500, "ms");
    strictEqual(result.getMilliseconds(), 500);
  });

  it("does not mutate the original date", () => {
    const base = new Date(2024, 0, 15);
    const originalTime = base.getTime();
    addToDate(base, 30, "days");
    strictEqual(base.getTime(), originalTime);
  });

  it("rejects unknown unit", () => {
    throws(() => addToDate(new Date(), 5, "fortnights"), /Unknown time unit/);
  });
});
