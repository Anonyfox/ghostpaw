import { defineCommand } from "citty";
import { getHistory } from "../../core/chat/index.ts";
import type { HowlStatus } from "../../core/howl/index.ts";
import { countPendingHowls, getHowl, listHowls } from "../../core/howl/index.ts";
import { processHowlDismiss, processHowlReply } from "../../harness/howl/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function formatAge(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const howlShow = defineCommand({
  meta: { name: "show", description: "Show howl details" },
  args: {
    id: { type: "positional", description: "Howl ID" },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const id = Number(args.id);
      if (!id) {
        console.log(style.dim("  Usage: howls show <id>"));
        return;
      }
      const howl = getHowl(db, id);
      if (!howl) {
        console.log(style.dim(`  Howl #${id} not found.`));
        return;
      }
      console.log(`  ${style.cyan("Howl")} #${howl.id}`);
      console.log(`  ${style.dim("Message:")} ${howl.message}`);
      console.log(`  ${style.dim("Urgency:")} ${howl.urgency}`);
      console.log(`  ${style.dim("Status:")}  ${howl.status}`);
      console.log(`  ${style.dim("Channel:")} ${howl.channel ?? "none"}`);
      console.log(
        `  ${style.dim("Origin:")}  session #${howl.originSessionId}${howl.originMessageId ? ` msg #${howl.originMessageId}` : ""}`,
      );
      console.log(`  ${style.dim("Created:")} ${new Date(howl.createdAt).toLocaleString()}`);
      if (howl.respondedAt) {
        console.log(`  ${style.dim("Responded:")} ${new Date(howl.respondedAt).toLocaleString()}`);
      }
    });
  },
});

const howlReply = defineCommand({
  meta: { name: "reply", description: "Reply to a pending howl" },
  args: {
    id: { type: "positional", description: "Howl ID" },
    message: { type: "positional", description: "Reply message" },
  },
  async run({ args }) {
    await withRunDb(async (db) => {
      const id = Number(args.id);
      const message = String(args.message ?? "").trim();
      if (!id || !message) {
        console.log(style.dim("  Usage: howls reply <id> <message>"));
        return;
      }
      try {
        const result = await processHowlReply(db, id, message, {
          replyChannel: "cli",
        });
        console.log(`  ${style.cyan("Noted:")} ${result.summary}`);
      } catch (err) {
        console.log(style.dim(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
  },
});

const howlDismiss = defineCommand({
  meta: { name: "dismiss", description: "Dismiss a pending howl" },
  args: {
    id: { type: "positional", description: "Howl ID" },
  },
  async run({ args }) {
    await withRunDb(async (db) => {
      const id = Number(args.id);
      if (!id) {
        console.log(style.dim("  Usage: howls dismiss <id>"));
        return;
      }
      try {
        await processHowlDismiss(db, id);
        console.log(style.dim(`  Howl #${id} dismissed.`));
      } catch (err) {
        console.log(style.dim(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
  },
});

const howlHistory = defineCommand({
  meta: { name: "history", description: "Show origin session context for a howl" },
  args: {
    id: { type: "positional", description: "Howl ID" },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const id = Number(args.id);
      if (!id) {
        console.log(style.dim("  Usage: howls history <id>"));
        return;
      }
      const howl = getHowl(db, id);
      if (!howl) {
        console.log(style.dim(`  Howl #${id} not found.`));
        return;
      }
      console.log(`  ${style.cyan("Origin session")} #${howl.originSessionId}:`);
      const messages = getHistory(db, howl.originSessionId);
      for (const m of messages) {
        if (m.role !== "user" && m.role !== "assistant") continue;
        const role = m.role === "user" ? "You" : "Ghost";
        const preview = m.content.length > 120 ? `${m.content.slice(0, 120)}...` : m.content;
        console.log(`  ${style.dim(`${role}:`)} ${preview}`);
      }
    });
  },
});

export default defineCommand({
  meta: { name: "howls", description: "View and manage howls" },
  args: {
    status: {
      type: "string",
      description: "Filter by status: pending, responded, dismissed",
    },
  },
  subCommands: {
    show: howlShow,
    reply: howlReply,
    dismiss: howlDismiss,
    history: howlHistory,
  },
  async run({ args }) {
    const subs = ["show", "reply", "dismiss", "history"];
    const positionals = process.argv.slice(2).filter((a) => !a.startsWith("-"));
    if (positionals.length > 1 && subs.includes(positionals[1])) return;

    await withRunDb((db) => {
      const statusFilter = (args.status as HowlStatus) || undefined;
      const howls = listHowls(db, { status: statusFilter, limit: 20 });
      if (howls.length === 0) {
        console.log(style.dim("  No howls found."));
        return;
      }
      for (const h of howls) {
        const age = formatAge(h.createdAt);
        const badge =
          h.status === "pending" ? style.cyan(`[${h.status}]`) : style.dim(`[${h.status}]`);
        const urgency = h.urgency === "high" ? style.cyan(" !") : "";
        console.log(
          `  ${style.dim(`#${h.id}`)} ${badge}${urgency} ${h.message}  ${style.dim(age)}`,
        );
      }
      const pending = countPendingHowls(db);
      if (pending > 0) {
        console.log(
          style.dim(`\n  ${pending} pending howl(s). Use 'howls show <id>' or 'howls reply <id>'.`),
        );
      }
    });
  },
});
