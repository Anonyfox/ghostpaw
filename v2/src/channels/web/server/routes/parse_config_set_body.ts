import type { IncomingMessage } from "node:http";
import { KNOWN_CONFIG_KEYS } from "../../../../core/config/api/read/index.ts";
import type { ConfigType } from "../../../../core/config/api/types.ts";
import { CONFIG_TYPES } from "../../../../core/config/api/types.ts";
import { readJsonBody } from "../body_parser.ts";

interface ParsedConfigSet {
  key: string;
  value: string;
  isKnown: boolean;
  type?: ConfigType;
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

  const known = KNOWN_CONFIG_KEYS.find((entry) => entry.key === key);
  const validExplicitType =
    typeof explicitType === "string" && (CONFIG_TYPES as readonly string[]).includes(explicitType)
      ? (explicitType as ConfigType)
      : undefined;
  return { key, value, isKnown: known !== undefined, type: validExplicitType };
}
