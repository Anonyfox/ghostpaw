import { createTool, Schema } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { BUILTINS } from "../pulse/builtins.ts";
import { nextCronRun } from "../pulse/cron.ts";
import type { Pulse, PulseType } from "../pulse/types.ts";

const BUILTIN_NAMES = new Set(Object.keys(BUILTINS));
const MIN_INTERVAL_S = 60;
const MIN_TIMEOUT_S = 10;

function computeNextRunAtForCreate(input: {
  interval_ms: number | null;
  cron_expr: string | null;
  atIso: string | null;
}): string {
  if (input.interval_ms != null && input.interval_ms > 0) {
    return new Date(Date.now() + input.interval_ms).toISOString();
  }
  if (input.cron_expr) {
    return nextCronRun(input.cron_expr, new Date()).toISOString();
  }
  if (input.atIso) {
    return input.atIso;
  }
  return new Date().toISOString();
}

function getPulseById(db: DatabaseHandle, id: number): Pulse | undefined {
  const row = db.prepare("SELECT * FROM pulses WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? (row as unknown as Pulse) : undefined;
}

function pulseStatus(p: Pulse): string {
  if (p.running === 1) return "running";
  if (p.enabled === 0) return "disabled";
  return "idle";
}

function summarizePulse(p: Pulse) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    command: p.command.length > 80 ? `${p.command.slice(0, 77)}...` : p.command,
    status: pulseStatus(p),
    next_run_at: p.next_run_at,
    last_run_at: p.last_run_at,
    last_exit_code: p.last_exit_code,
    run_count: p.run_count,
    interval_ms: p.interval_ms,
    cron_expr: p.cron_expr,
    timeout_ms: p.timeout_ms,
  };
}

class PulseParams extends Schema {
  action = Schema.String({
    description:
      "What to do. 'list': show all pulses with their IDs. " +
      "'show': detail + recent runs (needs id). " +
      "'create': new pulse (needs name, type, command, and one of: at, cron, interval_seconds). " +
      "'update': change an existing pulse (needs id). " +
      "'enable'/'disable': toggle a pulse (needs id). " +
      "'delete': remove a non-builtin pulse (needs id).",
  });
  id = Schema.Integer({
    description:
      "Pulse ID (integer). Required for show, update, enable, disable, delete. " +
      "Get IDs from the 'list' action.",
    optional: true,
  });
  name = Schema.String({
    description:
      "For 'create' only. Human-readable name (must be unique). " +
      "Use short kebab-case like 'daily-news' or 'backup-db'.",
    optional: true,
  });
  type = Schema.String({
    description:
      "For 'create' only. 'agent': runs a prompt as a full agent turn with all tools. " +
      "'shell': runs a bash command. Cannot be 'builtin' (reserved for system pulses).",
    optional: true,
  });
  command = Schema.String({
    description:
      "For 'create' and 'update'. For agent type: the prompt to execute. " +
      "For shell type: the bash command. Be specific and self-contained — " +
      "the agent won't have conversation context.",
    optional: true,
  });
  at = Schema.String({
    description:
      "For 'create' only. One-off execution time as ISO 8601 (e.g. '2026-03-28T09:00:00'). " +
      "Must be in the future. Mutually exclusive with cron and interval_seconds.",
    optional: true,
  });
  cron = Schema.String({
    description:
      "For 'create' and 'update'. Standard 5-field cron: 'minute hour day month weekday'. " +
      "Examples: '0 9 * * *' (daily 9am), '*/30 * * * *' (every 30min), '0 0 * * 1' (Monday midnight). " +
      "Shortcuts: @hourly, @daily, @weekly, @monthly. Mutually exclusive with at and interval_seconds.",
    optional: true,
  });
  interval_seconds = Schema.Integer({
    description:
      "For 'create' and 'update'. Recurring interval in seconds (minimum 60). " +
      "Examples: 300 (5 min), 3600 (1 hour), 86400 (1 day). " +
      "Mutually exclusive with cron and at.",
    optional: true,
  });
  timeout_minutes = Schema.Integer({
    description: "Max execution time in minutes before the task is killed. Default: 5.",
    optional: true,
  });
}

function err(msg: string, hint?: string): { error: string; hint?: string } {
  return hint ? { error: msg, hint } : { error: msg };
}

function requireId(a: { id?: number }): number | { error: string; hint?: string } {
  if (a.id === undefined || a.id === null) {
    return err("id is required", "Use pulse({ action: 'list' }) to find the pulse ID.");
  }
  return a.id;
}

