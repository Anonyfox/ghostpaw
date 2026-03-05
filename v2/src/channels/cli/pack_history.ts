import { defineCommand } from "citty";
import type { InteractionKind } from "../../core/pack/index.ts";
import { listInteractions } from "../../core/pack/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { resolveMember } from "./resolve_member.ts";
import { withRunDb } from "./with_run_db.ts";

function kindDot(kind: string): string {
  const map: Record<string, (s: string) => string> = {
    conversation: style.green,
    correction: style.yellow,
    conflict: style.red,
    gift: style.cyan,
    milestone: style.boldCyan,
    observation: style.dim,
  };
  return (map[kind] ?? style.dim)("●");
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
  meta: { name: "history", description: "List interactions for a pack member" },
  args: {
    member: {
      type: "positional",
      description: "Member ID (number) or name (string)",
      required: true,
    },
    kind: {
      type: "string",
      description:
        "Filter by kind: conversation, correction, conflict, gift, milestone, observation",
    },
    limit: {
      type: "string",
      description: "Maximum interactions to show (default: 30)",
    },
  },
  async run({ args }) {
    const ref = (args._ ?? [])[0] || (args.member as string);
    if (!ref?.trim()) {
      console.error(style.boldRed("error".padStart(10)), " Member ID or name is required.");
      process.exitCode = 1;
      return;
    }

    await withRunDb((db) => {
      const member = resolveMember(db, ref);
      if (!member) {
        console.error(style.boldRed("error".padStart(10)), ` Member "${ref}" not found.`);
        process.exitCode = 1;
        return;
      }

      const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 30;
      const interactions = listInteractions(db, member.id, {
        kind: args.kind as InteractionKind | undefined,
        limit,
      });

      console.log(style.dim(`Interactions for "${member.name}" (#${member.id}):`));

      if (interactions.length === 0) {
        console.log(style.dim("No interactions recorded."));
        return;
      }

      const header = `${"ID".padStart(6)}    ${"Kind".padEnd(14)} ${"Age".padStart(5)}  ${"Sig".padStart(4)}  Summary`;
      console.log(style.dim(header));
      console.log(style.dim("─".repeat(76)));

      for (const i of interactions) {
        const id = `#${i.id}`.padStart(6);
        const dot = kindDot(i.kind);
        const kind = i.kind.padEnd(14);
        const age = relativeAge(i.createdAt).padStart(5);
        const sig = i.significance.toFixed(1).padStart(4);
        const summary = i.summary.length > 40 ? `${i.summary.slice(0, 39)}…` : i.summary;
        console.log(
          `${style.dim(id)} ${dot} ${style.dim(kind)} ${style.dim(age)}  ${sig}  ${summary}`,
        );
      }
    });
  },
});
