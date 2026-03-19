import type { DatabaseHandle } from "../../../../lib/index.ts";
import { embedText } from "../../embed_text.ts";
import { storeMemory as storeMemoryRow } from "../../store_memory.ts";
import type { Memory, StoreOptions } from "../../types.ts";

export function storeMemory(db: DatabaseHandle, claim: string, options?: StoreOptions): Memory {
  return storeMemoryRow(db, claim, embedText(claim), options);
}
