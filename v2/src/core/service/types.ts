export type InitSystem = "systemd" | "launchd" | "cron";

export interface ServiceConfig {
  workspace: string;
  nodePath: string;
  ghostpawPath: string;
  nodeFlags: string[];
}

export interface ServiceResult {
  success: boolean;
  message: string;
  initSystem: InitSystem;
  path?: string;
}

export interface ServiceStatus {
  installed: boolean;
  running: boolean;
  initSystem: InitSystem;
  pid?: number;
}
