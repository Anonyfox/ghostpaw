import type { IncomingMessage } from "node:http";
import type { ConfigType, ConfigValue } from "../../../../core/config/index.ts";
import {
  CONFIG_TYPES,
  inferTypeFromString,
  KNOWN_CONFIG_KEYS,
  parseConfigValue,
} from "../../../../core/config/index.ts";
import { readJsonBody } from "../body_parser.ts";

interface ParsedConfigSet {
  key: string;
  value: ConfigValue;
  type: ConfigType;
  isKnown: boolean;
}

export async function parseConfigSetBody(
  req: IncomingMessage,
): Promise<ParsedConfigSet | { error: string }> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    return { error: "Invalid request body." };
  }

  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }

  const { key, value, type: explicitType } = body as Record<string, unknown>;
  if (typeof key !== "string" || !key.trim()) {
    return { error: "Missing or empty key." };
  }
  if (typeof value !== "string") {
    return { error: "Missing value." };
  }

  const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
  const validExplicitType =
    typeof explicitType === "string" && (CONFIG_TYPES as readonly string[]).includes(explicitType)
      ? (explicitType as ConfigType)
      : undefined;
  const type: ConfigType = known ? known.type : (validExplicitType ?? inferTypeFromString(value));

  try {
    const parsed = parseConfigValue(value, type);
    return { key, value: parsed, type, isKnown: !!known };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "";
    return { error: `${key} expects ${type}, got "${value}". ${detail}`.trim() };
  }
}
