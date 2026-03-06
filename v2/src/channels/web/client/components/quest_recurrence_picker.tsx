import { useEffect, useState } from "preact/hooks";

type Preset = "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

interface Props {
  value: string | null;
  onChange: (rrule: string | null) => void;
}

interface RecurrenceState {
  preset: Preset;
  interval: number;
  days: boolean[];
  monthDay: number;
  yearMonth: number;
  yearDay: number;
  custom: string;
}

function parseRrule(rrule: string | null): RecurrenceState {
  const base: RecurrenceState = {
    preset: "none",
    interval: 1,
    days: [false, false, false, false, false, false, false],
    monthDay: 1,
    yearMonth: 1,
    yearDay: 1,
    custom: "",
  };

  if (!rrule) return base;

  const parts = new Map<string, string>();
  for (const part of rrule.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) parts.set(part.slice(0, eq), part.slice(eq + 1));
  }

  const freq = parts.get("FREQ");
  const interval = parts.has("INTERVAL") ? Number(parts.get("INTERVAL")) : 1;

  if (freq === "DAILY") {
    return { ...base, preset: "daily", interval };
  }

  if (freq === "WEEKLY") {
    const byday = parts.get("BYDAY");
    if (byday) {
      const codes = byday.split(",");
      const days = DAY_CODES.map((c) => codes.includes(c));
      return { ...base, preset: "weekly", interval, days };
    }
    return { ...base, preset: "weekly", interval };
  }

  if (freq === "MONTHLY") {
    const bymonthday = parts.get("BYMONTHDAY");
    return {
      ...base,
      preset: "monthly",
      interval,
      monthDay: bymonthday ? Number(bymonthday) : 1,
    };
  }

  if (freq === "YEARLY") {
    const bymonth = parts.get("BYMONTH");
    const bymonthday = parts.get("BYMONTHDAY");
    return {
      ...base,
      preset: "yearly",
      interval,
      yearMonth: bymonth ? Number(bymonth) : 1,
      yearDay: bymonthday ? Number(bymonthday) : 1,
    };
  }

  return { ...base, preset: "custom", custom: rrule };
}

function buildRrule(state: RecurrenceState): string | null {
  if (state.preset === "none") return null;

  if (state.preset === "custom") {
    return state.custom.trim() || null;
  }

  const parts: string[] = [];

  if (state.preset === "daily") {
    parts.push("FREQ=DAILY");
    if (state.interval > 1) parts.push(`INTERVAL=${state.interval}`);
  }

  if (state.preset === "weekly") {
    parts.push("FREQ=WEEKLY");
    if (state.interval > 1) parts.push(`INTERVAL=${state.interval}`);
    const selectedDays = DAY_CODES.filter((_, i) => state.days[i]);
    if (selectedDays.length > 0) parts.push(`BYDAY=${selectedDays.join(",")}`);
  }

  if (state.preset === "monthly") {
    parts.push("FREQ=MONTHLY");
    if (state.interval > 1) parts.push(`INTERVAL=${state.interval}`);
    parts.push(`BYMONTHDAY=${state.monthDay}`);
  }

  if (state.preset === "yearly") {
    parts.push("FREQ=YEARLY");
    if (state.interval > 1) parts.push(`INTERVAL=${state.interval}`);
    parts.push(`BYMONTH=${state.yearMonth}`);
    parts.push(`BYMONTHDAY=${state.yearDay}`);
  }

  return parts.join(";");
}

