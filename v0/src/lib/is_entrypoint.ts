import { realpathSync } from "node:fs";
import { argv } from "node:process";

export function isEntrypoint(importMetaUrl: string): boolean {
  try {
    const scriptPath = realpathSync(new URL(importMetaUrl).pathname);
    const entryPath = realpathSync(argv[1] ?? "");
    return scriptPath === entryPath;
  } catch {
    return false;
  }
}
