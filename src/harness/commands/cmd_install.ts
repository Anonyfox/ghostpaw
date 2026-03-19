import { installService, resolveServiceConfig, serviceStatus } from "../../lib/service/index.ts";
import type { ServiceResult, ServiceStatus } from "../../lib/service/types.ts";
import type { CommandContext, CommandResult } from "./types.ts";

interface InstallDeps {
  platform: string;
  status: (workspace: string) => ServiceStatus;
  install: (workspace: string) => ServiceResult;
}

const defaultDeps: InstallDeps = {
  platform: process.platform,
  status: serviceStatus,
  install: (workspace) => installService(resolveServiceConfig(workspace)),
};

export function executeInstallWith(workspace: string, deps: InstallDeps): Promise<CommandResult> {
  if (deps.platform === "win32") {
    return Promise.resolve({
      text: "Service install is not available on Windows. Use Windows Task Scheduler to start ghostpaw at boot.",
    });
  }

  const current = deps.status(workspace);
  if (current.installed) {
    return Promise.resolve({
      text: `Service already installed (${current.initSystem}).`,
    });
  }

  const result = deps.install(workspace);
  if (result.success) {
    return Promise.resolve({
      text: `Service installed via ${result.initSystem}. ${result.message}.`,
    });
  }

  return Promise.resolve({ text: result.message });
}

export async function executeInstall(ctx: CommandContext, _args: string): Promise<CommandResult> {
  return executeInstallWith(ctx.workspace, defaultDeps);
}
