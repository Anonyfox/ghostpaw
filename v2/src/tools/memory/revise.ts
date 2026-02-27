import { createTool, Schema } from "chatoyant";
import type { Memory } from "../../core/memory/index.ts";
import {
  confirmMemory,
  embedText,
  getMemory,
  storeMemory,
  supersedeMemories,
} from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatMemoryForAgent } from "./format_memory.ts";

class ReviseParams extends Schema {
  ids = Schema.String({
    description:
      "Memory ID(s) to revise. Single ID for corrections or confirmations. " +
      "Comma-separated IDs for merging (e.g., '3,7').",
  });
  claim = Schema.String({
    optional: true,
    description:
      "New claim text. Required for corrections and merges. " +
      "Omit to confirm a single memory (bumps confidence).",
  });
}

function parseIds(raw: string): number[] | string {
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return "No IDs provided.";
  const seen = new Set<number>();
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n <= 0) {
      return `Invalid ID "${part}" — must be a positive integer.`;
    }
    seen.add(n);
  }
  return [...seen];
}

export function createReviseTool(db: DatabaseHandle) {
  return createTool({
    name: "revise",
    description:
      "Update understanding about a memory. Three modes: " +
      "(1) Correct — one ID + new claim: replaces the old memory with a corrected version. " +
      "(2) Merge — multiple IDs + new claim: combines related memories into one. " +
      "(3) Confirm — one ID, no claim: reinforces confidence and resets freshness. " +
      "Use this instead of forget + remember when correcting.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ReviseParams() as any,
    execute: async ({ args }) => {
      const { ids: idsRaw, claim } = args as { ids: string; claim?: string };
      if (!idsRaw || !idsRaw.trim()) return { error: "IDs must not be empty." };

      const parsed = parseIds(idsRaw);
      if (typeof parsed === "string") return { error: parsed };

      if (claim !== undefined && claim !== null && claim.trim().length > 0) {
        return correctOrMerge(db, parsed, claim.trim());
      }
      return confirm(db, parsed);
    },
  });
}

function correctOrMerge(db: DatabaseHandle, ids: number[], claim: string) {
  const oldClaims: { id: number; claim: string }[] = [];
  for (const id of ids) {
    const mem = getMemory(db, id);
    if (!mem) return { error: `Memory #${id} not found.` };
    if (mem.supersededBy !== null) {
      return { error: `Memory #${id} is already superseded.` };
    }
    oldClaims.push({ id, claim: mem.claim });
  }

  let newMem: Memory;
  try {
    const embedding = embedText(claim);
    newMem = storeMemory(db, claim, embedding, { source: "explicit" });
    supersedeMemories(db, ids, newMem.id);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `Failed to revise: ${detail}` };
  }

  return {
    created: formatMemoryForAgent(newMem),
    superseded: oldClaims,
  };
}

function confirm(db: DatabaseHandle, ids: number[]) {
  if (ids.length !== 1) {
    return {
      error: "Provide a claim to merge multiple memories, or pass a single ID to confirm.",
    };
  }

  const id = ids[0];
  const before = getMemory(db, id);
  if (!before) return { error: `Memory #${id} not found.` };
  if (before.supersededBy !== null) {
    return { error: `Memory #${id} is already superseded.` };
  }

  let after: Memory;
  try {
    after = confirmMemory(db, id);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { error: `Failed to confirm memory #${id}: ${detail}` };
  }

  return {
    confirmed: {
      id,
      claim: after.claim,
      confidence_before: Math.round(before.confidence * 100) / 100,
      confidence_after: Math.round(after.confidence * 100) / 100,
      evidence: after.evidenceCount,
    },
  };
}
