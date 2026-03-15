import { resolve } from "node:path";
import { defineCommand, runMain } from "citty";
import { deleteOldDistilled } from "./core/chat/api/write/index.ts";
import {
  initChatTables,
  initHowlTables,
  recoverOrphanedSessions,
} from "./core/chat/runtime/index.ts";
import { initConfigTable } from "./core/config/runtime/index.ts";
import { initMemoryTable } from "./core/memory/runtime/index.ts";
import { initPackTables } from "./core/pack/runtime/index.ts";
import { initQuestTables } from "./core/quests/index.ts";
import { ensureDefaultSchedules, initScheduleTables } from "./core/schedule/runtime/index.ts";
import {
  initSecretsTable,
  loadSecretsIntoEnv,
  syncProviderKeys,
} from "./core/secrets/runtime/index.ts";
import {
  bootstrapSkills,
  initSkillEventsTables,
  initSkillFragmentsTables,
  initSkillHealthTables,
} from "./core/skills/runtime/index.ts";
import {
  ensureMandatorySouls,
  initSoulShardTables,
  initSoulsTables,
} from "./core/souls/runtime/index.ts";
import { initTrailTables } from "./core/trail/runtime/index.ts";
import { isEntrypoint, openDatabase, suppressWarnings } from "./lib/index.ts";
import { banner, log } from "./lib/terminal/index.ts";

declare const __VERSION__: string | undefined;
const VERSION = typeof __VERSION__ === "string" ? __VERSION__ : "0.0.0-dev";

const subCommands = {
  run: () => import("./channels/cli/run.ts").then((m) => m.default),
  secrets: () => import("./channels/cli/secrets.ts").then((m) => m.default),
  config: () => import("./channels/cli/config.ts").then((m) => m.default),
  souls: () => import("./channels/cli/souls.ts").then((m) => m.default),
  memory: () => import("./channels/cli/memory.ts").then((m) => m.default),
  pack: () => import("./channels/cli/pack.ts").then((m) => m.default),
  sessions: () => import("./channels/cli/sessions.ts").then((m) => m.default),
  skills: () => import("./channels/cli/skills.ts").then((m) => m.default),
  costs: () => import("./channels/cli/costs.ts").then((m) => m.default),
  distill: () => import("./channels/cli/distill.ts").then((m) => m.default),
  haunt: () => import("./channels/cli/haunt.ts").then((m) => m.default),
  howls: () => import("./channels/cli/howls.ts").then((m) => m.default),
  quests: () => import("./channels/cli/quests.ts").then((m) => m.default),
  schedules: () => import("./channels/cli/schedules.ts").then((m) => m.default),
  service: () => import("./channels/cli/service.ts").then((m) => m.default),
  trail: () => import("./channels/cli/trail.ts").then((m) => m.default),
};

