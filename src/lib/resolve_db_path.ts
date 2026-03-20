import { existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

export function resolveDbPath(workspace: string): string {
  const dir = join(workspace, ".ghostpaw");
  mkdirSync(dir, { recursive: true });

  const newPath = join(dir, "ghostpaw.db");
  const oldPath = join(workspace, "ghostpaw.db");

  if (!existsSync(newPath) && existsSync(oldPath)) {
    renameSync(oldPath, newPath);
    for (const suffix of ["-wal", "-shm"]) {
      const old = oldPath + suffix;
      if (existsSync(old)) renameSync(old, newPath + suffix);
    }
  }

  return newPath;
}
