import { createTool, Schema } from "chatoyant";
import { getConfigInfo } from "../../core/config/api/read/index.ts";
import { undoConfig } from "../../core/config/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class UndoConfigParams extends Schema {
  key = Schema.String({
    description:
      "Configuration key to undo the last change for (e.g. 'temperature'). " +
      "Reverts to the previous value set by set_config.",
  });
}

export function createUndoConfigTool(db: DatabaseHandle) {
  return createTool({
    name: "undo_config",
    description:
      "Revert the most recent set_config call for a key, restoring its previous value. " +
      "If this was the only override, the key reverts to its built-in default. " +
      "Only works if the key has been explicitly set at least once. " +
      "For a full reset discarding all history, use reset_config instead.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new UndoConfigParams() as any,
    execute: async ({ args }) => {
      const { key } = args as { key: string };
      if (!key || !key.trim()) return { error: "Key name is required." };

      const before = getConfigInfo(db, key);
      if (!before || before.isDefault) return { error: `"${key}" has no changes to undo.` };

      const previousValue = before.value;
      const undone = undoConfig(db, key);
      if (!undone) return { error: `"${key}" has no changes to undo.` };

      const after = getConfigInfo(db, key);
      const restoredToDefault = after?.isDefault ?? false;
      const restoredValue = after?.value;

      return {
        undone: true,
        key,
        previous_value: previousValue,
        restored_value: restoredValue,
        restored_to_default: restoredToDefault,
      };
    },
  });
}
