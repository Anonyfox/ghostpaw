import { join } from "node:path";
import type { ServiceConfig } from "./types.ts";

const LAUNCHD_LABEL = "com.ghostpaw.agent";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function launchdLabel(): string {
  return LAUNCHD_LABEL;
}

export function generateLaunchdPlist(config: ServiceConfig): string {
  const stderrPath = join(config.workspace, ".ghostpaw", "stderr.log");
  const args = [
    `    <string>${escapeXml(config.nodePath)}</string>`,
    ...config.nodeFlags.map((f) => `    <string>${escapeXml(f)}</string>`),
    `    <string>${escapeXml(config.ghostpawPath)}</string>`,
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args}
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(config.workspace)}</string>
  <key>KeepAlive</key>
  <true/>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardErrorPath</key>
  <string>${escapeXml(stderrPath)}</string>
</dict>
</plist>
`;
}
