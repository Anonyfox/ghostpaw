import { deleteFromOrdinal, getMessages } from "../chat/messages.ts";
import { createSession, getSession, listSessions, updateSessionModel } from "../chat/session.ts";
import { canonicalizeKey } from "../settings/canonicalize.ts";
import { getSetting } from "../settings/get.ts";
import { KNOWN_SETTINGS } from "../settings/known.ts";
import { listSettings } from "../settings/list.ts";
import { resetSetting } from "../settings/reset.ts";
import { setSetting } from "../settings/set.ts";
import { undoSetting } from "../settings/undo.ts";
import { renderSoul } from "../souls/render.ts";
import type { CommandRegistry } from "./registry.ts";
import type { Command } from "./types.ts";

const helpCommand: Command = {
  name: "help",
  description: "List available commands or get details about a specific command",
  args: "[command]",
  slash: true,
  cli: true,
  async execute(_ctx, _args) {
    // ctx is not used directly here but we need the registry reference
    return { text: "" }; // placeholder — replaced in registerBuiltins
  },
};

const newCommand: Command = {
  name: "new",
  description: "Create a new chat session",
  slash: true,
  cli: false,
  async execute(ctx) {
    const systemPrompt = renderSoul(ctx.soulsDb, ctx.soulIds.ghostpaw);
    const session = createSession(ctx.db, ctx.config.model, systemPrompt, {
      soulId: ctx.soulIds.ghostpaw,
    });
    return {
      text: `Created session ${session.id}`,
      action: { type: "new_session", sessionId: session.id },
    };
  },
};

const sessionsCommand: Command = {
  name: "sessions",
  description: "List all chat sessions",
  slash: true,
  cli: true,
  async execute(ctx) {
    const sessions = listSessions(ctx.db);
    if (sessions.length === 0) {
      return { text: "No sessions yet." };
    }
    const lines = sessions.map((s) => {
      const title = s.title ?? "(untitled)";
      const msgCount = (s as unknown as Record<string, unknown>).message_count ?? "?";
      const active = s.id === ctx.sessionId ? " *" : "";
      return `  ${s.id}. ${title} (${msgCount} msgs, ${s.model})${active}`;
    });
    return { text: lines.join("\n") };
  },
};

const switchCommand: Command = {
  name: "switch",
  description: "Switch to a different session by ID",
  args: "<id>",
  slash: true,
  cli: false,
  async execute(ctx, args) {
    const id = Number.parseInt(args.trim(), 10);
    if (Number.isNaN(id)) {
      return { text: "Usage: /switch <session_id>" };
    }
    const session = getSession(ctx.db, id);
    if (!session) {
      return { text: `Session ${id} not found.` };
    }
    return {
      text: `Switched to session ${id} (${session.title ?? "untitled"})`,
      action: { type: "switch_session", sessionId: id },
    };
  },
};

const modelCommand: Command = {
  name: "model",
  description: "Show or change the model (updates session AND default setting)",
  args: "[model_name]",
  slash: true,
  cli: true,
  async execute(ctx, args) {
    const modelName = args.trim();
    if (!modelName) {
      if (ctx.sessionId) {
        const session = getSession(ctx.db, ctx.sessionId);
        if (session) return { text: `Current model: ${session.model}` };
      }
      return { text: `Default model: ${getSetting("GHOSTPAW_MODEL") ?? "claude-sonnet-4-5"}` };
    }

    if (ctx.sessionId) {
      updateSessionModel(ctx.db, ctx.sessionId, modelName);
    }

    setSetting(ctx.db, "model", modelName);

    return {
      text: `Model changed to ${modelName}`,
      action: { type: "model_changed", model: modelName },
    };
  },
};

const undoCommand: Command = {
  name: "undo",
  description: "Delete the last user+assistant exchange",
  slash: true,
  cli: false,
  async execute(ctx) {
    if (!ctx.sessionId) {
      return { text: "No active session." };
    }
    const messages = getMessages(ctx.db, ctx.sessionId);
    if (messages.length === 0) {
      return { text: "No messages to undo." };
    }

    let cutpoint = messages.length;
    while (cutpoint > 0 && messages[cutpoint - 1].role !== "user") {
      cutpoint--;
    }
    if (cutpoint > 0) {
      cutpoint--; // include the user message
    }

    if (cutpoint === messages.length) {
      return { text: "Nothing to undo." };
    }

    const fromOrdinal = messages[cutpoint].ordinal;
    const removed = deleteFromOrdinal(ctx.db, ctx.sessionId, fromOrdinal);

    return {
      text: `Removed ${removed} message${removed === 1 ? "" : "s"}`,
      action: { type: "undo", removedCount: removed },
    };
  },
};

