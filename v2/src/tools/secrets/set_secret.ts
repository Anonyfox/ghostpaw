import { createTool, Schema } from "chatoyant";
import { canonicalKeyName, setSecret } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class SetSecretParams extends Schema {
  key = Schema.String({
    description: "Secret key name (e.g., ANTHROPIC_API_KEY or a custom name)",
  });
  value = Schema.String({ description: "The secret value to store" });
}

function isProtectedKey(key: string): boolean {
  return key.toUpperCase().startsWith("WEB_UI_");
}

export function createSetSecretTool(db: DatabaseHandle) {
  return createTool({
    name: "set_secret",
    description:
      "Store a secret value securely (API key, token, or custom secret). " +
      "The key name is automatically canonicalized. The value is stored in the database " +
      "and loaded into the environment. " +
      "NEVER repeat the secret value in your response to the user.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new SetSecretParams() as any,
    execute: async ({ args }) => {
      const { key, value } = args as { key: string; value: string };

      if (!key || !key.trim()) return { error: "Key name is required." };
      if (!value || !value.trim()) return { error: "Value is required." };
      if (isProtectedKey(key)) return { error: "Cannot modify internal keys." };

      const canonical = canonicalKeyName(key);
      const result = setSecret(db, key, value);
      if (!result.value) return { error: result.warning ?? "Value was empty after cleaning." };
      if (result.warning) return { stored: canonical, warning: result.warning };
      return { stored: canonical };
    },
  });
}
