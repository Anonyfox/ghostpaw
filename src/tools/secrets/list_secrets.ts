import { createTool, Schema } from "chatoyant";
import { listSecretStatus } from "../../core/secrets/api/read/index.ts";
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
      const secrets: SecretEntry[] = listSecretStatus(db);
      return { secrets };
    },
  });
}
