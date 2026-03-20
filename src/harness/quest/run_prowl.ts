import { spawn } from "node:child_process";
import { listStaleQuestSessionIds, openQuestSessionIds } from "../../core/chat/api/read/index.ts";
import { closeSession } from "../../core/chat/api/write/index.ts";
import { embarkEligible } from "../../core/quests/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { log } from "../../lib/terminal/index.ts";

const MAX_CONCURRENT_EMBARKS = 1;
const STALE_SESSION_MS = 15 * 60 * 1000;

function reapStaleQuestSessions(db: DatabaseHandle): void {
  const cutoff = Date.now() - STALE_SESSION_MS;
  const staleIds = listStaleQuestSessionIds(db, cutoff);

  for (const id of staleIds) {
    closeSession(db, id, "reaped: stale quest session (orphaned embark)");
    log.warn(`prowl: reaped stale quest session #${id}`);
  }
}

export function runProwl(db: DatabaseHandle, workspace: string): void {
  reapStaleQuestSessions(db);
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
    stdio: ["ignore", "ignore", "ignore"],
    detached: true,
  });

  child.on("error", (err) => {
    log.error(`prowl: failed to spawn embark for #${quest.id}: ${err.message}`);
  });

  child.unref();
}
