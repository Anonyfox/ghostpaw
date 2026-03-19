import { resolve } from "node:path";
import { defineCommand } from "citty";
import {
  installService,
  resolveServiceConfig,
  serviceLogs,
  serviceStatus,
  uninstallService,
} from "../../lib/service/index.ts";
import { log, style } from "../../lib/terminal/index.ts";

const install = defineCommand({
  meta: { name: "install", description: "Install ghostpaw as a system service" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const config = resolveServiceConfig(workspace);
    log.info(
      `init system: ${config.nodeFlags.length > 0 ? `${style.dim("(legacy flags)")} ` : ""}${style.cyan(serviceStatus(workspace).initSystem)}`,
    );

    const result = installService(config);
    if (result.success) {
      log.done(result.message);
      if (result.path) log.info(`  ${style.dim(result.path)}`);
    } else {
      log.error(result.message);
      process.exitCode = 1;
    }
  },
});

const uninstall = defineCommand({
  meta: { name: "uninstall", description: "Remove ghostpaw system service" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const result = uninstallService(workspace);
    if (result.success) {
      log.done(result.message);
    } else {
      log.error(result.message);
      process.exitCode = 1;
    }
  },
});

const status = defineCommand({
  meta: { name: "status", description: "Check ghostpaw service status" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const s = serviceStatus(workspace);
    console.log(`  init system  ${style.cyan(s.initSystem)}`);
    console.log(`  installed    ${s.installed ? style.green("yes") : style.dim("no")}`);
    console.log(`  running      ${s.running ? style.green("yes") : style.dim("no")}`);
    if (s.pid) console.log(`  pid          ${s.pid}`);
  },
});

const logs = defineCommand({
  meta: { name: "logs", description: "Tail ghostpaw service logs" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    serviceLogs(workspace);
  },
});

export default defineCommand({
  meta: { name: "service", description: "Manage ghostpaw as a system service" },
  subCommands: { install, uninstall, status, logs },
});
