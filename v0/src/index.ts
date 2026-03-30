import "./lib/suppress_warnings.ts";
import { defineCommand, runMain } from "citty";
import { createAgent } from "./agent.ts";
import { executeRun } from "./channels/cli/run.ts";
import { runTui } from "./channels/tui/tui.ts";
import { sealSessionTail } from "./core/chat/seal_session_tail.ts";
import { createSession } from "./core/chat/session.ts";
import type { InterceptorContext, OneshotContext } from "./core/chat/turn.ts";
import type { Agent } from "./core/chat/types.ts";
import { registerBuiltins } from "./core/commands/builtins.ts";
import { createRegistry } from "./core/commands/registry.ts";
import { createDelegationTools } from "./core/delegation/build_tools.ts";
import { registerInnkeeperSubsystem } from "./core/innkeeper/register.ts";
import { createSubsystemRegistry } from "./core/interceptor/registry.ts";
import { createDeflectionTools } from "./core/interceptor/self_call.ts";
import { createOneshotRegistry } from "./core/oneshot/registry.ts";
import { registerTitleOneshot } from "./core/oneshot/title.ts";
import { ensureDefaultPulses } from "./core/pulse/defaults.ts";
import { startPulse } from "./core/pulse/engine.ts";
import type { RunAgentTask } from "./core/pulse/types.ts";
import { registerScribeSubsystem } from "./core/scribe/register.ts";
import { ensureApiKey } from "./core/settings/ensure_api_key.ts";
import { getSettingInt } from "./core/settings/get.ts";
import { renderSoul } from "./core/souls/render.ts";
import { createTools } from "./core/tools/index.ts";
import { createPulseTool } from "./core/tools/pulse.ts";
import { createSettingsTool } from "./core/tools/settings.ts";
import { ensureHome, resolveHome } from "./home.ts";
import { VERSION } from "./lib/version.ts";
import type { RuntimeContext } from "./runtime.ts";
import { closeRuntime, initRuntime } from "./runtime.ts";

const PULSE_HINT = `This is an autonomous scheduled task running in the background.
There is no live user in this session. Execute the task fully -- do not ask
questions or request clarification. Make reasonable decisions and proceed.
If you need to notify the user, use the available communication tools.`;

function buildInterceptorContext(ctx: RuntimeContext): InterceptorContext {
  const registry = createSubsystemRegistry();
  registerScribeSubsystem(registry, ctx.soulsDb, ctx.soulIds.scribe);
  registerInnkeeperSubsystem(registry, ctx.soulsDb, ctx.soulIds.innkeeper);
  const subsystemDbs = new Map<string, import("./lib/database_handle.ts").DatabaseHandle>();
  subsystemDbs.set("scribe", ctx.codexDb);
  subsystemDbs.set("innkeeper", ctx.affinityDb);
  return {
    registry,
    config: ctx.config.interceptor,
    subsystemDbs,
    modelSmall: ctx.config.model_small,
  };
}

function buildOneshotContext(ctx: RuntimeContext): OneshotContext {
  const registry = createOneshotRegistry();
  registerTitleOneshot(registry);
  return {
    registry,
    modelSmall: ctx.config.model_small,
    timeoutMs: getSettingInt("GHOSTPAW_ONESHOT_TIMEOUT_MS") ?? 60_000,
  };
}

