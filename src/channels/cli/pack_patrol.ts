import { defineCommand } from "citty";
import { packDigest } from "../../core/pack/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { withRunDb } from "./with_run_db.ts";

function trustDot(tier: "deep" | "solid" | "growing"): string {
  if (tier === "deep") return style.red("●");
  if (tier === "solid") return style.yellow("●");
  return style.dim("●");
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default defineCommand({
  meta: {
    name: "patrol",
    description: "Check for drifting bonds and upcoming landmarks",
  },
  args: {
    days: {
      type: "string",
      description: "Look-ahead window for landmarks in days (default: 14)",
    },
  },
  async run({ args }) {
    const days = Math.min(90, Math.max(1, Number(args.days) || 14));
    await withRunDb((db) => {
      const digest = packDigest(db, days);
      let printed = false;

      if (digest.drift.length > 0) {
        console.log(style.dim("── Drifting bonds ──"));
        for (const d of digest.drift) {
          const dot = trustDot(d.tier);
          const name = style.cyan(d.name.padEnd(20));
          const tier = d.tier.padEnd(8);
          const trust = d.trust.toFixed(2);
          const silent = `${d.daysSilent}d silent`.padStart(12);
          console.log(`   ${dot} ${name} ${style.dim(tier)} ${trust} ${style.dim(silent)}`);
        }
        printed = true;
      }

      if (digest.landmarks.length > 0) {
        if (printed) console.log();
        console.log(style.dim(`── Upcoming (next ${days} days) ──`));
        for (const l of digest.landmarks) {
          const marker = style.cyan("*");
          const name = style.cyan(l.name.padEnd(20));
          const label = l.type === "birthday" ? "birthday" : `${l.yearsAgo}yr anniversary`;
          const date = fmtDate(l.date);
          const countdown = `(${l.daysAway}d)`;
          const extra =
            l.type === "birthday" && l.yearsAgo
              ? ` turns ${l.yearsAgo}`
              : l.summary
                ? ` ${l.summary.length > 40 ? `${l.summary.slice(0, 39)}…` : l.summary}`
                : "";
          console.log(
            `   ${marker} ${name} ${style.dim(label.padEnd(16))} ${date}  ${style.dim(countdown)}${style.dim(extra)}`,
          );
        }
        printed = true;
      }

      if (digest.stats.activeMembers > 0) {
        if (printed) console.log();
        console.log(style.dim("── Pack ──"));
        const { activeMembers, dormantMembers, recentInteractions, averageTrust } = digest.stats;
        console.log(
          style.dim(
            `  ${activeMembers} active / ${dormantMembers} dormant / ${recentInteractions} interactions (30d) / avg trust ${averageTrust.toFixed(2)}`,
          ),
        );
        printed = true;
      }

      if (!printed) {
        console.log(style.dim("  all clear — no drift, no upcoming landmarks"));
      }
    });
  },
});
