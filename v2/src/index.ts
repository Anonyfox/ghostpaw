import { resolve } from "node:path";
import { defineCommand, runMain } from "citty";
import { initChatTables } from "./core/chat/index.ts";
import { initConfigTable } from "./core/config/index.ts";
import { initMemoryTable } from "./core/memory/index.ts";
import { initSecretsTable, loadSecretsIntoEnv, syncProviderKeys } from "./core/secrets/index.ts";
import { ensureMandatorySouls, initSoulsTables } from "./core/souls/index.ts";
import { isEntrypoint, openDatabase, suppressWarnings } from "./lib/index.ts";
import { banner, log } from "./lib/terminal/index.ts";

declare const __VERSION__: string | undefined;
const VERSION = typeof __VERSION__ === "string" ? __VERSION__ : "0.0.0-dev";

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
  },
  setup({ args }) {
    process.env.GHOSTPAW_WORKSPACE = resolve(args.workspace ?? ".");
  },
  async run() {
    banner("ghostpaw", VERSION);

    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const db = await openDatabase(resolve(workspace, "ghostpaw.db"));
    initSecretsTable(db);
    initConfigTable(db);
    initChatTables(db);
    initMemoryTable(db);
    initSoulsTables(db);
    ensureMandatorySouls(db);
    loadSecretsIntoEnv(db);
    syncProviderKeys(db);

    const { prepareWeb } = await import("./channels/cli/prepare_web.ts");
    const webConfig = await prepareWeb(db, VERSION);

    if (webConfig) {
      const clientJs = (await import("embedded:client-js")).default;
      const bootstrapCss = (await import("embedded:bootstrap-css")).default;
      const { createWebServer } = await import("./channels/web/index.ts");

      const server = createWebServer({
        ...webConfig,
        clientJs,
        bootstrapCss,
        db,
      });

      await new Promise<void>((resolve, reject) => {
        server.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            log.error(`port ${webConfig.port} is already in use (set WEB_UI_PORT to change)`);
            process.exit(1);
          }
          reject(err);
        });
        server.listen(webConfig.port, webConfig.host, () => {
          log.done(`web ui: http://${webConfig.host}:${webConfig.port}`);
          resolve();
        });
      });
    } else {
      log.info("web ui disabled (set WEB_UI_PASSWORD to enable)");
    }

    if (process.stdin.isTTY && process.stdout.isTTY) {
      const { runTui } = await import("./channels/tui/index.ts");
      await runTui({ db, version: VERSION });
    }
  },
  subCommands: {
    run: () => import("./channels/cli/run.ts").then((m) => m.default),
    secrets: () => import("./channels/cli/secrets.ts").then((m) => m.default),
    config: () => import("./channels/cli/config.ts").then((m) => m.default),
  },
});

if (isEntrypoint(import.meta.url)) {
  suppressWarnings();
  runMain(main);
}
