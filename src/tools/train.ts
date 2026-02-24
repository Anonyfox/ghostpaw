import { createTool, Schema } from "chatoyant";

class TrainParams extends Schema {
  confirm = Schema.Boolean({
    description: "Set to true to start training. Always confirm with the user first if ambiguous.",
    optional: true,
  });
}

let running = false;

export function createTrainTool(workspace: string) {
  return createTool({
    name: "train",
    description: [
      "Run the full training pipeline: absorb unprocessed sessions into memories,",
      "review and refine skills against accumulated experience, then tidy old data.",
      "Call this when the user wants to train, level up, improve skills, or absorb sessions.",
      "Returns structured JSON with results — format the output for the user in a",
      "rewarding, concise way: highlight leveled-up skills prominently, list unchanged",
      "skills briefly, and show summary stats (absorbed, memories, tidied).",
    ].join(" "),
    timeout: 10 * 60 * 1000,
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new TrainParams() as any,
    execute: async () => {
      if (running) return { error: "Training is already in progress." };
      running = true;
      try {
        return await executeTrain(workspace);
      } finally {
        running = false;
      }
    },
  });
}

async function executeTrain(workspace: string) {
  const { startProgress, blank } = await import("../lib/terminal.js");
  const { runTrain } = await import("../core/reflect.js");

  process.stdout.write("\n");
  blank();
  let stopProgress = startProgress("absorbing sessions");
  const result = await runTrain(workspace, (phase) => {
    stopProgress();
    if (phase === "train") {
      stopProgress = startProgress("analyzing skills against experience");
    } else if (phase === "tidy") {
      stopProgress = startProgress("tidying up");
    }
  });
  stopProgress();
  blank();

  return {
    absorbed: result.absorbed,
    memoriesCreated: result.memoriesCreated,
    skippedAbsorb: result.skippedAbsorb,
    tidied: result.tidied,
    totalSkills: result.totalSkills,
    changes: result.changes.map((c) => ({
      type: c.type,
      skill: c.title,
      filename: c.filename,
      rank: c.rank,
    })),
    unchangedCount: result.totalSkills - result.changes.length,
  };
}
