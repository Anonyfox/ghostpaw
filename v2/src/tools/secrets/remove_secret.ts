import { createTool, Schema } from "chatoyant";
import { canonicalKeyName, deleteSecret } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/database.ts";

class RemoveSecretParams extends Schema {
  key = Schema.String({ description: "The secret key name to remove" });
}

function isProtectedKey(key: string): boolean {
  return key.toUpperCase().startsWith("WEB_UI_");
}

export function createRemoveSecretTool(db: DatabaseHandle) {
  return createTool({
    name: "remove_secret",
    description:
      "Remove a secret from the database and environment by its key name. " +
      "Use list_secrets first to find the correct key name.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new RemoveSecretParams() as any,
    execute: async ({ args }) => {
      const { key } = args as { key: string };

      if (!key || !key.trim()) return { error: "Key name is required." };
      if (isProtectedKey(key)) return { error: "Cannot modify internal keys." };

      const canonical = canonicalKeyName(key);
      deleteSecret(db, canonical);
      return { removed: canonical };
    },
  });
}
