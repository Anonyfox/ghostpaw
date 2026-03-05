import { defineCommand } from "citty";
import type { MemoryCategory, MemorySource } from "../../core/memory/index.ts";
import { embedText, searchMemories, storeMemory } from "../../core/memory/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

export default defineCommand({
  meta: { name: "add", description: "Store a new memory" },
  args: {
    claim: {
      type: "positional",
      description: "The belief or fact to remember",
      required: true,
    },
    source: {
      type: "string",
      description: "How learned: explicit, observed, inferred (default: explicit)",
    },
    category: {
      type: "string",
      description: "Category: preference, fact, procedure, capability, custom (default: custom)",
    },
  },
  async run({ args }) {
    const claim = (args._ ?? []).join(" ") || (args.claim as string);
    if (!claim?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Claim text is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const embedding = embedText(claim.trim());

      try {
        const stored = storeMemory(db, claim.trim(), embedding, {
          source: (args.source as MemorySource) ?? "explicit",
          category: (args.category as MemoryCategory) ?? "custom",
        });

        console.log(
          style.cyan("stored".padStart(10)),
          ` #${stored.id} "${stored.claim.slice(0, 60)}"`,
        );

        const similar = searchMemories(db, embedding, { k: 5, minScore: 0.1 }).filter(
          (m) => m.id !== stored.id,
        );
        if (similar.length > 0) {
          console.log();
          console.log(style.dim("Similar existing memories:"));
          for (const m of similar) {
            const score = `${Math.round(m.similarity * 100)}%`.padStart(4);
            console.log(`  ${style.dim(`#${m.id}`)} ${score} ${m.claim.slice(0, 60)}`);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(style.boldRed("error".padStart(10)), ` ${msg}`);
        process.exitCode = 1;
      }
    });
  },
});