function createPulseRunAgentTask(ctx: RuntimeContext, agent: Agent): RunAgentTask {
  return async (name, prompt, signal) => {
    const systemPrompt = `${renderSoul(ctx.soulsDb, ctx.soulIds.ghostpaw)}\n\n${PULSE_HINT}`;
    const session = createSession(ctx.db, ctx.config.model, systemPrompt, {
      purpose: "pulse",
      title: name,
      soulId: ctx.soulIds.ghostpaw,
    });
    try {
      const result = await Promise.race([
        agent.executeTurn(session.id, prompt),
        new Promise<never>((_, reject) => {
          if (signal.aborted) return reject(new Error("aborted"));
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
      ]);
      sealSessionTail(ctx.db, session.id);
      return {
        exitCode: result.succeeded ? 0 : 1,
        sessionId: session.id,
        output: result.content.slice(0, 2048),
        error: result.succeeded ? undefined : result.content.slice(0, 2048),
      };
    } catch (err) {
      return {
        exitCode: 1,
        sessionId: session.id,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

function initShared(args: Record<string, unknown>) {
  const homePath = resolveHome({ home: args.home as string | undefined });
  ensureHome(homePath);
  const workspace = (args.workspace as string) || process.env.GHOSTPAW_WORKSPACE || process.cwd();
  return { homePath, workspace };
}

const runCommand = defineCommand({
  meta: { name: "run", description: "Run a single turn against the LLM" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    workspace: { type: "string", description: "Working directory" },
    prompt: { type: "positional", description: "The prompt to send", required: false },
    session: { type: "string", alias: "s", description: "Continue session by ID" },
    model: { type: "string", alias: "m", description: "Override model" },
    "no-stream": { type: "boolean", description: "Wait for full response", default: false },
    ghost: {
      type: "boolean",
      description: "Bypass subsystem interceptors for this turn",
      default: false,
    },
  },
  async run({ args }) {
    const { homePath, workspace } = initShared(args);
    const ctx = await initRuntime(homePath, workspace);
    if (!ensureApiKey(homePath)) process.exit(1);

    const interceptorCtx = buildInterceptorContext(ctx);
    const oneshotCtx = buildOneshotContext(ctx);
    const tools = [
      ...createTools(workspace),
      ...createDeflectionTools(interceptorCtx.registry),
      ...createDelegationTools(ctx, workspace),
      createPulseTool(ctx.db),
      createSettingsTool(ctx.db),
    ];
    const agent = createAgent({
      db: ctx.db,
      tools,
      interceptor: interceptorCtx,
      oneshots: oneshotCtx,
    });
    ensureDefaultPulses(ctx.db);
    const scheduler = startPulse(ctx, createPulseRunAgentTask(ctx, agent));

    try {
      await executeRun(ctx, agent, {
        prompt: args.prompt as string | undefined,
        session: args.session as string | undefined,
        model: args.model as string | undefined,
        noStream: args["no-stream"] as boolean | undefined,
        ghost: args.ghost as boolean | undefined,
      });
    } finally {
      await scheduler.stop();
      closeRuntime(ctx);
    }
  },
});

const sessionsCommand = defineCommand({
  meta: { name: "sessions", description: "List all sessions" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    workspace: { type: "string", description: "Working directory" },
  },
  async run({ args }) {
    const { homePath, workspace } = initShared(args);
    const ctx = await initRuntime(homePath, workspace);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      const result = await registry.execute("sessions", "", { ...ctx, sessionId: null });
      console.log(result.text);
    } finally {
      closeRuntime(ctx);
    }
  },
});

const modelCliCommand = defineCommand({
  meta: { name: "model", description: "Show or change the default model" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    workspace: { type: "string", description: "Working directory" },
    name: { type: "positional", description: "Model name to set", required: false },
  },
  async run({ args }) {
    const { homePath, workspace } = initShared(args);
    const ctx = await initRuntime(homePath, workspace);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      const modelArg = (args.name as string) ?? "";
      const result = await registry.execute("model", modelArg, { ...ctx, sessionId: null });
      console.log(result.text);
    } finally {
      closeRuntime(ctx);
    }
  },
});

const configCliCommand = defineCommand({
  meta: { name: "config", description: "List, get, set, reset, or undo config values" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    workspace: { type: "string", description: "Working directory" },
    key: { type: "positional", description: "Config key or action (undo/reset)", required: false },
    value: { type: "positional", description: "Config value or target key", required: false },
  },
  async run({ args }) {
    const { homePath, workspace } = initShared(args);
    const ctx = await initRuntime(homePath, workspace);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      const configArgs = [args.key, args.value].filter(Boolean).join(" ");
      const result = await registry.execute("config", configArgs, { ...ctx, sessionId: null });
      console.log(result.text);
    } finally {
      closeRuntime(ctx);
    }
  },
});

const secretCliCommand = defineCommand({
  meta: { name: "secret", description: "List, get, set, reset, or undo secrets" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    workspace: { type: "string", description: "Working directory" },
    key: { type: "positional", description: "Secret key or action (undo/reset)", required: false },
    value: { type: "positional", description: "Secret value or target key", required: false },
  },
  async run({ args }) {
    const { homePath, workspace } = initShared(args);
    const ctx = await initRuntime(homePath, workspace);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      let { key, value } = args;
      const actionKeywords = new Set(["undo", "reset", "list"]);
      if (key && !actionKeywords.has(key) && !value) {
        const { readSecret } = await import("./lib/read_secret.ts");
        value = await readSecret(`${key}: `);
        if (!value) {
          console.error("error: no value provided");
          process.exitCode = 1;
          return;
        }
      }
      const secretArgs = [key, value].filter(Boolean).join(" ");
      const result = await registry.execute("secret", secretArgs, { ...ctx, sessionId: null });
      console.log(result.text);
    } finally {
      closeRuntime(ctx);
    }
  },
});

const main = defineCommand({
  meta: {
    name: "ghostpaw",
    version: VERSION,
    description: "Single-process AI agent runtime",
  },
  args: {
    home: {
      type: "string",
      description: "Path to ghostpaw home directory (default: ~/.ghostpaw)",
    },
    workspace: {
      type: "string",
      description: "Working directory for file tools (default: cwd)",
    },
  },
  subCommands: {
    run: runCommand,
    sessions: sessionsCommand,
    model: modelCliCommand,
    config: configCliCommand,
    secret: secretCliCommand,
  },
  async run({ args }) {
    const subCmds = new Set(["run", "sessions", "model", "config", "secret"]);
    const firstPositional = process.argv.slice(2).find((a) => !a.startsWith("-"));
    if (firstPositional && subCmds.has(firstPositional)) return;

    if (!process.stdin.isTTY) {
      console.error(
        "error: no TTY detected and no subcommand given. Use 'ghostpaw run' for non-interactive mode.",
      );
      process.exit(1);
    }

    const homePath = resolveHome({ home: args.home as string | undefined });
    ensureHome(homePath);
    const workspace = (args.workspace as string) || process.env.GHOSTPAW_WORKSPACE || process.cwd();

    const ctx = await initRuntime(homePath, workspace);
    if (!ensureApiKey(homePath)) process.exit(1);

    const interceptorCtx = buildInterceptorContext(ctx);
    const oneshotCtx = buildOneshotContext(ctx);
    const tools = [
      ...createTools(workspace),
      ...createDeflectionTools(interceptorCtx.registry),
      ...createDelegationTools(ctx, workspace),
      createPulseTool(ctx.db),
      createSettingsTool(ctx.db),
    ];
    const agent = createAgent({
      db: ctx.db,
      tools,
      interceptor: interceptorCtx,
      oneshots: oneshotCtx,
    });
    ensureDefaultPulses(ctx.db);
    const scheduler = startPulse(ctx, createPulseRunAgentTask(ctx, agent));
    const registry = createRegistry();
    registerBuiltins(registry);

    try {
      await runTui(ctx, agent, registry);
    } finally {
      await scheduler.stop();
      closeRuntime(ctx);
    }
  },
});

runMain(main);
