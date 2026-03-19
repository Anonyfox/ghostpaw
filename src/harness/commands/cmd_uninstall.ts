import { serviceStatus, uninstallService } from "../../lib/service/index.ts";
import type { ServiceResult, ServiceStatus } from "../../lib/service/types.ts";
import type { CommandContext, CommandResult } from "./types.ts";

interface UninstallDeps {
  platform: string;
  status: (workspace: string) => ServiceStatus;
  uninstall: (workspace: string) => ServiceResult;
}

const defaultDeps: UninstallDeps = {
  platform: process.platform,
  status: serviceStatus,
  uninstall: uninstallService,
};

export function executeUninstallWith(
  workspace: string,
  deps: UninstallDeps,
): Promise<CommandResult> {
  if (deps.platform === "win32") {
    return Promise.resolve({
      text: "Service uninstall is not available on Windows. Remove the entry from Windows Task Scheduler manually.",
    });
  }

  const current = deps.status(workspace);
  if (!current.installed) {
    return Promise.resolve({ text: "Service is not installed." });
  }

  const result = deps.uninstall(workspace);
  if (result.success) {
    return Promise.resolve({ text: `Service removed (${result.initSystem}).` });
  }

  return Promise.resolve({ text: result.message });
}

export async function executeUninstall(ctx: CommandContext, _args: string): Promise<CommandResult> {
  return executeUninstallWith(ctx.workspace, defaultDeps);
}