function previewText(state: RecurrenceState): string {
  if (state.preset === "none") return "";
  if (state.preset === "custom") return state.custom || "";

  const every = state.interval > 1 ? `every ${state.interval} ` : "every ";

  if (state.preset === "daily") {
    return state.interval === 1 ? "Every day" : `Every ${state.interval} days`;
  }

  if (state.preset === "weekly") {
    const selected = DAY_LABELS.filter((_, i) => state.days[i]);
    const dayStr = selected.length > 0 ? selected.join(", ") : "week";
    if (selected.length > 0) {
      return state.interval === 1
        ? `Every ${dayStr}`
        : `Every ${state.interval} weeks on ${dayStr}`;
    }
    return `${every}week`;
  }

  if (state.preset === "monthly") {
    const suffix = ordinalSuffix(state.monthDay);
    return state.interval === 1
      ? `Monthly on the ${state.monthDay}${suffix}`
      : `Every ${state.interval} months on the ${state.monthDay}${suffix}`;
  }

  if (state.preset === "yearly") {
    return `Yearly on ${MONTH_NAMES[state.yearMonth - 1]} ${state.yearDay}`;
  }

  return "";
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

export function RecurrencePicker({ value, onChange }: Props) {
  const [state, setState] = useState<RecurrenceState>(() => parseRrule(value));

  useEffect(() => {
    setState(parseRrule(value));
  }, [value]);

  const update = (patch: Partial<RecurrenceState>) => {
    const next = { ...state, ...patch };
    setState(next);
    onChange(buildRrule(next));
  };

  const toggleDay = (idx: number) => {
    const days = [...state.days];
    days[idx] = !days[idx];
    update({ days });
  };

  return (
    <div class="recurrence-picker">
      <div class="d-flex gap-2 align-items-center mb-1">
        <select
          class="form-select form-select-sm"
          style="max-width: 140px;"
          value={state.preset}
          onChange={(e) => {
            const preset = (e.target as HTMLSelectElement).value as Preset;
            const next = { ...state, preset };
            setState(next);
            onChange(buildRrule(next));
          }}
        >
          <option value="none">No recurrence</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom RRULE</option>
        </select>

        {state.preset !== "none" && state.preset !== "custom" && (
          <div class="d-flex align-items-center gap-1">
            <span class="small text-body-secondary">every</span>
            <input
              type="number"
              class="form-control form-control-sm"
              style="width: 60px;"
              min={1}
              max={99}
              value={state.interval}
              onInput={(e) => update({ interval: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })}
            />
            <span class="small text-body-secondary">
              {state.preset === "daily" ? "day(s)" :
               state.preset === "weekly" ? "week(s)" :
               state.preset === "monthly" ? "month(s)" : "year(s)"}
            </span>
          </div>
        )}
      </div>

      {state.preset === "weekly" && (
        <div class="d-flex gap-1 mb-1">
          {DAY_LABELS.map((label, idx) => (
            <button
              key={label}
              type="button"
              class={`btn btn-sm day-toggle ${state.days[idx] ? "active" : "btn-outline-secondary"}`}
              onClick={() => toggleDay(idx)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {state.preset === "monthly" && (
        <div class="d-flex align-items-center gap-1 mb-1">
          <span class="small text-body-secondary">on day</span>
          <input
            type="number"
            class="form-control form-control-sm"
            style="width: 60px;"
            min={1}
            max={31}
            value={state.monthDay}
            onInput={(e) => update({ monthDay: Math.min(31, Math.max(1, Number((e.target as HTMLInputElement).value) || 1)) })}
          />
        </div>
      )}

      {state.preset === "yearly" && (
        <div class="d-flex align-items-center gap-1 mb-1">
          <select
            class="form-select form-select-sm"
            style="max-width: 120px;"
            value={state.yearMonth}
            onChange={(e) => update({ yearMonth: Number((e.target as HTMLSelectElement).value) })}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            class="form-control form-control-sm"
            style="width: 60px;"
            min={1}
            max={31}
            value={state.yearDay}
            onInput={(e) => update({ yearDay: Math.min(31, Math.max(1, Number((e.target as HTMLInputElement).value) || 1)) })}
          />
        </div>
      )}

      {state.preset === "custom" && (
        <input
          type="text"
          class="form-control form-control-sm mb-1"
          placeholder="e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR"
          value={state.custom}
          onInput={(e) => update({ custom: (e.target as HTMLInputElement).value })}
        />
      )}

      {state.preset !== "none" && (
        <div class="preview">{previewText(state)}</div>
      )}
    </div>
  );
}
