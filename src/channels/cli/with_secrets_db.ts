import { resolve } from "node:path";
import { initSecretsTable } from "../../core/secrets/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openDatabase } from "../../lib/index.ts";
import { resolveDbPath } from "../../lib/resolve_db_path.ts";

// Workspace is passed via process.env.GHOSTPAW_WORKSPACE, set by the root
// command's setup() hook. This is a conscious trade-off: citty does not
// propagate parent command context to subcommands, so env is the cleanest
// channel for cross-command configuration without duplicating --workspace
// on every subcommand.
export async function withSecretsDb<T>(fn: (db: DatabaseHandle) => T | Promise<T>): Promise<T> {
  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
  const db = await openDatabase(resolveDbPath(workspace));
  initSecretsTable(db);
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}
