import { defineCommand } from "citty";
import { countMembers, listMembers } from "../../core/pack/api/read/index.ts";
import type { MemberKind, MemberStatus } from "../../core/pack/api/types.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function trustDot(trust: number): string {
  if (trust >= 0.7) return style.green("●");
  if (trust >= 0.4) return style.yellow("●");
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
  meta: { name: "list", description: "List pack members" },
  args: {
    status: {
      type: "string",
      description: "Filter by status: active, dormant, lost",
    },
    kind: {
      type: "string",
      description: "Filter by kind: human, group, ghostpaw, agent, service, other",
    },
    field: {
      type: "string",
      description: "Filter by tag or field key (for example: client, vip)",
    },
    group: {
      type: "string",
      description: "Filter by linked group member ID",
    },
    search: {
      type: "string",
      description: "Keyword search across names, bond narrative, and fields",
    },
    limit: {
      type: "string",
      description: "Maximum members to show (default: 50)",
    },
  },
  async run({ args }) {
    await withRunDb((db) => {
      const limit = args.limit ? Number.parseInt(args.limit as string, 10) : 50;
      const groupId = args.group ? Number.parseInt(args.group as string, 10) : undefined;
      const counts = countMembers(db);

      const members = listMembers(db, {
        status: args.status as MemberStatus | undefined,
        kind: args.kind as MemberKind | undefined,
        field: (args.field as string | undefined)?.trim() || undefined,
        groupId: Number.isInteger(groupId) ? groupId : undefined,
        search: (args.search as string | undefined)?.trim() || undefined,
        limit,
      });

      console.log(
        style.dim(
          `${counts.active} active / ${counts.dormant} dormant / ${counts.lost} lost / ${counts.total} total`,
        ),
      );

      if (members.length === 0) {
        console.log(style.dim("No members match the filter."));
        return;
      }

      const header = `${"ID".padStart(5)}    ${"Name".padEnd(20)} ${"Kind".padEnd(10)} ${"Trust".padStart(5)} ${"Status".padEnd(8)} ${"Last".padStart(5)} ${"Int".padStart(4)}`;
      console.log(style.dim(header));
      console.log(style.dim("─".repeat(68)));

      for (const m of members) {
        const id = String(m.id).padStart(5);
        const dot = trustDot(m.trust);
        const label = m.nickname ? `${m.name} "${m.nickname}"` : m.name;
        const name = label.length > 18 ? `${label.slice(0, 17)}…` : label.padEnd(18);
        const kind = m.kind.padEnd(10);
        const trust = m.trust.toFixed(2).padStart(5);
        const status = m.status.padEnd(8);
        const last = relativeAge(m.lastContact).padStart(5);
        const interactions = String(m.interactionCount).padStart(4);
        console.log(
          `${style.dim(id)} ${dot} ${style.cyan(name)} ${style.dim(kind)} ${trust} ${style.dim(status)} ${style.dim(last)} ${style.dim(interactions)}`,
        );
      }
    });
  },
});
