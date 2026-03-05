import { defineCommand } from "citty";
import { deriveSessionTitle } from "../../core/chat/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function channelFromKey(key: string): string {
  const colon = key.indexOf(":");
  if (colon <= 0) return "sys";
  const prefix = key.slice(0, colon);
  const map: Record<string, string> = {
    web: "web",
    telegram: "tg",
    delegate: "del",
    system: "sys",
    cli: "cli",
    tui: "tui",
  };
  return map[prefix] ?? "sys";
}

function statusOf(row: Record<string, unknown>): string {
  if (row.distilled_at) return "distilled";
  if (row.closed_at) return "closed";
  return "open";
}

function statusDot(status: string): string {
  if (status === "open") return style.green("●");
  if (status === "closed") return style.dim("●");
  return style.yellow("●");
}

function relativeAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatCost(usd: number): string {
  if (usd < 0.01) return usd > 0 ? usd.toFixed(4) : "0.00";
  return usd.toFixed(2);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function firstUserMessage(db: DatabaseHandle, sessionId: number): string {
  const row = db
    .prepare(
      "SELECT content FROM messages WHERE session_id = ? AND role = 'user' ORDER BY id ASC LIMIT 1",
    )
    .get(sessionId) as { content: string } | undefined;
  if (!row) return "";
  return row.content.replace(/\s+/g, " ").trim();
}

export default defineCommand({
  meta: { name: "list", description: "List chat sessions" },
  args: {
    channel: {
      type: "string",
      description: "Filter by channel: web, tg, del, sys, cli, tui",
    },
    status: {
      type: "string",
      description: "Filter by status: open, closed, distilled",
    },
    purpose: {
      type: "string",
      description: "Filter by purpose: chat, delegate, system, train, scout",
    },
    sort: {
      type: "string",
      description: "Sort order: recent (default), oldest, expensive, tokens",
    },
    limit: {
      type: "string",
      description: "Maximum sessions to show (default: 30)",
    },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 30;
      const sort = (args.sort as string) ?? "recent";

      const clauses: string[] = [];
      const params: unknown[] = [];

      if (args.channel) {
        const channelToPrefix: Record<string, string> = {
          web: "web",
          tg: "telegram",
          del: "delegate",
          sys: "system",
          cli: "cli",
          tui: "tui",
        };
        const prefix = channelToPrefix[args.channel as string] ?? (args.channel as string);
        clauses.push("s.key LIKE ?");
        params.push(`${prefix}:%`);
      }
      if (args.status === "open") clauses.push("s.closed_at IS NULL");
      else if (args.status === "closed")
        clauses.push("s.closed_at IS NOT NULL AND s.distilled_at IS NULL");
      else if (args.status === "distilled") clauses.push("s.distilled_at IS NOT NULL");

      if (args.purpose) {
        clauses.push("s.purpose = ?");
        params.push(args.purpose);
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

      let orderBy = "s.last_active_at DESC";
      if (sort === "oldest") orderBy = "s.last_active_at ASC";
      else if (sort === "expensive") orderBy = "s.cost_usd DESC";
      else if (sort === "tokens") orderBy = "(s.tokens_in + s.tokens_out) DESC";

      const stats = db
        .prepare(
          `SELECT
            COUNT(*) AS total,
            COUNT(CASE WHEN closed_at IS NULL THEN 1 END) AS open,
            COUNT(CASE WHEN closed_at IS NOT NULL AND distilled_at IS NULL THEN 1 END) AS closed,
            COUNT(CASE WHEN distilled_at IS NOT NULL THEN 1 END) AS distilled
          FROM sessions`,
        )
        .get() as unknown as { total: number; open: number; closed: number; distilled: number };

      console.log(
        style.dim(
          `${stats.total} sessions (${stats.open} open, ${stats.closed} closed, ${stats.distilled} distilled)`,
        ),
      );

      const rows = db
        .prepare(
          `SELECT s.*,
            (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count
          FROM sessions s
          ${where}
          ORDER BY ${orderBy}
          LIMIT ?`,
        )
        .all(...params, limit) as unknown as Record<string, unknown>[];

      if (rows.length === 0) {
        console.log(style.dim("No sessions match the filter."));
        return;
      }

      const header = `${"ID".padStart(5)}   ${"Ch".padEnd(4)} ${"Title".padEnd(35)} ${"Purpose".padEnd(9)} ${"Tokens".padStart(8)} ${"Cost".padStart(7)} ${"Age".padStart(4)}`;
      console.log(style.dim(header));
      console.log(style.dim("─".repeat(82)));

      for (const row of rows) {
        const id = String(row.id).padStart(5);
        const key = row.key as string;
        const ch = channelFromKey(key).padEnd(4);
        const status = statusOf(row);
        const dot = statusDot(status);
        const displayName =
          (row.display_name as string) ||
          deriveSessionTitle(firstUserMessage(db, row.id as number)) ||
          key;
        const title =
          displayName.length > 33 ? `${displayName.slice(0, 32)}…` : displayName.padEnd(33);
        const purpose = ((row.purpose as string) ?? "chat").padEnd(9);
        const tokens = formatTokens(
          ((row.tokens_in as number) ?? 0) + ((row.tokens_out as number) ?? 0),
        ).padStart(8);
        const cost = `$${formatCost((row.cost_usd as number) ?? 0)}`.padStart(7);
        const age = relativeAge(
          (row.last_active_at as number) ?? (row.created_at as number),
        ).padStart(4);

        console.log(
          `${style.dim(id)} ${dot} ${style.dim(ch)} ${style.cyan(title)} ${style.dim(purpose)} ${tokens} ${style.dim(cost)} ${style.dim(age)}`,
        );
      }
    });
  },
});
