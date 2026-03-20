import { resolve } from "node:path";
import { defineCommand } from "citty";
import {
  installService,
  resolveServiceConfig,
  serviceLogs,
  serviceStatus,
  uninstallService,
} from "../../lib/service/index.ts";
import { sendCommand } from "../../lib/supervisor.ts";
import { log, style } from "../../lib/terminal/index.ts";

function ensureXdgRuntime(): void {
  if (process.env.XDG_RUNTIME_DIR || process.platform !== "linux") return;
  const uid = process.getuid?.();
  if (uid != null) {
    process.env.XDG_RUNTIME_DIR = `/run/user/${uid}`;
  }
}

function detectNpx(): boolean {
  const script = process.argv[1] ?? "";
  return script.includes("_npx") || script.includes("node_modules/.cache");
}

const install = defineCommand({
  meta: { name: "install", description: "Install ghostpaw as a system service" },
  async run() {
    ensureXdgRuntime();
    if (detectNpx()) {
      log.error("cannot register a service from npx — the binary path is temporary");
      console.log("");
      console.log("  Install permanently first:");
      console.log(`    ${style.cyan("npm install -g ghostpaw")}`);
      console.log("    # or");
      console.log(
        `    ${style.cyan("curl -fsSL https://raw.githubusercontent.com/Anonyfox/ghostpaw/main/install.sh | sh")}`,
      );
      console.log("");
      process.exitCode = 1;
      return;
    }

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
    ensureXdgRuntime();
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

const restart = defineCommand({
  meta: { name: "restart", description: "Restart the running ghostpaw process" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    try {
      const resp = await sendCommand(workspace, "restart");
      if (resp.ok) {
        log.done("restart signal sent");
      } else {
        log.error(String(resp.error ?? "unknown error"));
        process.exitCode = 1;
      }
    } catch {
      log.error("ghostpaw is not running");
      process.exitCode = 1;
    }
  },
});

const stop = defineCommand({
  meta: { name: "stop", description: "Stop the running ghostpaw process" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    try {
      const resp = await sendCommand(workspace, "stop");
      if (resp.ok) {
        log.done("stop signal sent");
      } else {
        log.error(String(resp.error ?? "unknown error"));
        process.exitCode = 1;
      }
    } catch {
      log.error("ghostpaw is not running");
      process.exitCode = 1;
    }
  },
});

const status = defineCommand({
  meta: { name: "status", description: "Check ghostpaw service status" },
  async run() {
    ensureXdgRuntime();
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");

    try {
      const resp = await sendCommand(workspace, "status");
      if (resp.ok) {
        console.log(`  supervisor   ${style.green("running")}`);
        console.log(`  pid          ${resp.pid}`);
        if (resp.childPid) console.log(`  worker pid   ${resp.childPid}`);
        console.log(`  uptime       ${resp.uptime}s`);
        console.log(`  crashes      ${resp.crashes}`);
        return;
      }
    } catch {}

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
    ensureXdgRuntime();
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    serviceLogs(workspace);
  },
});

export default defineCommand({
  meta: { name: "service", description: "Manage ghostpaw as a system service" },
  subCommands: { install, uninstall, restart, stop, status, logs },
});
