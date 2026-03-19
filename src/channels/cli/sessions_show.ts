import { defineCommand } from "citty";
import {
  getHistory,
  getSession,
  listSessions,
  parseToolCallData,
  parseToolResultData,
} from "../../core/chat/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function formatDate(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19);
}

function relativeAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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

function statusLabel(s: { closedAt: number | null; distilledAt: number | null }): string {
  if (s.distilledAt) return "distilled";
  if (s.closedAt) return "closed";
  return "open";
}

export default defineCommand({
  meta: { name: "show", description: "Show session details and optional transcript" },
  args: {
    id: {
      type: "positional",
      description: "Session ID (positive integer)",
      required: true,
    },
    transcript: {
      type: "boolean",
      description: "Print the full message transcript",
      default: false,
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      console.error(style.boldRed("error".padStart(10)), " Session ID must be a positive integer.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const session = getSession(db, id);
      if (!session) {
        console.error(style.boldRed("error".padStart(10)), ` Session #${id} not found.`);
        process.exitCode = 1;
        return;
      }

      console.log(style.cyan(`Session #${session.id}`));
      console.log();
      console.log(`${style.dim("title".padStart(12))}  ${session.displayName || session.key}`);
      console.log(`${style.dim("key".padStart(12))}  ${session.key}`);
      console.log(`${style.dim("purpose".padStart(12))}  ${session.purpose}`);
      console.log(`${style.dim("status".padStart(12))}  ${statusLabel(session)}`);
      console.log(`${style.dim("model".padStart(12))}  ${session.model || "default"}`);
      console.log(
        `${style.dim("created".padStart(12))}  ${formatDate(session.createdAt)} (${relativeAge(session.createdAt)})`,
      );
      console.log(
        `${style.dim("active".padStart(12))}  ${formatDate(session.lastActiveAt)} (${relativeAge(session.lastActiveAt)})`,
      );
      console.log(
        `${style.dim("tokens".padStart(12))}  ${formatTokens(session.tokensIn)} in / ${formatTokens(session.tokensOut)} out / ${formatTokens(session.reasoningTokens)} reasoning / ${formatTokens(session.cachedTokens)} cached`,
      );
      console.log(`${style.dim("cost".padStart(12))}  $${formatCost(session.costUsd)}`);

      if (session.parentSessionId) {
        const parent = getSession(db, session.parentSessionId);
        const label = parent
          ? `#${parent.id} (${parent.displayName || parent.key})`
          : `#${session.parentSessionId}`;
        console.log(`${style.dim("parent".padStart(12))}  ${label}`);
      }

      const delegations = listSessions(db, { purpose: "delegate", parentSessionId: id });
      if (delegations.length > 0) {
        console.log();
        console.log(style.dim("── Delegations ──"));
        for (const d of delegations) {
          const status = d.error ? "failed" : d.closedAt ? "completed" : "running";
          const statusStr =
            status === "completed"
              ? style.green(status)
              : status === "failed"
                ? style.boldRed(status)
                : style.yellow(status);
          const label = d.key.length > 40 ? `${d.key.slice(0, 39)}…` : d.key;
          console.log(
            `  [${statusStr}] ${label}  $${formatCost(d.costUsd)}  ${formatTokens(d.tokensIn + d.tokensOut)}`,
          );
        }
      }

      if (args.transcript) {
        const messages = getHistory(db, id);
        if (messages.length === 0) {
          console.log();
          console.log(style.dim("No messages."));
          return;
        }

        console.log();
        console.log(style.dim(`── Transcript (${messages.length} messages) ──`));
        console.log();

        for (const m of messages) {
          if (m.isCompaction) {
            console.log(style.dim("── context compacted ──"));
            continue;
          }

          if (m.role === "tool_call" || m.role === "tool_result") {
            const label = m.role === "tool_call" ? "tool" : "result";
            const name =
              m.role === "tool_call"
                ? (parseToolCallData(m.toolData)[0]?.name ?? "")
                : (parseToolResultData(m.toolData)?.toolCallId ?? "");
            console.log(style.dim(`  [${label}] ${name}`));
            continue;
          }

          const roleLabel = m.role === "user" ? style.cyan("user") : style.green("assistant");
          console.log(`${roleLabel}:`);
          console.log(m.content);
          console.log();
        }
      }
    });
  },
});