const main = defineCommand({
  meta: {
    name: "ghostpaw",
    version: VERSION,
    description: "Spectral wolf, not a bloated beast. Single-file AI agent runtime.",
  },
  args: {
    workspace: {
      type: "string",
      alias: "w",
      default: ".",
      description: "Workspace directory",
    },
    model: {
      type: "string",
      alias: "m",
      description: "Override the LLM model for this session",
    },
  },
  setup({ args }) {
    process.env.GHOSTPAW_WORKSPACE = resolve(args.workspace ?? ".");
  },
  async run() {
    // citty v0.2.1 falls through to parent run() after a subcommand — bail out
    const firstPositional = process.argv.slice(2).find((a) => !a.startsWith("-"));
    if (firstPositional && firstPositional in subCommands) return;

    banner("ghostpaw", VERSION);

    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const db = await openDatabase(resolve(workspace, "ghostpaw.db"));
    initSecretsTable(db);
    initConfigTable(db);
    initChatTables(db);
    initMemoryTable(db);
    initSoulsTables(db);
    initSoulShardTables(db);
    initPackTables(db);
    initHowlTables(db);
    initQuestTables(db);
    initTrailTables(db);
    initScheduleTables(db);
    initSkillEventsTables(db);
    initSkillFragmentsTables(db);
    initSkillHealthTables(db);
    recoverOrphanedSessions(db);
    ensureMandatorySouls(db);
    ensureDefaultSchedules(db);
    loadSecretsIntoEnv(db);
    syncProviderKeys(db);

    const { ensureReady } = await import("./channels/cli/ensure_ready.ts");
    await ensureReady(db);

    const created = bootstrapSkills(workspace, db);
    if (created.length > 0) log.info(`bootstrapped ${created.length} default skills`);

    const { notifySession } = await import("./channels/web/server/routes/chat_ws.ts");
    const { getSession } = await import("./core/chat/api/read/index.ts");
    const { autoResumeDelegation } = await import("./harness/auto_resume_delegation.ts");
    const { formatDelegationMessage } = await import("./harness/notify_background_complete.ts");

    const { createEntity } = await import("./harness/index.ts");
    const entity = createEntity({
      db,
      workspace,
      onBackgroundComplete: (_parentSessionId, outcome) => {
        const channelNotify = (pid: number, o: typeof outcome) => {
          notifySession(pid, {
            type: "background_complete",
            runId: o.childSessionId,
            specialist: o.specialist,
            status: o.status,
          });

          const parentSession = getSession(db, pid);
          if (parentSession?.key?.startsWith("telegram:")) {
            const chatIdStr = parentSession.key.split(":")[1];
            const chatId = Number(chatIdStr);
            const token = process.env.TELEGRAM_BOT_TOKEN;
            if (token && !Number.isNaN(chatId)) {
              import("./channels/telegram/notify.ts").then(({ sendNotification }) => {
                sendNotification({
                  token,
                  chatId,
                  text: formatDelegationMessage(o),
                }).catch(() => {});
              });
            }
          }
        };

        autoResumeDelegation(db, entity, outcome, channelNotify).catch(() => {});
      },
    });

    const { defaultChatFactory } = await import("./harness/chat_factory.ts");
    const { resolveModel } = await import("./harness/model.ts");
    const { distillPending } = await import("./harness/distill_pending.ts");
    distillPending(db, defaultChatFactory, resolveModel(db)).catch(() => {});
    deleteOldDistilled(db);

    const { startScheduler } = await import("./harness/scheduler.ts");
    const scheduler = startScheduler(db, workspace);

    let httpServer: import("node:http").Server | undefined;
    let telegramChannel:
      | { start(): Promise<{ username: string }>; stop(): Promise<void> }
      | undefined;

    const { prepareWeb } = await import("./channels/cli/prepare_web.ts");
    const webConfig = await prepareWeb(db, VERSION);

    if (webConfig) {
      const clientJs = (await import("embedded:client-js")).default;
      const bootstrapCss = (await import("embedded:bootstrap-css")).default;
      const { createWebServer } = await import("./channels/web/index.ts");

      const { customCss } = await import("./channels/web/server/custom_css.ts");
      httpServer = createWebServer({
        ...webConfig,
        clientJs,
        bootstrapCss,
        customCss,
        db,
        entity,
      });

      await new Promise<void>((resolve, reject) => {
        httpServer!.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            log.error(`port ${webConfig.port} is already in use (set WEB_UI_PORT to change)`);
            process.exit(1);
          }
          reject(err);
        });
        httpServer!.listen(webConfig.port, webConfig.host, () => {
          log.done(`web ui: http://${webConfig.host}:${webConfig.port}`);
          resolve();
        });
      });
    } else {
      log.info("web ui disabled (set WEB_UI_PASSWORD to enable)");
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (telegramToken) {
      const { getConfig } = await import("./core/config/api/read/index.ts");
      const { createTelegramChannel } = await import("./channels/telegram/index.ts");

      const allowedRaw = String(getConfig(db, "telegram_allowed_chat_ids") ?? "");
      const allowedChatIds = allowedRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));

      telegramChannel = createTelegramChannel({
        token: telegramToken,
        db,
        entity,
        allowedChatIds: allowedChatIds.length > 0 ? allowedChatIds : undefined,
      });

      try {
        const info = await telegramChannel.start();
        if (info.username === "failed") {
          log.error("telegram failed to connect (check TELEGRAM_BOT_TOKEN)");
        } else if (info.username === "unknown") {
          log.warn("telegram connecting (timed out waiting for confirmation)");
        } else {
          log.done(`telegram: @${info.username}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error(`telegram failed: ${msg}`);
      }
    } else {
      log.info("telegram disabled (set TELEGRAM_BOT_TOKEN to enable)");
    }

    if (process.stdin.isTTY && process.stdout.isTTY) {
      const { runTui } = await import("./channels/tui/index.ts");
      const modelOverride = process.argv
        .slice(2)
        .find((a) => a.startsWith("--model="))
        ?.split("=")[1];
      const mIdx = process.argv.indexOf("-m");
      const modelFlag = modelOverride ?? (mIdx >= 0 ? process.argv[mIdx + 1] : undefined);
      await runTui({ db, version: VERSION, entity, model: modelFlag });
    } else {
      log.info("daemon mode (no TTY)");
      await new Promise<void>((resolve) => {
        const shutdown = () => {
          resolve();
        };
        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);
      });
    }

    log.info("shutting down");
    await scheduler.stop();
    if (telegramChannel) await telegramChannel.stop();
    if (httpServer) httpServer.close();
    await entity.flush();
  },
  subCommands,
});

if (isEntrypoint(import.meta.url)) {
  suppressWarnings();
  runMain(main);
}
