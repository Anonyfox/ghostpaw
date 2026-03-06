import { resolve } from "node:path";
import { defineCommand } from "citty";
import {
  countPendingHowls,
  getHowl,
  listHowls,
  replyToHowl,
  updateHowlStatus,
} from "../../core/howl/index.ts";
import type { HowlStatus } from "../../core/howl/index.ts";
import { createEntity } from "../../harness/index.ts";
import { label, style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function statusLabel(s: string): string {
  if (s === "pending") return style.cyan(s);
  if (s === "responded") return style.dim(s);
  if (s === "dismissed") return style.dim(s);
  return s;
}

function urgencyLabel(u: string): string {
  return u === "high" ? style.boldRed("high") : style.dim("low");
}

function relativeAge(ms: number): string {
  const elapsed = Date.now() - ms;
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function truncate(s: string, max = 60): string {
  return s.length > max ? `${s.slice(0, max - 1)}\u2026` : s;
}

const listCmd = defineCommand({
  meta: { name: "list", description: "List howls" },
  args: {
    status: {
      type: "string",
      alias: "s",
      description: "Filter by status: pending, responded, dismissed",
    },
    limit: {
      type: "string",
      alias: "n",
      description: "Max results (default: 20)",
    },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const status = args.status as HowlStatus | undefined;
      const limit = Number(args.limit) || 20;
      const howls = listHowls(db, { status, limit });

      if (howls.length === 0) {
        console.log(style.dim("No howls found."));
        return;
      }

      console.log(`${howls.length} howl${howls.length > 1 ? "s" : ""}`);
      for (const h of howls) {
        const age = relativeAge(h.createdAt);
        const msg = truncate(h.message);
        console.log(
          `  ${String(h.id).padStart(4)} ${urgencyLabel(h.urgency)} ${statusLabel(h.status).padEnd(18)} ${msg}  ${style.dim(age)}`,
        );
      }
    });
  },
});

const showCmd = defineCommand({
  meta: { name: "show", description: "Show howl detail" },
  args: {
    id: { type: "positional", description: "Howl ID", required: true },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const id = Number(args.id);
      if (!id || !Number.isFinite(id)) {
        console.error(style.boldRed("error"), "Valid howl ID required.");
        process.exitCode = 1;
        return;
      }
      const howl = getHowl(db, id);
      if (!howl) {
        console.error(style.boldRed("error"), `Howl #${id} not found.`);
        process.exitCode = 1;
        return;
      }

      console.log(`Howl #${howl.id}`);
      console.log();
      console.log(howl.message);
      console.log();
      label("status", statusLabel(howl.status));
      label("urgency", urgencyLabel(howl.urgency));
      if (howl.channel) label("channel", howl.channel);
      label("created", `${new Date(howl.createdAt).toISOString()} (${relativeAge(howl.createdAt)} ago)`);
      if (howl.respondedAt) {
        label("responded", `${new Date(howl.respondedAt).toISOString()} (${relativeAge(howl.respondedAt)} ago)`);
      }
      label("session", `#${howl.sessionId}`);
    });
  },
});

const dismissCmd = defineCommand({
  meta: { name: "dismiss", description: "Dismiss a pending howl" },
  args: {
    id: { type: "positional", description: "Howl ID", required: true },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const id = Number(args.id);
      if (!id || !Number.isFinite(id)) {
        console.error(style.boldRed("error"), "Valid howl ID required.");
        process.exitCode = 1;
        return;
      }
      const howl = getHowl(db, id);
      if (!howl) {
        console.error(style.boldRed("error"), `Howl #${id} not found.`);
        process.exitCode = 1;
        return;
      }
      if (howl.status !== "pending") {
        console.error(style.boldRed("error"), `Howl #${id} is already "${howl.status}".`);
        process.exitCode = 1;
        return;
      }
      updateHowlStatus(db, id, "dismissed");
      console.log(`Howl #${id} dismissed.`);
    });
  },
});

const replyCmd = defineCommand({
  meta: { name: "reply", description: "Reply to a pending howl" },
  args: {
    id: { type: "positional", description: "Howl ID", required: true },
    message: { type: "positional", description: "Reply message", required: true },
  },
  async run({ args }) {
    await withRunDb(async (db) => {
      const id = Number(args.id);
      if (!id || !Number.isFinite(id)) {
        console.error(style.boldRed("error"), "Valid howl ID required.");
        process.exitCode = 1;
        return;
      }

      const message = [args.message, ...(args._ ?? [])].join(" ");
      if (!message.trim()) {
        console.error(style.boldRed("error"), "Reply message required.");
        process.exitCode = 1;
        return;
      }

      const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
      const entity = createEntity({ db, workspace });

      try {
        const result = await replyToHowl(db, entity, id, message.trim(), {
          replyChannel: "cli",
        });
        await entity.flush();

        console.log(result.turn.content);
        console.log();
        console.log(
          style.dim(
            `howl #${id} responded | ${result.turn.usage.totalTokens} tokens`,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error"), msg);
        process.exitCode = 1;
      }
    });
  },
});

export default defineCommand({
  meta: { name: "howls", description: "View and respond to howls — the ghost's proactive messages" },
  subCommands: {
    list: listCmd,
    show: showCmd,
    dismiss: dismissCmd,
    reply: replyCmd,
  },
  async run() {
    const subs = ["list", "show", "dismiss", "reply"];
    const positionals = process.argv.slice(2).filter((a) => !a.startsWith("-"));
    if (positionals.length > 1 && subs.includes(positionals[1])) return;

    await withRunDb((db) => {
      const pending = countPendingHowls(db);
      const recent = listHowls(db, { limit: 5 });

      if (pending > 0) {
        console.log(style.cyan(`${pending} pending howl${pending > 1 ? "s" : ""}`));
        console.log();
        const pendingHowls = recent.filter((h) => h.status === "pending");
        for (const h of pendingHowls) {
          const age = relativeAge(h.createdAt);
          console.log(`  ${urgencyLabel(h.urgency)} #${h.id}  ${h.message}  ${style.dim(age)}`);
        }
        console.log();
        console.log(style.dim("Use 'ghostpaw howls reply <id> <message>' to respond."));
      } else if (recent.length > 0) {
        console.log(style.dim("No pending howls."));
        console.log();
        console.log("Recent:");
        for (const h of recent) {
          const age = relativeAge(h.createdAt);
          console.log(
            `  ${String(h.id).padStart(4)} ${statusLabel(h.status).padEnd(18)} ${truncate(h.message)}  ${style.dim(age)}`,
          );
        }
      } else {
        console.log(style.dim("No howls yet. The ghost hasn't reached out."));
      }
    });
  },
});
