import { createTool, Schema } from "chatoyant";

class ScoutParams extends Schema {
  direction = Schema.String({
    description:
      "Optional focus area to explore (e.g. 'deploy automation'). Omit for automatic friction mining that suggests trails.",
    optional: true,
  });
}

export function createScoutTool(workspace: string) {
  return createTool({
    name: "scout",
    description: [
      "Discover new skill opportunities by mining workspace context for friction",
      "signals and capability gaps. Without a direction, returns trail suggestions.",
      "With a direction, runs a full agent investigation and returns a report.",
      "Call this when the user wants to scout, explore, sniff around, or discover",
      "what to learn next. Present trail suggestions as a numbered list the user",
      "can pick from. Present reports conversationally.",
    ].join(" "),
    timeout: 5 * 60 * 1000,
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new ScoutParams() as any,
    execute: async ({ args }) => {
      const { direction } = args as { direction?: string };
      const { startProgress, blank } = await import("../lib/terminal.js");
      const { runScout } = await import("../core/scout.js");

      process.stdout.write("\n");
      blank();
      const msg = direction ? `scouting: ${direction}` : "sniffing out trails";
      const stopProgress = startProgress(msg);
      const result = await runScout(workspace, direction || undefined);
      stopProgress();
      blank();

      if (result.mode === "suggest") {
        return {
          mode: "suggest",
          trails: (result.trails ?? []).map((t) => ({
            title: t.title,
            why: t.why,
          })),
        };
      }

      return {
        mode: "report",
        direction: result.direction,
        report: result.report,
      };
    },
  });
}
