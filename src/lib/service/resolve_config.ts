import { resolve } from "node:path";
import type { ServiceConfig } from "./types.ts";

export function resolveServiceConfig(workspace: string): ServiceConfig {
  const nodePath = process.execPath;
  const ghostpawPath = resolve(process.argv[1]!);
  const major = Number.parseInt(process.versions.node.split(".")[0]!, 10);
  const nodeFlags = major < 24 ? ["--experimental-sqlite"] : [];
  return { workspace: resolve(workspace), nodePath, ghostpawPath, nodeFlags };
}
