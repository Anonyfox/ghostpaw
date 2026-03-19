export { detectInitSystem } from "./detect_init_system.ts";
export { generateLaunchdPlist, launchdLabel } from "./generate_plist.ts";
export { generateSystemdUnit } from "./generate_unit.ts";
export { installService } from "./install_service.ts";
export { resolveServiceConfig } from "./resolve_config.ts";
export { serviceLogs } from "./service_logs.ts";
export { serviceStatus } from "./service_status.ts";
export type { InitSystem, ServiceConfig, ServiceResult, ServiceStatus } from "./types.ts";
export { uninstallService } from "./uninstall_service.ts";
