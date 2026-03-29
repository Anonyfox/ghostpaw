import "./lib/suppress_warnings.ts";
import { defineCommand, runMain } from "citty";
import { createAgent } from "./agent.ts";
import { executeRun } from "./channels/cli/run.ts";
import { runTui } from "./channels/tui/tui.ts";
import { createSession } from "./core/chat/session.ts";
import type { InterceptorContext, OneshotContext } from "./core/chat/turn.ts";
import type { Agent } from "./core/chat/types.ts";
import { registerBuiltins } from "./core/commands/builtins.ts";
import { createRegistry } from "./core/commands/registry.ts";
import { openDatabase } from "./core/db/open.ts";
import { openAffinityDatabase } from "./core/db/open_affinity.ts";
import { openCodexDatabase } from "./core/db/open_codex.ts";
import { registerInnkeeperSubsystem } from "./core/innkeeper/register.ts";
import { createSubsystemRegistry } from "./core/interceptor/registry.ts";
import { createDeflectionTools } from "./core/interceptor/self_call.ts";
import { createOneshotRegistry } from "./core/oneshot/registry.ts";
import { registerTitleOneshot } from "./core/oneshot/title.ts";
import { ensureDefaultPulses } from "./core/pulse/defaults.ts";
import { startPulse } from "./core/pulse/engine.ts";
import type { RunAgentTask } from "./core/pulse/types.ts";
import { registerScribeSubsystem } from "./core/scribe/register.ts";
import { applySettingsToEnv } from "./core/settings/apply_settings_to_env.ts";
import type { Config } from "./core/settings/build_config.ts";
import { buildConfig } from "./core/settings/build_config.ts";
import { ensureApiKey } from "./core/settings/ensure_api_key.ts";
import { getSettingInt } from "./core/settings/get.ts";
import { resolveModels } from "./core/settings/resolve_models.ts";
import { syncEnvToSettings } from "./core/settings/sync_env_to_settings.ts";
import { createTools } from "./core/tools/index.ts";
import { createPulseTool } from "./core/tools/pulse.ts";
import { createSettingsTool } from "./core/tools/settings.ts";
import { ensureHome, resolveHome } from "./home.ts";
import type { DatabaseHandle } from "./lib/database_handle.ts";
import { readSecret } from "./lib/read_secret.ts";
import { VERSION } from "./lib/version.ts";

const PULSE_HINT = `This is an autonomous scheduled task running in the background.
There is no live user in this session. Execute the task fully -- do not ask
questions or request clarification. Make reasonable decisions and proceed.
If you need to notify the user, use the available communication tools.`;

function initShared(args: Record<string, unknown>) {
  const homePath = resolveHome({ home: args.home as string | undefined });
  ensureHome(homePath);
  const workspace = (args.workspace as string) || process.env.GHOSTPAW_WORKSPACE || process.cwd();
  return { homePath, workspace };
}

async function initSettings(db: DatabaseHandle): Promise<void> {
  syncEnvToSettings(db);
  applySettingsToEnv(db);
  resolveModels(db);
}

function buildInterceptorContext(
  config: Config,
  codexDb: DatabaseHandle,
  affinityDb: DatabaseHandle,
): InterceptorContext {
  const registry = createSubsystemRegistry();
  registerScribeSubsystem(registry);
  registerInnkeeperSubsystem(registry);
  const subsystemDbs = new Map<string, DatabaseHandle>();
  subsystemDbs.set("scribe", codexDb);
  subsystemDbs.set("innkeeper", affinityDb);
  return { registry, config: config.interceptor, subsystemDbs, modelSmall: config.model_small };
}

function buildOneshotContext(config: Config): OneshotContext {
  const registry = createOneshotRegistry();
  registerTitleOneshot(registry);
  return {
    registry,
    modelSmall: config.model_small,
    timeoutMs: getSettingInt("GHOSTPAW_ONESHOT_TIMEOUT_MS") ?? 60_000,
  };
}

