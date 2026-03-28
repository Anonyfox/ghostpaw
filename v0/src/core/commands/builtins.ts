import { deleteFromOrdinal, getMessages } from "../chat/messages.ts";
import { createSession, getSession, listSessions, updateSessionModel } from "../chat/session.ts";
import { readConfig, writeConfig } from "../config/config.ts";
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
    const config = readConfig(ctx.homePath);
    const session = createSession(ctx.db, config.model, config.system_prompt);
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
  description: "Show or change the model (updates session AND config default)",
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
      const config = readConfig(ctx.homePath);
      return { text: `Default model: ${config.model}` };
    }

    if (ctx.sessionId) {
      updateSessionModel(ctx.db, ctx.sessionId, modelName);
    }

    const config = readConfig(ctx.homePath);
    config.model = modelName;
    writeConfig(ctx.homePath, config);

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

const configCommand: Command = {
  name: "config",
  description: "Show or edit config values",
  args: "[key] [value]",
  slash: false,
  cli: true,
  async execute(ctx, args) {
    const parts = args.trim().split(/\s+/);
    const config = readConfig(ctx.homePath);

    if (!parts[0] || parts[0] === "") {
      return { text: JSON.stringify(config, null, 2) };
    }

    const key = parts[0];
    const value = parts.slice(1).join(" ");

    if (!value) {
      const val = (config as unknown as Record<string, unknown>)[key];
      if (val === undefined) return { text: `Unknown config key: ${key}` };
      return { text: `${key} = ${JSON.stringify(val)}` };
    }

    if (key === "model") {
      config.model = value;
    } else if (key === "system_prompt") {
      config.system_prompt = value;
    } else if (key.startsWith("api_keys.")) {
      const provider = key.slice("api_keys.".length);
      config.api_keys[provider] = value;
    } else {
      return {
        text: `Unknown config key: ${key}. Valid: model, system_prompt, api_keys.<provider>`,
      };
    }

    writeConfig(ctx.homePath, config);
    return { text: `Set ${key} = ${value}` };
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
  registry.register(configCommand);
  registry.register(quitCommand);
}
