import type { DatabaseHandle } from "../../../../lib/index.ts";
import { embedText } from "../../embed_text.ts";
import { searchMemories as searchMemoriesByVector } from "../../search_memories.ts";
import type { RankedMemory, SearchOptions } from "../../types.ts";

export function searchMemories(
  db: DatabaseHandle,
  text: string,
  options?: SearchOptions,
): RankedMemory[] {
  return searchMemoriesByVector(db, embedText(text), options);
}
