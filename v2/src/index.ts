import { resolve } from "node:path";
import { defineCommand, runMain } from "citty";
import { initSecretsTable, loadSecretsIntoEnv, syncProviderKeys } from "./core/secrets/index.ts";
import { openDatabase } from "./lib/database.ts";
import { isEntrypoint } from "./lib/is_entrypoint.ts";
import { suppressWarnings } from "./lib/suppress_warnings.ts";
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

      server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          log.error(`port ${webConfig.port} is already in use (set WEB_UI_PORT to change)`);
          process.exit(1);
        }
        throw err;
      });
      server.listen(webConfig.port, webConfig.host, () => {
        log.done(`web ui: http://${webConfig.host}:${webConfig.port}`);
      });
    } else {
      log.info("web ui disabled (set WEB_UI_PASSWORD to enable)");
    }
  },
  subCommands: {
    secrets: () => import("./channels/cli/secrets.ts").then((m) => m.default),
  },
});

if (isEntrypoint(import.meta.url)) {
  suppressWarnings();
  runMain(main);
}
