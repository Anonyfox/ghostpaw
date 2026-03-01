import type { IncomingMessage } from "node:http";
import { readJsonBody } from "../body_parser.ts";

interface ParsedTraitAdd {
  principle: string;
  provenance: string;
}

interface ParsedTraitRevise {
  principle?: string;
  provenance?: string;
}

type ParseResult<T> = T | { error: string };

export async function parseTraitAddBody(
  req: IncomingMessage,
): Promise<ParseResult<ParsedTraitAdd>> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    return { error: "Invalid request body." };
  }
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }
  const { principle, provenance } = body as Record<string, unknown>;
  if (typeof principle !== "string" || !principle.trim()) {
    return { error: "Missing or empty principle." };
  }
  if (typeof provenance !== "string" || !provenance.trim()) {
    return { error: "Missing or empty provenance." };
  }
  return { principle: principle.trim(), provenance: provenance.trim() };
}

export async function parseTraitReviseBody(
  req: IncomingMessage,
): Promise<ParseResult<ParsedTraitRevise>> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    return { error: "Invalid request body." };
  }
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }
  const { principle, provenance } = body as Record<string, unknown>;
  const result: ParsedTraitRevise = {};
  if (typeof principle === "string") result.principle = principle;
  if (typeof provenance === "string") result.provenance = provenance;
  if (result.principle === undefined && result.provenance === undefined) {
    return { error: "At least one of principle or provenance must be provided." };
  }
  return result;
}
