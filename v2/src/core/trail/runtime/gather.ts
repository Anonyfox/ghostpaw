import type { DatabaseHandle } from "../../../lib/index.ts";
import { getCostSummary, sessionsSince } from "../../chat/api/read/index.ts";
import { memoriesRevisedSince, memoriesSince } from "../../memory/api/read/index.ts";
import { interactionsSince } from "../../pack/api/read/index.ts";
import { questStateChangesSince } from "../../quests/quest_state_changes_since.ts";
import { skillEventsSince } from "../../skills/api/read/index.ts";
import { traitChangesSince } from "../../souls/api/read/index.ts";
import type { GatherSlices } from "../internal/index.ts";

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

export function gatherSlices(db: DatabaseHandle, sinceMs: number): GatherSlices {
  return {
    memory: safe(() => {
      const created = memoriesSince(db, sinceMs, 100);
      const revised = memoriesRevisedSince(db, sinceMs, 50);
      const all = [...created, ...revised.filter((r) => !created.some((c) => c.id === r.id))];
      return all.length > 0 ? all : null;
    }),
    costs: safe(() => getCostSummary(db, sinceMs)),
    chat: safe(() => {
      const result = sessionsSince(db, sinceMs);
      return result.length > 0 ? result : null;
    }),
    pack: safe(() => {
      const result = interactionsSince(db, sinceMs);
      return result.length > 0 ? result : null;
    }),
    quests: safe(() => {
      const result = questStateChangesSince(db, sinceMs);
      return result.length > 0 ? result : null;
    }),
    skills: safe(() => {
      const result = skillEventsSince(db, sinceMs);
      return result.length > 0 ? result : null;
    }),
    souls: safe(() => {
      const result = traitChangesSince(db, sinceMs);
      return result.traits.length > 0 || result.levels.length > 0 ? result : null;
    }),
  };
}
