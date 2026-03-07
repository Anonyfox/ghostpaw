import type { IncomingMessage } from "node:http";
import { readJsonBody } from "../body_parser.ts";

interface ParsedSoulCreate {
  name: string;
  essence: string;
  description?: string;
}

interface ParsedSoulUpdate {
  name?: string;
  essence?: string;
  description?: string;
}

interface ParsedAwaken {
  newName?: string;
}

type ParseResult<T> = T | { error: string };

export async function parseSoulCreateBody(
  req: IncomingMessage,
): Promise<ParseResult<ParsedSoulCreate>> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    return { error: "Invalid request body." };
  }
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }
  const { name, essence, description } = body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    return { error: "Missing or empty name." };
  }
  const result: ParsedSoulCreate = {
    name: name.trim(),
    essence: typeof essence === "string" ? essence : "",
  };
  if (typeof description === "string") result.description = description;
  return result;
}

export async function parseSoulUpdateBody(
  req: IncomingMessage,
): Promise<ParseResult<ParsedSoulUpdate>> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    return { error: "Invalid request body." };
  }
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }
  const { name, essence, description } = body as Record<string, unknown>;
  const result: ParsedSoulUpdate = {};
  if (typeof name === "string") result.name = name;
  if (typeof essence === "string") result.essence = essence;
  if (typeof description === "string") result.description = description;
  if (
    result.name === undefined &&
    result.essence === undefined &&
    result.description === undefined
  ) {
    return {
      error: "At least one of name, essence, or description must be provided.",
    };
  }
  return result;
}

export async function parseAwakenBody(req: IncomingMessage): Promise<ParseResult<ParsedAwaken>> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    return {};
  }
  if (typeof body !== "object" || body === null) {
    return {};
  }
  const { newName } = body as Record<string, unknown>;
  if (typeof newName === "string" && newName.trim()) {
    return { newName: newName.trim() };
  }
  return {};
}
