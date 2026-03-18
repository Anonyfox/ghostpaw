import { homedir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";

export interface ResolvedPath {
  fullPath: string;
  outsideWorkspace: boolean;
}

export function resolvePath(workspace: string, filePath: string): ResolvedPath {
  const expanded =
    filePath === "~" || filePath.startsWith("~/") ? homedir() + filePath.slice(1) : filePath;

  const fullPath = isAbsolute(expanded) ? resolve(expanded) : resolve(workspace, expanded);

  const rel = relative(workspace, fullPath);
  const outsideWorkspace = rel.startsWith("..") || isAbsolute(rel);

  return { fullPath, outsideWorkspace };
}
