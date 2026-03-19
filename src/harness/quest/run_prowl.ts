import { spawn } from "node:child_process";
import { openQuestSessionIds } from "../../core/chat/api/read/index.ts";
import { embarkEligible } from "../../core/quests/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { log } from "../../lib/terminal/index.ts";

const MAX_CONCURRENT_EMBARKS = 1;

export function runProwl(db: DatabaseHandle, workspace: string): void {
  const openIds = openQuestSessionIds(db);
  if (openIds.size >= MAX_CONCURRENT_EMBARKS) {
    log.info(`prowl: ${openIds.size} embark(s) running, skipping`);
    return;
  }

  const candidates = embarkEligible(db, 5);
  const eligible = candidates.filter((q) => !openIds.has(q.id));
  if (eligible.length === 0) {
    log.info("prowl: no eligible quests");
    return;
  }

  const quest = eligible[0];
  log.info(`prowl: spawning embark for quest #${quest.id} "${quest.title}"`);

  const args = [
    ...process.execArgv,
    process.argv[1],
    "quests",
    "embark",
    String(quest.id),
    "--workspace",
    workspace,
  ];

  const child = spawn(process.execPath, args, {
    cwd: workspace,
    env: process.env,
    stdio: ["ignore", "ignore", "pipe"],
    detached: false,
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8").trim();
    if (text) log.info(`prowl embark #${quest.id}: ${text.split("\n").pop()}`);
  });

  child.on("error", (err) => {
    log.error(`prowl: failed to spawn embark for #${quest.id}: ${err.message}`);
  });

  child.on("close", (code) => {
    if (code === 0) {
      log.info(`prowl: embark #${quest.id} finished successfully`);
    } else {
      log.warn(`prowl: embark #${quest.id} exited with code ${code}`);
    }
  });
}
