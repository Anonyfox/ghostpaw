import { createTool, Schema } from "chatoyant";
import { deleteConfig, getCurrentEntry, KNOWN_CONFIG_KEYS } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";

class ResetConfigParams extends Schema {
  key = Schema.String({
    description: "Configuration key to reset to its default value (or remove if custom)",
  });
}

export function createResetConfigTool(db: DatabaseHandle) {
  return createTool({
    name: "reset_config",
    description:
      "Reset a configuration key to its code default. " +
      "For system keys, this removes the override and restores the built-in default. " +
      "For custom keys, this removes the key entirely. " +
      "Unlike undo_config, this discards the entire change history for the key.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ResetConfigParams() as any,
    execute: async ({ args }) => {
      const { key } = args as { key: string };
      if (!key || !key.trim()) return { error: "Key name is required." };

      const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
      const entry = getCurrentEntry(db, key);

      if (!entry && !known) {
        return { error: `Unknown config key "${key}". Nothing to reset.` };
      }

      if (!entry && known) {
        return { reset: true, key, was_default: true, default_value: known.defaultValue };
      }

      try {
        deleteConfig(db, key);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Failed to reset "${key}": ${detail}` };
      }

      if (known) {
        return { reset: true, key, default_value: known.defaultValue };
      }

      return { reset: true, key, removed: true };
    },
  });
}
