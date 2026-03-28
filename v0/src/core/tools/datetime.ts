import { createTool, Schema } from "chatoyant";

class DatetimeError extends Error {
  hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.hint = hint;
  }
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface DateInfo {
  iso: string;
  date: string;
  time: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  weekday: string;
  weekNumber: number;
  dayOfYear: number;
  unixMs: number;
  unixS: number;
  timezone: string;
  utcOffset: string;
}

function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

function utcOffsetStr(d: Date): string {
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const m = String(Math.abs(offset) % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function describeDate(d: Date): DateInfo {
  return {
    iso: d.toISOString(),
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
    millisecond: d.getMilliseconds(),
    weekday: WEEKDAYS[d.getDay()],
    weekNumber: isoWeekNumber(d),
    dayOfYear: dayOfYear(d),
    unixMs: d.getTime(),
    unixS: Math.floor(d.getTime() / 1000),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcOffset: utcOffsetStr(d),
  };
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

export function parseDate(input: string): Date {
  const s = input.trim().toLowerCase();

  if (s === "now") return new Date();
  if (s === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (s === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (s === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (n > 1e15)
      throw new DatetimeError(
        "Timestamp too large",
        "Unix timestamps: seconds (10 digits) or milliseconds (13 digits).",
      );
    const d = n > 1e12 ? new Date(n) : new Date(n * 1000);
    if (Number.isNaN(d.getTime()))
      throw new DatetimeError(`Invalid timestamp: ${input}`, "Provide a valid unix timestamp.");
    return d;
  }

  const m = input.trim().match(ISO_DATE_RE);
  if (m) {
    const [, ys, ms, ds, hs, mins, secs] = m;
    const y = Number(ys);
    const mo = Number(ms);
    const day = Number(ds);
    const d = new Date(y, mo - 1, day, Number(hs ?? 0), Number(mins ?? 0), Number(secs ?? 0));

    if (Number.isNaN(d.getTime()))
      throw new DatetimeError(
        `Invalid date components: ${input}`,
        "Check that year, month, and day are valid numbers.",
      );

    if (d.getMonth() + 1 !== mo || d.getDate() !== day) {
      const maxDay = new Date(y, mo, 0).getDate();
      throw new DatetimeError(
        `Invalid date: ${input}`,
        `Month ${mo} in year ${y} has ${maxDay} days, but day ${day} was given.`,
      );
    }
    return d;
  }

  const fallback = new Date(input.trim());
  if (Number.isNaN(fallback.getTime()))
    throw new DatetimeError(
      `Cannot parse '${input}' as a date`,
      "Accepted formats: 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss', unix timestamp, " +
        "or keywords: now, today, yesterday, tomorrow.",
    );
  return fallback;
}

function calendarDiff(earlier: Date, later: Date) {
  let years = later.getFullYear() - earlier.getFullYear();
  let months = later.getMonth() - earlier.getMonth();
  let days = later.getDate() - earlier.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(later.getFullYear(), later.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return { years, months, days };
}

export function computeDiff(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  const abMs = Math.abs(ms);

  const earlier = ms >= 0 ? from : to;
  const later = ms >= 0 ? to : from;
  const cal = calendarDiff(earlier, later);

  const totalSeconds = Math.floor(abMs / 1000);
  const totalMinutes = Math.floor(abMs / 60_000);
  const totalHours = Math.floor(abMs / 3_600_000);
  const totalDays = Math.floor(abMs / 86_400_000);
  const totalWeeks = Math.floor(totalDays / 7);

  const parts: string[] = [];
  if (cal.years > 0) parts.push(`${cal.years} year${cal.years === 1 ? "" : "s"}`);
  if (cal.months > 0) parts.push(`${cal.months} month${cal.months === 1 ? "" : "s"}`);
  if (cal.days > 0) parts.push(`${cal.days} day${cal.days === 1 ? "" : "s"}`);
  if (parts.length === 0) {
    const h = Math.floor(abMs / 3_600_000);
    const mn = Math.floor((abMs % 3_600_000) / 60_000);
    if (h > 0) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
    if (mn > 0) parts.push(`${mn} minute${mn === 1 ? "" : "s"}`);
    if (parts.length === 0) parts.push(`${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`);
  }

  return {
    from: describeDate(from),
    to: describeDate(to),
    direction: (ms > 0 ? "future" : ms < 0 ? "past" : "same") as "future" | "past" | "same",
    calendar: cal,
    total: {
      milliseconds: abMs,
      seconds: totalSeconds,
      minutes: totalMinutes,
      hours: totalHours,
      days: totalDays,
      weeks: totalWeeks,
    },
    readable: parts.join(", "),
  };
}

const UNIT_ALIASES: Record<string, string> = {
  year: "year",
  years: "year",
  month: "month",
  months: "month",
  week: "week",
  weeks: "week",
  day: "day",
  days: "day",
  hour: "hour",
  hours: "hour",
  minute: "minute",
  minutes: "minute",
  second: "second",
  seconds: "second",
  millisecond: "millisecond",
  milliseconds: "millisecond",
  ms: "millisecond",
};

const VALID_UNITS = "years, months, weeks, days, hours, minutes, seconds";

export function addToDate(date: Date, amount: number, rawUnit: string): Date {
  const normalized = UNIT_ALIASES[rawUnit.toLowerCase().trim()];
  if (!normalized)
    throw new DatetimeError(`Unknown time unit '${rawUnit}'`, `Valid units: ${VALID_UNITS}.`);

  const result = new Date(date.getTime());

  switch (normalized) {
    case "year":
      result.setFullYear(result.getFullYear() + amount);
      break;
    case "month":
      result.setMonth(result.getMonth() + amount);
      break;
    case "week":
      result.setDate(result.getDate() + amount * 7);
      break;
    case "day":
      result.setDate(result.getDate() + amount);
      break;
    case "hour":
      result.setHours(result.getHours() + amount);
      break;
    case "minute":
      result.setMinutes(result.getMinutes() + amount);
      break;
    case "second":
      result.setSeconds(result.getSeconds() + amount);
      break;
    case "millisecond":
      result.setMilliseconds(result.getMilliseconds() + amount);
      break;
  }

  if (Number.isNaN(result.getTime()))
    throw new DatetimeError(
      "Date arithmetic produced an invalid result",
      "The resulting date is out of representable range.",
    );

  return result;
}

class DatetimeParams extends Schema {
  operation = Schema.String({
    description:
      "What to do. 'now': current date/time (no other args needed). " +
      "'parse': break down a date string into components. " +
      "'diff': compute the difference between two dates. " +
      "'add': add or subtract time from a date.",
  });
  date = Schema.String({
    description:
      "Primary date. Accepts: 'now', 'today', 'yesterday', 'tomorrow', " +
      "'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss', or a unix timestamp. " +
      "Required for parse, diff, add.",
    optional: true,
  });
  date2 = Schema.String({
    description: "Second date for 'diff'. Same formats as 'date'.",
    optional: true,
  });
  amount = Schema.Integer({
    description:
      "How much time to add (positive) or subtract (negative). " +
      "Required for 'add'. Integer only — for fractions use a smaller unit " +
      "(e.g. 90 minutes instead of 1.5 hours).",
    optional: true,
  });
  unit = Schema.String({
    description: `Time unit for 'add': ${VALID_UNITS}. Required for 'add'.`,
    optional: true,
  });
}

export function createDatetimeTool() {
  return createTool({
    name: "datetime",
    description:
      "Date and time awareness — use this to know what time it is, parse dates, " +
      "compute differences between dates, or do date arithmetic. Every response " +
      "includes comprehensive detail: ISO format, date/time components, weekday, " +
      "week number, unix timestamp, and timezone. " +
      "Operations: 'now', 'parse' (date), 'diff' (date + date2), 'add' (date + amount + unit).",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new DatetimeParams() as any,
    execute: async ({ args }) => {
      const { operation, date, date2, amount, unit } = args as {
        operation: string;
        date?: string;
        date2?: string;
        amount?: number;
        unit?: string;
      };

      try {
        const op = (operation ?? "").toLowerCase().trim();

        switch (op) {
          case "now":
            return describeDate(new Date());

          case "parse": {
            if (!date)
              return {
                error: "Missing 'date' parameter",
                hint: "Provide a date string to parse, e.g. '2024-03-15' or 'today'.",
              };
            return describeDate(parseDate(date));
          }

          case "diff": {
            if (!date || !date2)
              return {
                error: `Missing '${!date ? "date" : "date2"}' parameter`,
                hint: "Both 'date' and 'date2' are required for diff.",
              };
            return computeDiff(parseDate(date), parseDate(date2));
          }

          case "add": {
            if (!date)
              return {
                error: "Missing 'date' parameter",
                hint: "Provide date, amount, and unit. Example: date='today', amount=30, unit='days'.",
              };
            if (amount === undefined || amount === null)
              return {
                error: "Missing 'amount' parameter",
                hint: "Provide an integer. Positive to add, negative to subtract.",
              };
            if (!unit)
              return {
                error: "Missing 'unit' parameter",
                hint: `Provide a time unit: ${VALID_UNITS}.`,
              };
            const base = parseDate(date);
            const result = addToDate(base, amount, unit);
            return {
              original: describeDate(base),
              operation: `${amount >= 0 ? "+" : ""}${amount} ${unit}`,
              result: describeDate(result),
            };
          }

          default:
            return {
              error: op ? `Unknown operation '${op}'` : "Missing 'operation' parameter",
              hint: "Use 'now', 'parse', 'diff', or 'add'.",
            };
        }
      } catch (err) {
        if (err instanceof DatetimeError) return { error: err.message, hint: err.hint };
        return { error: "Operation failed", hint: String(err) };
      }
    },
  });
}
