import type { DatabaseHandle } from "../../lib/index.ts";
import type { Landmark } from "./types.ts";

const DAY_MS = 86_400_000;
const DEFAULT_DAYS_AHEAD = 14;

function nextOccurrence(monthDay: string, now: Date): Date {
  const [month, day] = monthDay.split("-").map(Number);
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  if (thisYear.getTime() >= startOfDay(now).getTime()) return thisYear;
  return new Date(now.getFullYear() + 1, month - 1, day);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function yearsBetween(earlier: Date, later: Date): number {
  let years = later.getFullYear() - earlier.getFullYear();
  const m = later.getMonth() - earlier.getMonth();
  if (m < 0 || (m === 0 && later.getDate() < earlier.getDate())) years--;
  return years;
}

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function upcomingLandmarks(
  db: DatabaseHandle,
  daysAhead: number = DEFAULT_DAYS_AHEAD,
  now: number = Date.now(),
): Landmark[] {
  const nowDate = new Date(now);
  const cutoff = now + daysAhead * DAY_MS;
  const results: Landmark[] = [];

  const members = db
    .prepare(
      "SELECT id, name, birthday FROM pack_members WHERE status != 'lost' AND birthday IS NOT NULL",
    )
    .all() as { id: number; name: string; birthday: string }[];

  for (const m of members) {
    const parts = m.birthday.match(/^\d{4}-(\d{2}-\d{2})$/);
    if (!parts) continue;
    const next = nextOccurrence(parts[1], nowDate);
    const nextTs = next.getTime();
    if (nextTs <= cutoff) {
      const birthYear = Number.parseInt(m.birthday.slice(0, 4), 10);
      results.push({
        type: "birthday",
        memberId: m.id,
        name: m.name,
        date: formatISO(next),
        daysAway: Math.max(0, Math.round((nextTs - startOfDay(nowDate).getTime()) / DAY_MS)),
        yearsAgo: birthYear > 0 ? yearsBetween(new Date(birthYear, 0, 1), next) : undefined,
      });
    }
  }

  const milestones = db
    .prepare(
      `SELECT i.id, i.member_id, i.summary, i.occurred_at, m.name
       FROM pack_interactions i
       JOIN pack_members m ON m.id = i.member_id
       WHERE i.kind = 'milestone' AND i.occurred_at IS NOT NULL AND m.status != 'lost'`,
    )
    .all() as {
    id: number;
    member_id: number;
    summary: string;
    occurred_at: number;
    name: string;
  }[];

  for (const ms of milestones) {
    const eventDate = new Date(ms.occurred_at);
    const monthDay = `${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
    const next = nextOccurrence(monthDay, nowDate);
    const nextTs = next.getTime();
    if (nextTs > cutoff) continue;
    const yearsAgo = next.getFullYear() - eventDate.getFullYear();
    if (yearsAgo < 1) continue;

    results.push({
      type: "anniversary",
      memberId: ms.member_id,
      name: ms.name,
      date: formatISO(next),
      daysAway: Math.max(0, Math.round((nextTs - startOfDay(nowDate).getTime()) / DAY_MS)),
      yearsAgo,
      summary: ms.summary,
    });
  }

  results.sort((a, b) => a.daysAway - b.daysAway);
  return results;
}
