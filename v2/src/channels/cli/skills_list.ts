import { resolve } from "node:path";
import { defineCommand } from "citty";
import { listSkills } from "../../core/skills/index.ts";
import { style } from "../../lib/terminal/index.ts";

const READINESS_DOT: Record<string, string> = {
  grey: style.dim("●"),
  green: "\x1b[32m●\x1b[0m",
  yellow: "\x1b[33m●\x1b[0m",
  orange: "\x1b[38;5;208m●\x1b[0m",
};

export default defineCommand({
  meta: { name: "list", description: "List all skills with ranks, tiers, and readiness" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const skills = listSkills(workspace);

    if (skills.length === 0) {
      console.log(style.dim("No skills found."));
      return;
    }

    console.log(style.dim(`${skills.length} skill${skills.length === 1 ? "" : "s"}`));

    const header = `${"Name".padEnd(25)} ${"".padStart(1)} ${"Tier".padEnd(16)} ${"Rank".padStart(4)} ${"Description".padEnd(40)}`;
    console.log(style.dim(header));
    console.log(style.dim("─".repeat(90)));

    for (const s of skills) {
      const name = s.hasPendingChanges ? style.yellow(s.name.padEnd(25)) : s.name.padEnd(25);
      const dot = READINESS_DOT[s.readiness] ?? READINESS_DOT.grey;
      const tier = s.tier.padEnd(16);
      const rank = String(s.rank).padStart(4);
      const desc =
        s.description.length > 38 ? `${s.description.slice(0, 37)}…` : s.description.padEnd(38);
      console.log(`${name} ${dot} ${style.dim(tier)} ${rank} ${style.dim(desc)}`);
    }
  },
});
