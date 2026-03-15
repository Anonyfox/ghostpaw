import { style } from "../../lib/terminal/index.ts";

export function parseTimestamp(input: string): number {
  const num = Number(input);
  if (Number.isFinite(num) && num > 1_000_000_000_000) return num;
  const ms = new Date(input).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`Cannot parse timestamp: "${input}". Use ISO 8601 or unix ms.`);
  }
  return ms;
}

export function formatDate(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19);
}

export function relativeAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(Math.abs(diff) / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function relativeDue(ts: number): string {
  const diff = ts - Date.now();
  if (diff < 0) return style.boldRed("overdue!");
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h left`;
  const days = Math.floor(hrs / 24);
  return `${days}d left`;
}

export function priorityDot(priority: string): string {
  if (priority === "urgent") return style.boldRed("!");
  if (priority === "high") return style.yellow("!");
  return style.dim("·");
}

export function statusLabel(status: string): string {
  switch (status) {
    case "offered":
      return style.yellow(status);
    case "active":
      return style.cyan(status);
    case "done":
      return style.green(status);
    case "failed":
    case "cancelled":
      return style.dim(status);
    case "blocked":
      return style.yellow(status);
    default:
      return status;
  }
}

export function boardIcon(createdBy: string): string {
  return createdBy === "ghostpaw" ? style.yellow("!") : style.yellow("?");
}

export function progressBar(done: number, total: number, width = 10): string {
  if (total === 0) return `${"░".repeat(width)} 0/0`;
  const filled = Math.round((done / total) * width);
  const empty = width - filled;
  return `${"█".repeat(filled)}${"░".repeat(empty)} ${done}/${total}`;
}

export function questRow(q: {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueAt: number | null;
  questLogId: number | null;
  createdAt: number;
}): string {
  const id = String(q.id).padStart(5);
  const dot = priorityDot(q.priority);
  const title = q.title.length > 28 ? `${q.title.slice(0, 27)}…` : q.title.padEnd(28);
  const statusPad = q.status.padEnd(10);
  const due = q.dueAt ? relativeDue(q.dueAt).padStart(10) : "".padStart(10);
  const log = q.questLogId ? style.dim(`#${q.questLogId}`.padStart(5)) : "".padStart(5);
  const age = style.dim(relativeAge(q.createdAt).padStart(4));
  return `${style.dim(id)} ${dot} ${title} ${statusLabel(statusPad)} ${due} ${log} ${age}`;
}

export function questTableHeader(): string {
  const header = `${"ID".padStart(5)}   ${"Title".padEnd(28)} ${"Status".padEnd(10)} ${"Due".padStart(10)} ${"Log".padStart(5)} ${"Age".padStart(4)}`;
  return `${style.dim(header)}\n${style.dim("─".repeat(72))}`;
}

export function errorLine(msg: string): void {
  console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
  process.exitCode = 1;
}
