import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export function resolveHome(args?: { home?: string }): string {
  if (args?.home) return resolve(args.home);
  const envHome = process.env.GHOSTPAW_HOME;
  if (envHome) return resolve(envHome);
  return resolve(homedir(), ".ghostpaw");
}

export function ensureHome(homePath: string): void {
  if (!existsSync(homePath)) {
    mkdirSync(homePath, { recursive: true });
  }
}
