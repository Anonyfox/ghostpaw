import { KNOWN_CONFIG_KEYS } from "./known_keys.ts";
import type { ConfigValue } from "./types.ts";

export function validateKnownValue(key: string, value: ConfigValue): void {
  const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
  if (!known || !known.validate) return;

  if (!known.validate(value)) {
    throw new Error(
      `Config constraint violation for "${known.label}" (${key}): ${String(value)} is not allowed.`,
    );
  }
}
