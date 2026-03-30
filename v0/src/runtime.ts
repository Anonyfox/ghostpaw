import { openDatabase } from "./core/db/open.ts";
import { openAffinityDatabase } from "./core/db/open_affinity.ts";
import { openCodexDatabase } from "./core/db/open_codex.ts";
import { openSoulsDatabase } from "./core/db/open_souls.ts";
import { applySettingsToEnv } from "./core/settings/apply_settings_to_env.ts";
import type { Config } from "./core/settings/build_config.ts";
import { buildConfig } from "./core/settings/build_config.ts";
import { resolveModels } from "./core/settings/resolve_models.ts";
import { syncEnvToSettings } from "./core/settings/sync_env_to_settings.ts";
import { bootstrapBuiltinCustomSouls, bootstrapSouls } from "./core/souls/bootstrap.ts";
import type { DatabaseHandle } from "./lib/database_handle.ts";

export interface SoulIds {
  ghostpaw: number;
  scribe: number;
  innkeeper: number;
  mentor: number;
}

export interface RuntimeContext {
  homePath: string;
  workspace: string;
  db: DatabaseHandle;
  codexDb: DatabaseHandle;
  affinityDb: DatabaseHandle;
  soulsDb: DatabaseHandle;
  config: Config;
  soulIds: SoulIds;
}

export async function initRuntime(homePath: string, workspace: string): Promise<RuntimeContext> {
  const db = await openDatabase(homePath);
  syncEnvToSettings(db);
  applySettingsToEnv(db);
  resolveModels(db);

  const [codexDb, affinityDb, soulsDb] = await Promise.all([
    openCodexDatabase(homePath),
    openAffinityDatabase(homePath),
    openSoulsDatabase(homePath),
  ]);

  const soulIds = bootstrapSouls(soulsDb);
  bootstrapBuiltinCustomSouls(soulsDb);
  const config = buildConfig();

  return { homePath, workspace, db, codexDb, affinityDb, soulsDb, config, soulIds };
}

export function closeRuntime(ctx: RuntimeContext): void {
  ctx.soulsDb.close();
  ctx.affinityDb.close();
  ctx.codexDb.close();
  ctx.db.close();
}
