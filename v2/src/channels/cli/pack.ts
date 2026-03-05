import { defineCommand } from "citty";
import { countMembers, sensePack } from "../../core/pack/index.ts";
import { style } from "../../lib/terminal/index.ts";
import packBond from "./pack_bond.ts";
import packCount from "./pack_count.ts";
import packHistory from "./pack_history.ts";
import packList from "./pack_list.ts";
import packMeet from "./pack_meet.ts";
import packNote from "./pack_note.ts";
import packShow from "./pack_show.ts";
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
  meta: { name: "pack", description: "Manage the ghost's social world" },
  subCommands: {
    list: packList,
    show: packShow,
    meet: packMeet,
    bond: packBond,
    note: packNote,
    history: packHistory,
    count: packCount,
  },
  async run() {
    await withRunDb((db) => {
      const counts = countMembers(db);
      const members = sensePack(db);

      console.log(
        style.dim(
          `${counts.active} active / ${counts.dormant} dormant / ${counts.lost} lost / ${counts.total} total`,
        ),
      );

      if (members.length === 0) {
        console.log(style.dim("The pack is empty."));
        return;
      }

      const header = `${"ID".padStart(5)}    ${"Name".padEnd(20)} ${"Kind".padEnd(10)} ${"Trust".padStart(5)} ${"Status".padEnd(8)} ${"Last".padStart(5)} ${"Int".padStart(4)}`;
      console.log(style.dim(header));
      console.log(style.dim("─".repeat(68)));

      for (const m of members) {
        const id = String(m.id).padStart(5);
        const dot = trustDot(m.trust);
        const name = m.name.length > 18 ? `${m.name.slice(0, 17)}…` : m.name.padEnd(18);
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
