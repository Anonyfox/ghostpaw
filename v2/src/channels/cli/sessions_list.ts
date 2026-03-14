import { defineCommand } from "citty";
import type { SessionPurpose } from "../../core/chat/api/read/index.ts";
import {
  deriveSessionTitle,
  getSessionMessage,
  getSessionStats,
  querySessionsPage,
} from "../../core/chat/api/read/index.ts";
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

function statusDot(session: { closedAt: number | null; distilledAt: number | null }): string {
  if (session.distilledAt) return style.yellow("●");
  if (session.closedAt) return style.dim("●");
  return style.green("●");
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
    await withRunDb((db: DatabaseHandle) => {
      const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 30;
      const sort = ((args.sort as string) ?? "recent") as
        | "recent"
        | "oldest"
        | "expensive"
        | "tokens";

      const channelToPrefix: Record<string, string> = {
        web: "web",
        tg: "telegram",
        del: "delegate",
        sys: "system",
        cli: "cli",
        tui: "tui",
      };
      const channel = args.channel
        ? (channelToPrefix[args.channel as string] ?? (args.channel as string))
        : undefined;

      const stats = getSessionStats(db);
      console.log(
        style.dim(
          `${stats.total} sessions (${stats.open} open, ${stats.closed} closed, ${stats.distilled} distilled)`,
        ),
      );

      const result = querySessionsPage(db, {
        filter: {
          channel,
          purpose: args.purpose as SessionPurpose | undefined,
          status: args.status as "open" | "closed" | "distilled" | undefined,
        },
        sort,
        limit,
      });

      if (result.sessions.length === 0) {
        console.log(style.dim("No sessions match the filter."));
        return;
      }

      const header = `${"ID".padStart(5)}   ${"Ch".padEnd(4)} ${"Title".padEnd(35)} ${"Purpose".padEnd(9)} ${"Tokens".padStart(8)} ${"Cost".padStart(7)} ${"Age".padStart(4)}`;
      console.log(style.dim(header));
      console.log(style.dim("─".repeat(82)));

      for (const s of result.sessions) {
        const id = String(s.id).padStart(5);
        const ch = channelFromKey(s.key).padEnd(4);
        const dot = statusDot(s);
        const preview = getSessionMessage(db, s.id, "user", "first") ?? "";
        const displayName = s.displayName || deriveSessionTitle(preview) || s.key;
        const title =
          displayName.length > 33 ? `${displayName.slice(0, 32)}…` : displayName.padEnd(33);
        const purpose = s.purpose.padEnd(9);
        const tokens = formatTokens(s.tokensIn + s.tokensOut).padStart(8);
        const cost = `$${formatCost(s.costUsd)}`.padStart(7);
        const age = relativeAge(s.lastActiveAt || s.createdAt).padStart(4);

        console.log(
          `${style.dim(id)} ${dot} ${style.dim(ch)} ${style.cyan(title)} ${style.dim(purpose)} ${tokens} ${style.dim(cost)} ${style.dim(age)}`,
        );
      }
    });
  },
});
