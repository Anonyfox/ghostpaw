import { createTool, Schema } from "chatoyant";
import type { SecretStore } from "../core/secrets.js";

class SecretsParams extends Schema {
  action = Schema.Enum(["list", "set", "delete"] as const, {
    description: "Action to perform: list key names, set a key-value pair, or delete a key",
  });
  key = Schema.String({ description: "Secret key name (required for set/delete)", optional: true });
  value = Schema.String({ description: "Secret value (required for set)", optional: true });
}

export function createSecretsTool(secrets: SecretStore) {
  return createTool({
    name: "secrets",
    description:
      "Manage persistent secrets (API keys, tokens). " +
      "Use 'list' to see configured key names, 'set' to store a secret, 'delete' to remove one. " +
      "Values are never returned — only key names are listed.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new SecretsParams() as any,
    execute: async ({ args }) => {
      const { action, key, value } = args as {
        action: "list" | "set" | "delete";
        key?: string;
        value?: string;
      };

      switch (action) {
        case "list":
          return { keys: secrets.keys() };

        case "set": {
          if (!key) return { error: "key is required for set" };
          if (!value) return { error: "value is required for set" };
          secrets.set(key, value);
          return { stored: key };
        }

        case "delete": {
          if (!key) return { error: "key is required for delete" };
          secrets.delete(key);
          return { deleted: key };
        }
      }
    },
  });
}