function formatSettingsList(
  db: import("../../lib/database_handle.ts").DatabaseHandle,
  secretOnly: boolean,
): string {
  const entries = listSettings(db);
  const filtered = secretOnly ? entries.filter((e) => e.secret) : entries.filter((e) => !e.secret);
  if (filtered.length === 0) return secretOnly ? "No secrets configured." : "No config values set.";

  let currentCategory = "";
  const lines: string[] = [];
  for (const e of filtered) {
    if (e.category !== currentCategory) {
      if (lines.length > 0) lines.push("");
      lines.push(`[${e.category}]`);
      currentCategory = e.category;
    }
    const defaultTag = e.isDefault ? " (default)" : "";
    lines.push(`  ${e.key} = ${e.value}${defaultTag}`);
  }
  return lines.join("\n");
}

function executeSettingsCrud(
  db: import("../../lib/database_handle.ts").DatabaseHandle,
  args: string,
  defaultSecret: boolean,
): string {
  const parts = args.trim().split(/\s+/);
  const rawKey = parts[0];
  const rawValue = parts.slice(1).join(" ");

  if (!rawKey || rawKey === "") {
    return formatSettingsList(db, defaultSecret);
  }

  if (!rawValue) {
    if (rawKey === "undo") {
      return "Usage: /config undo <key> or /secret undo <key>";
    }
    if (rawKey === "reset") {
      return "Usage: /config reset <key> or /secret reset <key>";
    }
    const key = canonicalizeKey(rawKey);
    const known = KNOWN_SETTINGS[key];
    const val = getSetting(key);
    if (val === undefined && !known) return `Unknown setting: ${key}`;
    const isSecret = known?.secret ?? false;
    const display = isSecret ? "***" : (val ?? known?.defaultValue ?? "(not set)");
    return `${key} = ${display}`;
  }

  if (rawKey === "undo") {
    const key = canonicalizeKey(rawValue);
    const result = undoSetting(db, key);
    if (!result.undone) return `Nothing to undo for: ${key}`;
    const current = getSetting(key);
    return `Undone ${key} -> ${current ?? "(default)"}`;
  }

  if (rawKey === "reset") {
    const key = canonicalizeKey(rawValue);
    const result = resetSetting(db, key);
    if (result.deleted === 0) return `No setting found: ${key}`;
    return `Reset ${key} to default (${result.deleted} entries cleared)`;
  }

  const result = setSetting(db, rawKey, rawValue, { secret: defaultSecret });
  let msg = `Set ${result.key} = ${rawValue}`;
  if (result.warning) msg += `\nWarning: ${result.warning}`;
  return msg;
}

const configCommand: Command = {
  name: "config",
  description: "List, get, set, reset, or undo config values",
  args: "[key|undo|reset] [value|key]",
  slash: true,
  cli: true,
  async execute(ctx, args) {
    return { text: executeSettingsCrud(ctx.db, args, false) };
  },
};

const secretCommand: Command = {
  name: "secret",
  description: "List, get, set, reset, or undo secrets",
  args: "[key|undo|reset] [value|key]",
  slash: true,
  cli: true,
  async execute(ctx, args) {
    return { text: executeSettingsCrud(ctx.db, args, true) };
  },
};

const ghostCommand: Command = {
  name: "ghost",
  description: "Toggle ghost mode (bypass subsystem interceptors)",
  slash: true,
  cli: false,
  async execute() {
    return { text: "", action: { type: "ghost_toggle" } };
  },
};

const quitCommand: Command = {
  name: "quit",
  description: "Exit the application",
  slash: true,
  cli: false,
  hidden: true,
  async execute() {
    return { text: "Goodbye.", action: { type: "quit" } };
  },
};

export function registerBuiltins(registry: CommandRegistry): void {
  const help: Command = {
    ...helpCommand,
    async execute(_ctx, args) {
      if (args.trim()) {
        const cmd = registry.get(args.trim());
        if (!cmd) return { text: `Unknown command: ${args.trim()}` };
        const usage = cmd.args ? ` ${cmd.args}` : "";
        return { text: `/${cmd.name}${usage} — ${cmd.description}` };
      }
      const slashCmds = registry.listSlash();
      const lines = slashCmds.map((c) => {
        const usage = c.args ? ` ${c.args}` : "";
        return `  /${c.name}${usage} — ${c.description}`;
      });
      return { text: `Available commands:\n${lines.join("\n")}` };
    },
  };

  registry.register(help);
  registry.register(newCommand);
  registry.register(sessionsCommand);
  registry.register(switchCommand);
  registry.register(modelCommand);
  registry.register(undoCommand);
  registry.register(ghostCommand);
  registry.register(configCommand);
  registry.register(secretCommand);
  registry.register(quitCommand);
}
