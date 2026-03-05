import { createTool, Schema } from "chatoyant";
import { activeSearchProvider, KNOWN_KEYS, listSecrets } from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ListSecretsParams extends Schema {}

interface SecretEntry {
  key: string;
  label: string;
  category: "llm" | "search" | "telegram" | "custom";
  configured: boolean;
  isActiveSearch: boolean;
}

export function createListSecretsTool(db: DatabaseHandle) {
  return createTool({
    name: "list_secrets",
    description:
      "List all available secret keys and their configuration status. " +
      "Returns key names, labels, categories (llm/search/custom), and whether each is " +
      "currently set. Values are never returned — only key names and metadata. " +
      "Use this to check which API keys are configured before calling set_secret or remove_secret.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ListSecretsParams() as any,
    execute: async () => {
      const configuredKeys = new Set(listSecrets(db));
      const activeSearch = activeSearchProvider();
      const activeSearchKey = activeSearch?.canonical ?? null;

      const secrets: SecretEntry[] = KNOWN_KEYS.map((k) => ({
        key: k.canonical,
        label: k.label,
        category: k.category,
        configured: configuredKeys.has(k.canonical),
        isActiveSearch: k.canonical === activeSearchKey,
      }));

      const knownCanonicals = new Set(KNOWN_KEYS.map((k) => k.canonical));
      for (const key of configuredKeys) {
        if (knownCanonicals.has(key)) continue;
        if (key.startsWith("WEB_UI_")) continue;
        secrets.push({
          key,
          label: key,
          category: "custom",
          configured: true,
          isActiveSearch: false,
        });
      }

      return { secrets };
    },
  });
}
