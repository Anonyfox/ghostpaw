import { defineCommand } from "citty";
import {
  createSchedule,
  deleteSchedule,
  ensureDefaultSchedules,
  getSchedule,
  getScheduleByName,
  listSchedules,
  updateSchedule,
} from "../../core/schedule/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function formatInterval(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function formatAge(ts: number | null): string {
  if (!ts) return style.dim("never");
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusBadge(s: { enabled: boolean; runningPid: number | null }): string {
  if (s.runningPid !== null) return style.cyan("[running]");
  if (s.enabled) return style.green("[enabled]");
  return style.dim("[disabled]");
}

function resolveSchedule(db: Parameters<Parameters<typeof withRunDb>[0]>[0], idOrName: string) {
  const id = Number(idOrName);
  if (!Number.isNaN(id) && id > 0) return getSchedule(db, id);
  return getScheduleByName(db, idOrName);
}

const schedulesShow = defineCommand({
  meta: { name: "show", description: "Show schedule details" },
  args: {
    id: { type: "positional", description: "Schedule ID or name" },
  },
  async run({ args }) {
    await withRunDb((db) => {
      ensureDefaultSchedules(db);
      if (!args.id) {
        console.log(style.dim("  Usage: schedules show <id|name>"));
        return;
      }
      const s = resolveSchedule(db, args.id as string);
      if (!s) {
        console.log(style.dim(`  Schedule "${args.id}" not found.`));
        return;
      }
      console.log(`  ${style.cyan(s.name)} ${statusBadge(s)} ${style.dim(`#${s.id}`)}`);
      console.log(`  ${style.dim("Type:")}     ${s.type}`);
      console.log(`  ${style.dim("Command:")}  ${s.command}`);
      console.log(
        `  ${style.dim("Interval:")} ${formatInterval(s.intervalMs)} (${s.intervalMs}ms)`,
      );
      console.log(`  ${style.dim("Next run:")} ${new Date(s.nextRunAt).toLocaleString()}`);
      if (s.runningPid !== null) {
        console.log(`  ${style.dim("PID:")}      ${s.runningPid}`);
      }
      console.log(`  ${style.dim("Runs:")}     ${s.runCount} total, ${s.failCount} failed`);
      console.log(`  ${style.dim("Last run:")} ${formatAge(s.lastRunAt)}`);
      if (s.lastExitCode !== null) {
        console.log(
          `  ${style.dim("Last exit:")} ${s.lastExitCode === 0 ? style.green("0") : style.red(String(s.lastExitCode))}`,
        );
      }
      if (s.lastError) {
        console.log(`  ${style.dim("Last err:")} ${s.lastError}`);
      }
    });
  },
});

const schedulesEnable = defineCommand({
  meta: { name: "enable", description: "Enable a schedule" },
  args: {
    id: { type: "positional", description: "Schedule ID or name" },
  },
  async run({ args }) {
    await withRunDb((db) => {
      ensureDefaultSchedules(db);
      if (!args.id) {
        console.log(style.dim("  Usage: schedules enable <id|name>"));
        return;
      }
      const s = resolveSchedule(db, args.id as string);
      if (!s) {
        console.log(style.dim(`  Schedule "${args.id}" not found.`));
        return;
      }
      if (s.enabled) {
        console.log(style.dim(`  ${s.name} is already enabled.`));
        return;
      }
      updateSchedule(db, s.id, { enabled: true });
      console.log(`  ${style.cyan(s.name)} enabled.`);
    });
  },
});

const schedulesDisable = defineCommand({
  meta: { name: "disable", description: "Disable a schedule" },
  args: {
    id: { type: "positional", description: "Schedule ID or name" },
  },
  async run({ args }) {
    await withRunDb((db) => {
      ensureDefaultSchedules(db);
      if (!args.id) {
        console.log(style.dim("  Usage: schedules disable <id|name>"));
        return;
      }
      const s = resolveSchedule(db, args.id as string);
      if (!s) {
        console.log(style.dim(`  Schedule "${args.id}" not found.`));
        return;
      }
      if (!s.enabled) {
        console.log(style.dim(`  ${s.name} is already disabled.`));
        return;
      }
      updateSchedule(db, s.id, { enabled: false });
      console.log(`  ${style.cyan(s.name)} disabled.`);
    });
  },
});

const schedulesCreate = defineCommand({
  meta: { name: "create", description: "Create a custom schedule" },
  args: {
    name: { type: "positional", description: "Unique schedule name" },
    command: { type: "string", description: "Shell command to run", required: true },
    interval: {
      type: "string",
      description: "Interval in minutes (default: 60)",
    },
  },
  async run({ args }) {
    await withRunDb((db) => {
      ensureDefaultSchedules(db);
      const name = (args.name as string | undefined)?.trim();
      const command = (args.command as string | undefined)?.trim();
      if (!name || !command) {
        console.log(
          style.dim("  Usage: schedules create <name> --command <cmd> [--interval <min>]"),
        );
        return;
      }
      const minutes = args.interval ? Number(args.interval) : 60;
      if (Number.isNaN(minutes) || minutes < 1) {
        console.log(style.dim("  Interval must be at least 1 minute."));
        return;
      }
      try {
        const s = createSchedule(db, {
          name,
          type: "custom",
          command,
          intervalMs: minutes * 60_000,
        });
        console.log(
          `  ${style.cyan("Created")} ${s.name} — runs every ${formatInterval(s.intervalMs)}`,
        );
      } catch (err) {
        console.log(style.dim(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
  },
});

const schedulesUpdate = defineCommand({
  meta: { name: "update", description: "Update a schedule's interval or command" },
  args: {
    id: { type: "positional", description: "Schedule ID or name" },
    command: { type: "string", description: "New shell command" },
    interval: { type: "string", description: "New interval in minutes" },
  },
  async run({ args }) {
    await withRunDb((db) => {
      ensureDefaultSchedules(db);
      if (!args.id) {
        console.log(
          style.dim("  Usage: schedules update <id|name> [--interval <min>] [--command <cmd>]"),
        );
        return;
      }
      const s = resolveSchedule(db, args.id as string);
      if (!s) {
        console.log(style.dim(`  Schedule "${args.id}" not found.`));
        return;
      }
      const changes: { intervalMs?: number; command?: string } = {};
      if (args.interval) {
        const minutes = Number(args.interval);
        if (Number.isNaN(minutes) || minutes < 1) {
          console.log(style.dim("  Interval must be at least 1 minute."));
          return;
        }
        changes.intervalMs = minutes * 60_000;
      }
      if (args.command) {
        changes.command = (args.command as string).trim();
      }
      if (!changes.intervalMs && !changes.command) {
        console.log(style.dim("  Nothing to update. Use --interval or --command."));
        return;
      }
      try {
        const updated = updateSchedule(db, s.id, changes);
        console.log(
          `  ${style.cyan("Updated")} ${updated.name} — interval ${formatInterval(updated.intervalMs)}`,
        );
      } catch (err) {
        console.log(style.dim(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
  },
});

const schedulesDelete = defineCommand({
  meta: { name: "delete", description: "Delete a custom schedule" },
  args: {
    id: { type: "positional", description: "Schedule ID or name" },
  },
  async run({ args }) {
    await withRunDb((db) => {
      ensureDefaultSchedules(db);
      if (!args.id) {
        console.log(style.dim("  Usage: schedules delete <id|name>"));
        return;
      }
      const s = resolveSchedule(db, args.id as string);
      if (!s) {
        console.log(style.dim(`  Schedule "${args.id}" not found.`));
        return;
      }
      try {
        deleteSchedule(db, s.id);
        console.log(`  ${style.cyan("Deleted")} ${s.name}.`);
      } catch (err) {
        console.log(style.dim(`  Error: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
  },
});

export default defineCommand({
  meta: { name: "schedules", description: "View and manage scheduled jobs" },
  subCommands: {
    show: schedulesShow,
    enable: schedulesEnable,
    disable: schedulesDisable,
    create: schedulesCreate,
    update: schedulesUpdate,
    delete: schedulesDelete,
  },
  async run() {
    const subs = ["show", "enable", "disable", "create", "update", "delete"];
    const positionals = process.argv.slice(2).filter((a) => !a.startsWith("-"));
    if (positionals.length > 1 && subs.includes(positionals[1])) return;

    await withRunDb((db) => {
      ensureDefaultSchedules(db);
      const all = listSchedules(db);
      if (all.length === 0) {
        console.log(style.dim("  No schedules found."));
        return;
      }

      const header = `  ${"Name".padEnd(20)} ${"Type".padEnd(8)} ${"Interval".padEnd(10)} ${"Status".padEnd(12)} ${"Runs".padStart(5)} ${"Fails".padStart(5)}  ${"Last run"}`;
      console.log(style.dim(header));

      for (const s of all) {
        const status =
          s.runningPid !== null
            ? style.cyan("running")
            : s.enabled
              ? "enabled"
              : style.dim("disabled");
        console.log(
          `  ${style.cyan(s.name.padEnd(20))} ${s.type.padEnd(8)} ${formatInterval(s.intervalMs).padEnd(10)} ${status.padEnd(12)} ${String(s.runCount).padStart(5)} ${String(s.failCount).padStart(5)}  ${formatAge(s.lastRunAt)}`,
        );
      }

      console.log(
        style.dim(`\n  ${all.length} schedule(s). Use 'schedules show <name>' for details.`),
      );
    });
  },
});
