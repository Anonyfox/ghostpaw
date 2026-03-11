import { defineCommand } from "citty";
import { getMemory } from "../../core/memory/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function strengthName(confidence: number): string {
  if (confidence >= 0.7) return "strong";
  if (confidence >= 0.4) return "fading";
  return "faint";
}

function formatDate(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19);
}

function relativeAge(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default defineCommand({
  meta: { name: "show", description: "Show full details for a memory" },
  args: {
    id: {
      type: "positional",
      description: "Memory ID (positive integer)",
      required: true,
    },
  },
  async run({ args }) {
    const raw = (args._ ?? [])[0] || (args.id as string);
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      console.error(style.boldRed("error".padStart(10)), " Memory ID must be a positive integer.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const mem = getMemory(db, id);
      if (!mem) {
        console.error(style.boldRed("error".padStart(10)), ` Memory #${id} not found.`);
        process.exitCode = 1;
        return;
      }

      console.log(style.cyan(`Memory #${mem.id}`));
      console.log();
      console.log(mem.claim);
      console.log();
      console.log(style.dim("── Metadata ──"));
      console.log(
        `${style.dim("confidence".padStart(12))}  ${mem.confidence.toFixed(3)} (${strengthName(mem.confidence)})`,
      );
      console.log(
        `${style.dim("evidence".padStart(12))}  ${mem.evidenceCount} confirmation${mem.evidenceCount !== 1 ? "s" : ""}`,
      );
      console.log(`${style.dim("source".padStart(12))}  ${mem.source}`);
      console.log(`${style.dim("category".padStart(12))}  ${mem.category}`);
      console.log(
        `${style.dim("created".padStart(12))}  ${formatDate(mem.createdAt)} (${relativeAge(mem.createdAt)})`,
      );
      console.log(
        `${style.dim("verified".padStart(12))}  ${formatDate(mem.verifiedAt)} (${relativeAge(mem.verifiedAt)})`,
      );

      if (mem.supersededBy !== null) {
        console.log(
          `${style.dim("superseded".padStart(12))}  ${style.yellow(`replaced by #${mem.supersededBy}`)}`,
        );
      }
    });
  },
});