function createPulseRunAgentTask(db: DatabaseHandle, config: Config, agent: Agent): RunAgentTask {
  return async (name, prompt, signal) => {
    const systemPrompt = `${config.system_prompt}\n\n${PULSE_HINT}`;
    const session = createSession(db, config.model, systemPrompt, {
      purpose: "pulse",
      title: name,
    });
    try {
      const result = await Promise.race([
        agent.executeTurn(session.id, prompt),
        new Promise<never>((_, reject) => {
          if (signal.aborted) return reject(new Error("aborted"));
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
      ]);
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
    const db = await openDatabase(homePath);
    await initSettings(db);
    if (!ensureApiKey(homePath)) process.exit(1);

    const config = buildConfig();
    const codexDb = await openCodexDatabase(homePath);
    const affinityDb = await openAffinityDatabase(homePath);
    const interceptorCtx = buildInterceptorContext(config, codexDb, affinityDb);
    const oneshotCtx = buildOneshotContext(config);
    const tools = [
      ...createTools(workspace),
      ...createDeflectionTools(interceptorCtx.registry),
      createPulseTool(db),
      createSettingsTool(db),
    ];
    const agent = createAgent({ db, tools, interceptor: interceptorCtx, oneshots: oneshotCtx });
    ensureDefaultPulses(db);
    const scheduler = startPulse(db, createPulseRunAgentTask(db, config, agent));

    try {
      await executeRun(db, agent, config, {
        prompt: args.prompt as string | undefined,
        session: args.session as string | undefined,
        model: args.model as string | undefined,
        noStream: args["no-stream"] as boolean | undefined,
        ghost: args.ghost as boolean | undefined,
      });
    } finally {
      await scheduler.stop();
      affinityDb.close();
      codexDb.close();
      db.close();
    }
  },
});

const sessionsCommand = defineCommand({
  meta: { name: "sessions", description: "List all sessions" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
  },
  async run({ args }) {
    const { homePath } = initShared(args);
    const db = await openDatabase(homePath);
    await initSettings(db);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      const result = await registry.execute("sessions", "", { db, homePath, sessionId: null });
      console.log(result.text);
    } finally {
      db.close();
    }
  },
});

const modelCliCommand = defineCommand({
  meta: { name: "model", description: "Show or change the default model" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    name: { type: "positional", description: "Model name to set", required: false },
  },
  async run({ args }) {
    const { homePath } = initShared(args);
    const db = await openDatabase(homePath);
    await initSettings(db);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      const modelArg = (args.name as string) ?? "";
      const result = await registry.execute("model", modelArg, { db, homePath, sessionId: null });
      console.log(result.text);
    } finally {
      db.close();
    }
  },
});

const configCliCommand = defineCommand({
  meta: { name: "config", description: "List, get, set, reset, or undo config values" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    key: { type: "positional", description: "Config key or action (undo/reset)", required: false },
    value: { type: "positional", description: "Config value or target key", required: false },
  },
  async run({ args }) {
    const { homePath } = initShared(args);
    const db = await openDatabase(homePath);
    await initSettings(db);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      const configArgs = [args.key, args.value].filter(Boolean).join(" ");
      const result = await registry.execute("config", configArgs, {
        db,
        homePath,
        sessionId: null,
      });
      console.log(result.text);
    } finally {
      db.close();
    }
  },
});

const secretCliCommand = defineCommand({
  meta: { name: "secret", description: "List, get, set, reset, or undo secrets" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    key: { type: "positional", description: "Secret key or action (undo/reset)", required: false },
    value: { type: "positional", description: "Secret value or target key", required: false },
  },
  async run({ args }) {
    const { homePath } = initShared(args);
    const db = await openDatabase(homePath);
    await initSettings(db);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      let { key, value } = args;
      const actionKeywords = new Set(["undo", "reset", "list"]);
      if (key && !actionKeywords.has(key) && !value) {
        value = await readSecret(`${key}: `);
        if (!value) {
          console.error("error: no value provided");
          process.exitCode = 1;
          return;
        }
      }
      const secretArgs = [key, value].filter(Boolean).join(" ");
      const result = await registry.execute("secret", secretArgs, {
        db,
        homePath,
        sessionId: null,
      });
      console.log(result.text);
    } finally {
      db.close();
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

    const db = await openDatabase(homePath);
    await initSettings(db);
    if (!ensureApiKey(homePath)) process.exit(1);

    const config = buildConfig();
    const workspace = (args.workspace as string) || process.env.GHOSTPAW_WORKSPACE || process.cwd();
    const codexDb = await openCodexDatabase(homePath);
    const affinityDb = await openAffinityDatabase(homePath);
    const interceptorCtx = buildInterceptorContext(config, codexDb, affinityDb);
    const oneshotCtx = buildOneshotContext(config);
    const tools = [
      ...createTools(workspace),
      ...createDeflectionTools(interceptorCtx.registry),
      createPulseTool(db),
      createSettingsTool(db),
    ];
    const agent = createAgent({ db, tools, interceptor: interceptorCtx, oneshots: oneshotCtx });
    ensureDefaultPulses(db);
    const scheduler = startPulse(db, createPulseRunAgentTask(db, config, agent));
    const registry = createRegistry();
    registerBuiltins(registry);

    try {
      await runTui(db, agent, registry, config, homePath);
    } finally {
      await scheduler.stop();
      affinityDb.close();
      codexDb.close();
      db.close();
    }
  },
});

runMain(main);