export function createPulseTool(db: DatabaseHandle) {
  return createTool({
    name: "pulse",
    description:
      "Manage scheduled background tasks. A pulse fires on a timer and executes autonomously. " +
      "Agent-type pulses run a stored prompt as a full agent turn (with all tools). " +
      "Shell-type pulses run a bash command. " +
      "IMPORTANT: All pulses have a numeric ID. Use 'list' first to see IDs, then reference " +
      "pulses by ID for show/update/enable/disable/delete. Only 'create' uses a name (for the new pulse).",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new PulseParams() as any,
    execute: async ({ args }) => {
      const a = args as {
        action: string;
        id?: number;
        name?: string;
        type?: string;
        command?: string;
        at?: string;
        cron?: string;
        interval_seconds?: number;
        timeout_minutes?: number;
      };

      const action = (a.action ?? "").trim().toLowerCase();
      if (!action) {
        return err(
          "action is required",
          "Use one of: list, show, create, update, enable, disable, delete.",
        );
      }

      if (action === "list") {
        const rows = db.prepare("SELECT * FROM pulses ORDER BY id ASC").all() as unknown as Pulse[];
        return { pulses: rows.map(summarizePulse) };
      }

      if (action === "show") {
        const id = requireId(a);
        if (typeof id !== "number") return id;
        const p = getPulseById(db, id);
        if (!p) return err(`no pulse with id ${id}`, "Use pulse({ action: 'list' }) to see IDs.");
        const runs = db
          .prepare("SELECT * FROM pulse_runs WHERE pulse_id = ? ORDER BY started_at DESC LIMIT 5")
          .all(p.id) as Record<string, unknown>[];
        return { pulse: { ...summarizePulse(p), command: p.command }, last_runs: runs };
      }

      if (action === "create") {
        const name = (a.name ?? "").trim();
        const command = (a.command ?? "").trim();
        const type = (a.type ?? "").trim() as PulseType | "";

        if (!name || !command) {
          return err(
            "name and command are required",
            "Provide a unique name and the prompt (agent) or shell command to run.",
          );
        }
        if (BUILTIN_NAMES.has(name)) {
          return err(
            "name conflicts with a builtin pulse",
            `'${name}' is reserved. Choose a different name.`,
          );
        }
        if (type !== "agent" && type !== "shell") {
          return err(
            "type must be 'agent' or 'shell'",
            "Use 'agent' for LLM prompt tasks, 'shell' for bash commands.",
          );
        }

        const hasAt = Boolean(a.at?.trim());
        const hasCron = Boolean(a.cron?.trim());
        const hasInterval =
          a.interval_seconds !== undefined && a.interval_seconds !== null && a.interval_seconds > 0;

        if (hasAt && (hasCron || hasInterval)) {
          return err(
            "conflicting schedule: 'at' cannot be combined with cron or interval",
            "Use 'at' alone for a one-off task, or cron/interval alone for recurring.",
          );
        }
        if (hasCron && hasInterval) {
          return err(
            "conflicting schedule: set cron or interval, not both",
            "Use cron for time-of-day patterns, interval for fixed-frequency repeats.",
          );
        }
        if (!hasAt && !hasCron && !hasInterval) {
          return err(
            "no schedule provided",
            "Set 'at' for a one-off (ISO 8601), 'cron' for patterns (e.g. '0 9 * * *'), " +
              "or 'interval_seconds' for fixed repeats (e.g. 3600 for hourly).",
          );
        }

        let interval_ms: number | null = null;
        let cron_expr: string | null = null;
        let atIso: string | null = null;

        if (hasInterval) {
          if (a.interval_seconds! < MIN_INTERVAL_S) {
            return err(
              "interval must be >= 60 seconds",
              `Got ${a.interval_seconds}. Minimum is 60 (1 minute).`,
            );
          }
          interval_ms = a.interval_seconds! * 1000;
        } else if (hasCron) {
          cron_expr = a.cron!.trim();
          try {
            nextCronRun(cron_expr, new Date());
          } catch {
            return err(
              "invalid cron expression",
              "Use 5 fields: 'min hour day month weekday'. " +
                `Shortcuts: @hourly, @daily, @weekly, @monthly. Got: '${cron_expr}'.`,
            );
          }
        } else if (hasAt) {
          const d = new Date(a.at!);
          if (Number.isNaN(d.getTime())) {
            return err(
              "invalid 'at' timestamp",
              "Use ISO 8601 format, e.g. '2026-03-28T09:00:00'. No timezone suffix = local time.",
            );
          }
          if (d.getTime() <= Date.now()) {
            return err(
              "'at' must be a future timestamp",
              `'${a.at}' has already passed. Use a time in the future.`,
            );
          }
          atIso = d.toISOString();
        }

        const timeoutMs = Math.max(
          MIN_TIMEOUT_S * 1000,
          (a.timeout_minutes && a.timeout_minutes > 0 ? a.timeout_minutes : 5) * 60 * 1000,
        );

        const next_run_at = computeNextRunAtForCreate({ interval_ms, cron_expr, atIso });

        let newId: number;
        try {
          const result = db
            .prepare(
              `INSERT INTO pulses (name, type, command, interval_ms, cron_expr, timeout_ms, enabled, next_run_at)
               VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
            )
            .run(name, type, command, interval_ms, cron_expr, timeoutMs, next_run_at);
          newId = Number(result.lastInsertRowid);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("UNIQUE")) {
            return err(
              `pulse name already exists: ${name}`,
              "Choose a different name or delete the existing pulse first.",
            );
          }
          return err(msg);
        }
        return { ok: true, id: newId, name, type, next_run_at };
      }

      if (action === "update") {
        const id = requireId(a);
        if (typeof id !== "number") return id;
        const existing = getPulseById(db, id);
        if (!existing) {
          return err(`no pulse with id ${id}`, "Use pulse({ action: 'list' }) to see IDs.");
        }
        if (existing.running === 1) {
          return err(
            "cannot update a running pulse",
            "Wait for it to finish, or disable it first.",
          );
        }

        const wasOneOff = existing.interval_ms == null && existing.cron_expr == null;
        const willChangeSchedule = a.cron !== undefined || a.interval_seconds !== undefined;
        if (wasOneOff && willChangeSchedule) {
          return err(
            "cannot change scheduling mode on a one-off pulse",
            "Delete it and create a new recurring pulse instead.",
          );
        }
        if (!wasOneOff && a.at?.trim()) {
          return err(
            "cannot switch a recurring pulse to one-off via update",
            "Delete it and create a new one-off pulse instead.",
          );
        }

        if (a.command !== undefined && existing.type === "builtin") {
          return err(
            "cannot change the command of a builtin pulse",
            "Builtin pulses only allow changes to interval, cron, and timeout.",
          );
        }

        let interval_ms: number | null = existing.interval_ms;
        let cron_expr: string | null = existing.cron_expr;
        let scheduleChanged = false;

        if (a.interval_seconds !== undefined && a.interval_seconds !== null) {
          if (a.interval_seconds < MIN_INTERVAL_S) {
            return err(
              "interval must be >= 60 seconds",
              `Got ${a.interval_seconds}. Minimum is 60 (1 minute).`,
            );
          }
          interval_ms = a.interval_seconds * 1000;
          cron_expr = null;
          scheduleChanged = true;
        }
        if (a.cron?.trim()) {
          try {
            nextCronRun(a.cron.trim(), new Date());
          } catch {
            return err(
              "invalid cron expression",
              "Use 5 fields: 'min hour day month weekday'. " +
                `Shortcuts: @hourly, @daily, @weekly, @monthly. Got: '${a.cron}'.`,
            );
          }
          cron_expr = a.cron.trim();
          interval_ms = null;
          scheduleChanged = true;
        }

        const timeoutMs =
          a.timeout_minutes !== undefined && a.timeout_minutes > 0
            ? a.timeout_minutes * 60 * 1000
            : existing.timeout_ms;
        if (timeoutMs < MIN_TIMEOUT_S * 1000) {
          return err("timeout must be >= 10 seconds", "Provide a larger timeout_minutes value.");
        }

        let next_run_at = existing.next_run_at;
        if (scheduleChanged) {
          if (interval_ms != null && interval_ms > 0) {
            next_run_at = new Date(Date.now() + interval_ms).toISOString();
          } else if (cron_expr) {
            next_run_at = nextCronRun(cron_expr, new Date()).toISOString();
          }
        }

        const cmd =
          a.command !== undefined && existing.type !== "builtin"
            ? a.command.trim()
            : existing.command;
        if (existing.type !== "builtin" && (!cmd || !cmd.length)) {
          return err("command cannot be empty", "Provide a non-empty command or prompt.");
        }

        db.prepare(
          `UPDATE pulses SET
            command = ?,
            interval_ms = ?,
            cron_expr = ?,
            timeout_ms = ?,
            next_run_at = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE id = ?`,
        ).run(cmd, interval_ms, cron_expr, timeoutMs, next_run_at, existing.id);

        return { ok: true, id, name: existing.name, next_run_at };
      }

      if (action === "enable" || action === "disable") {
        const id = requireId(a);
        if (typeof id !== "number") return id;
        const p = getPulseById(db, id);
        if (!p) return err(`no pulse with id ${id}`, "Use pulse({ action: 'list' }) to see IDs.");
        db.prepare(
          "UPDATE pulses SET enabled = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
        ).run(action === "enable" ? 1 : 0, p.id);
        return { ok: true, id, name: p.name, enabled: action === "enable" };
      }

      if (action === "delete") {
        const id = requireId(a);
        if (typeof id !== "number") return id;
        const p = getPulseById(db, id);
        if (!p) return err(`no pulse with id ${id}`, "Use pulse({ action: 'list' }) to see IDs.");
        if (p.type === "builtin") {
          return err(
            "cannot delete builtin pulses",
            `'${p.name}' is a system pulse. Use disable instead: pulse({ action: 'disable', id: ${id} }).`,
          );
        }
        if (p.running === 1) {
          return err(
            "cannot delete a running pulse",
            `Disable it first: pulse({ action: 'disable', id: ${id} }), then delete.`,
          );
        }
        db.prepare("DELETE FROM pulses WHERE id = ?").run(p.id);
        return { ok: true, id, name: p.name };
      }

      return err(
        `unknown action: '${action}'`,
        "Valid actions: list, show, create, update, enable, disable, delete.",
      );
    },
  });
}
