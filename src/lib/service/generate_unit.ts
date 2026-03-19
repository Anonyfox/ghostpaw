import type { ServiceConfig } from "./types.ts";

export function generateSystemdUnit(config: ServiceConfig): string {
  const args = [...config.nodeFlags, `"${config.ghostpawPath}"`].join(" ");
  return `[Unit]
Description=Ghostpaw AI Agent
After=network.target

[Service]
Type=simple
ExecStart="${config.nodePath}" ${args}
WorkingDirectory=${config.workspace}
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
`;
}
