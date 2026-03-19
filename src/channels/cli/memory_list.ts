import { defineCommand } from "citty";
import { countMemories, listMemories, staleMemories } from "../../core/memory/api/read/index.ts";
import type { Memory, MemoryCategory } from "../../core/memory/api/types.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function strengthLabel(confidence: number): string {
  if (confidence >= 0.7) return style.green("●");
  if (confidence >= 0.4) return style.yellow("●");
  return style.dim("●");
}

function relativeAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default defineCommand({
  meta: { name: "list", description: "List memories" },
  args: {
    category: {
      type: "string",
      description: "Filter by category: preference, fact, procedure, capability, custom",
    },
    strength: {
      type: "string",
      description: "Filter by strength: strong, fading, faint",
    },
    stale: {
      type: "boolean",
      description: "Show only stale memories that need review",
      default: false,
    },
    limit: {
      type: "string",
      description: "Maximum number of memories to show (default: 50)",
    },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 50;
      const counts = countMemories(db);

      let memories: Memory[];
      if (args.stale) {
        memories = staleMemories(db, limit);
      } else {
        memories = listMemories(db, {
          category: args.category as MemoryCategory | undefined,
          limit,
        });
      }

      if (args.strength) {
        const s = args.strength as string;
        memories = memories.filter((m) => {
          if (s === "strong") return m.confidence >= 0.7;
          if (s === "fading") return m.confidence >= 0.4 && m.confidence < 0.7;
          if (s === "faint") return m.confidence < 0.4;
          return true;
        });
      }

      const staleCount = staleMemories(db, 1000).length;
      console.log(
        style.dim(`${counts.active} active / ${counts.total} total (${staleCount} stale)`),
      );

      if (memories.length === 0) {
        console.log(style.dim("No memories match the filter."));
        return;
      }

      const header = `${"ID".padStart(5)}    ${"Claim".padEnd(50)} ${"Cat".padEnd(11)} ${"Conf".padStart(5)} ${"Ev".padStart(3)} ${"Age".padStart(4)}`;
      console.log(style.dim(header));
      console.log(style.dim("─".repeat(88)));

      for (const m of memories) {
        const id = String(m.id).padStart(5);
        const dot = strengthLabel(m.confidence);
        const claim = m.claim.length > 48 ? `${m.claim.slice(0, 47)}…` : m.claim.padEnd(48);
        const cat = m.category.padEnd(11);
        const conf = m.confidence.toFixed(2).padStart(5);
        const ev = String(m.evidenceCount).padStart(3);
        const age = relativeAge(m.createdAt).padStart(4);
        console.log(
          `${style.dim(id)} ${dot} ${claim} ${style.dim(cat)} ${conf} ${style.dim(ev)} ${style.dim(age)}`,
        );
      }
    });
  },
});
