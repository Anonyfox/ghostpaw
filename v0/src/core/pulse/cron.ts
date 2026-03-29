const SHORTCUTS: Record<string, string> = {
  "@hourly": "0 * * * *",
  "@daily": "0 0 * * *",
  "@weekly": "0 0 * * 0",
  "@monthly": "0 0 1 * *",
};

const MAX_MINUTES = 4 * 365 * 24 * 60;

function normalizeExpr(expr: string): string {
  const t = expr.trim();
  const shortcut = SHORTCUTS[t];
  return shortcut ?? t;
}

function parseField(field: string, min: number, max: number): (n: number) => boolean {
  const f = field.trim();
  if (f === "*" || f === "?") {
    return () => true;
  }
  if (f.includes(",")) {
    const parts = f.split(",").map((p) => p.trim());
    const matchers = parts.map((p) => parseField(p, min, max));
    return (n: number) => matchers.some((m) => m(n));
  }
  if (f.includes("-")) {
    const [a, b] = f.split("-").map((x) => Number.parseInt(x.trim(), 10));
    if (Number.isNaN(a) || Number.isNaN(b)) {
      throw new Error(`invalid cron range: ${field}`);
    }
    return (n: number) => n >= a && n <= b;
  }
  if (f.startsWith("*/")) {
    const step = Number.parseInt(f.slice(2), 10);
    if (Number.isNaN(step) || step <= 0) {
      throw new Error(`invalid cron step: ${field}`);
    }
    return (n: number) => n % step === 0;
  }
  const num = Number.parseInt(f, 10);
  if (Number.isNaN(num)) {
    throw new Error(`invalid cron field: ${field}`);
  }
  return (n: number) => n === num;
}

function parseDowPart(part: string): (n: number) => boolean {
  let p = part.trim();
  if (p === "7") p = "0";
  if (p.includes("-")) {
    const [a, b] = p.split("-").map((x) => Number.parseInt(x.trim(), 10));
    if (Number.isNaN(a) || Number.isNaN(b)) {
      throw new Error(`invalid cron dow range: ${part}`);
    }
    const a7 = a === 7 ? 0 : a;
    const b7 = b === 7 ? 0 : b;
    return (n: number) => n >= a7 && n <= b7;
  }
  if (p.startsWith("*/")) {
    const step = Number.parseInt(p.slice(2), 10);
    if (Number.isNaN(step) || step <= 0) {
      throw new Error(`invalid cron dow step: ${part}`);
    }
    return (n: number) => n % step === 0;
  }
  const num = Number.parseInt(p, 10);
  if (Number.isNaN(num)) {
    throw new Error(`invalid cron dow: ${part}`);
  }
  const v = num === 7 ? 0 : num;
  return (n: number) => n === v;
}

function parseDowField(field: string): (n: number) => boolean {
  const f = field.trim();
  if (f === "*" || f === "?") {
    return () => true;
  }
  if (f.includes(",")) {
    const parts = f.split(",").map((p) => p.trim());
    const matchers = parts.map((p) => parseDowPart(p));
    return (n: number) => matchers.some((m) => m(n));
  }
  return parseDowPart(f);
}

export interface CronFields {
  minute: (n: number) => boolean;
  hour: (n: number) => boolean;
  month: (n: number) => boolean;
  domPart: string;
  dowPart: string;
  dom: (n: number) => boolean;
  dow: (n: number) => boolean;
}

export function parseCronExpr(expr: string): CronFields {
  const normalized = normalizeExpr(expr);
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length !== 5) {
    throw new Error(`cron must have 5 fields, got ${parts.length}`);
  }
  const [min, hour, dom, month, dow] = parts;
  return {
    minute: parseField(min, 0, 59),
    hour: parseField(hour, 0, 23),
    month: parseField(month, 1, 12),
    domPart: dom.trim(),
    dowPart: dow.trim(),
    dom: parseField(dom, 1, 31),
    dow: parseDowField(dow),
  };
}

function dayMatches(d: Date, fields: CronFields): boolean {
  const dom = d.getDate();
  const dow = d.getDay();
  const domStar = fields.domPart === "*" || fields.domPart === "?";
  const dowStar = fields.dowPart === "*" || fields.dowPart === "?";
  if (domStar && dowStar) return true;
  if (domStar) return fields.dow(dow);
  if (dowStar) return fields.dom(dom);
  return fields.dom(dom) || fields.dow(dow);
}

function dateMatches(d: Date, fields: CronFields): boolean {
  if (!fields.minute(d.getMinutes())) return false;
  if (!fields.hour(d.getHours())) return false;
  if (!fields.month(d.getMonth() + 1)) return false;
  return dayMatches(d, fields);
}

function firstMinuteAfter(after: Date): Date {
  const d = new Date(after.getTime() + 1);
  d.setSeconds(0, 0);
  d.setMilliseconds(0);
  if (d.getTime() <= after.getTime()) {
    d.setMinutes(d.getMinutes() + 1);
  }
  return d;
}

function addOneMinute(d: Date): Date {
  const n = new Date(d.getTime());
  n.setMinutes(n.getMinutes() + 1);
  return n;
}

/**
 * Next cron fire time strictly after `after`, evaluated in local timezone.
 * Throws if no match within ~4 years.
 */
export function nextCronRun(expr: string, after: Date): Date {
  const fields = parseCronExpr(expr);
  let candidate = firstMinuteAfter(after);
  for (let i = 0; i < MAX_MINUTES; i++) {
    if (dateMatches(candidate, fields)) {
      return candidate;
    }
    candidate = addOneMinute(candidate);
  }
  throw new Error("no cron match within 4 years");
}
