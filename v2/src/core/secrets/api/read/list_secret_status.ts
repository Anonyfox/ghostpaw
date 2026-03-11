import type { DatabaseHandle } from "../../../../lib/index.ts";
import { activeSearchProvider } from "../../active_search.ts";
import { KNOWN_KEYS } from "../../known_keys.ts";
import { listSecrets } from "../../list_secrets.ts";
import type { SecretStatus } from "../types.ts";

export function listSecretStatus(db: DatabaseHandle): SecretStatus[] {
  const configuredKeys = new Set(listSecrets(db));
  const activeSearch = activeSearchProvider();
  const activeSearchKey = activeSearch?.canonical ?? null;

  const secrets: SecretStatus[] = KNOWN_KEYS.map((key) => ({
    key: key.canonical,
    label: key.label,
    category: key.category,
    configured: configuredKeys.has(key.canonical),
    isActiveSearch: key.canonical === activeSearchKey,
  }));

  const knownCanonicals = new Set(KNOWN_KEYS.map((key) => key.canonical));
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

  return secrets;
}
