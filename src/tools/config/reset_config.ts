import { createTool, Schema } from "chatoyant";
import { getConfigInfo } from "../../core/config/api/read/index.ts";
import { resetConfig } from "../../core/config/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ResetConfigParams extends Schema {
  key = Schema.String({
    description: "Configuration key to reset to its default value (or remove if custom)",
  });
}

export function createResetConfigTool(db: DatabaseHandle) {
  return createTool({
    name: "reset_config",
    description:
      "Reset a configuration key to its built-in default. Removes any override, restoring " +
      "the original code default. For custom keys, removes the key entirely. " +
      "Unlike undo_config (which reverts one step), this discards the entire change " +
      "history for the key.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ResetConfigParams() as any,
    execute: async ({ args }) => {
      const { key } = args as { key: string };
      if (!key || !key.trim()) return { error: "Key name is required." };

      const info = getConfigInfo(db, key);
      if (!info) {
        return { error: `Unknown config key "${key}". Nothing to reset.` };
      }

      if (info.isDefault) {
        return { reset: true, key, was_default: true, default_value: info.value };
      }

      try {
        resetConfig(db, key);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Failed to reset "${key}": ${detail}` };
      }

      const after = getConfigInfo(db, key);
      if (after) {
        return { reset: true, key, default_value: after.value };
      }

      return { reset: true, key, removed: true };
    },
  });
}
