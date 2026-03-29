import type { ProviderId } from "chatoyant";
import { isProviderActive } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { PROVIDER_KEYS, PROVIDER_MODELS } from "./known.ts";
import { setSetting } from "./set.ts";

export function resolveModels(db: DatabaseHandle): void {
  const hasExplicitModel = db
    .prepare("SELECT id FROM settings WHERE key = 'GHOSTPAW_MODEL' AND next_id IS NULL")
    .get();

  if (hasExplicitModel) return;

  for (const [provider] of Object.entries(PROVIDER_KEYS)) {
    if (isProviderActive(provider as ProviderId)) {
      const models = PROVIDER_MODELS[provider];
      if (models) {
        setSetting(db, "GHOSTPAW_MODEL", models.model, { source: "env" });
        setSetting(db, "GHOSTPAW_MODEL_SMALL", models.model_small, { source: "env" });
        setSetting(db, "GHOSTPAW_MODEL_LARGE", models.model_large, { source: "env" });
      }
      return;
    }
  }
}
