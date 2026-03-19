import { join } from "node:path";
import type { ServiceConfig } from "./types.ts";

export function generateWatchdogScript(config: ServiceConfig): string {
  const dir = join(config.workspace, ".ghostpaw");
  const flags = config.nodeFlags.length > 0 ? ` ${config.nodeFlags.join(" ")}` : "";
  return `#!/bin/sh
PIDFILE="${dir}/watchdog.pid"
echo $$ > "$PIDFILE"
while true; do
  "${config.nodePath}"${flags} "${config.ghostpawPath}" 2>>"${dir}/stderr.log"
  sleep 5
done
`;
}
