import type { DatabaseHandle } from "../../../lib/index.ts";
import { updateCalibration } from "../api/write/update_calibration.ts";
import { updateOpenLoops } from "../api/write/update_open_loops.ts";
import type { GatherSlices, SurpriseResult } from "../internal/index.ts";
import { rowToSweepState } from "../internal/index.ts";
import { seedStarterQuestions } from "../internal/seed_starter_questions.ts";
import { gatherSlices } from "./gather.ts";
import { scoreSurprise } from "./surprise.ts";

export interface SweepContext {
  slices: GatherSlices;
  surprise: SurpriseResult;
  sinceMs: number;
}

export type HistorianInvoker = (db: DatabaseHandle, context: SweepContext) => Promise<void>;

export async function runTrailSweep(
  db: DatabaseHandle,
  invokeHistorian: HistorianInvoker,
): Promise<void> {
  seedStarterQuestions(db);

  const sinceMs = getLastSweepTime(db);
  const slices = gatherSlices(db, sinceMs);
  const surprise = scoreSurprise(db, slices);

  applyMechanicalUpdates(db, slices);

  await invokeHistorian(db, { slices, surprise, sinceMs });

  updateSweepState(db);
}

function getLastSweepTime(db: DatabaseHandle): number {
  const row = db.prepare("SELECT * FROM trail_sweep_state WHERE id = 1").get() as
    | Record<string, unknown>
    | undefined;
  if (row) {
    return rowToSweepState(row).lastSweepAt;
  }
  return Date.now() - 86_400_000;
}

function applyMechanicalUpdates(db: DatabaseHandle, slices: GatherSlices): void {
  updateOpenLoops(db, {
    decay: { factor: 0.9 },
    storageLimit: 20,
  });

  if (slices.chat) {
    updateCalibration(db, [
      { key: "chat.session_count", value: (slices.chat as unknown[]).length },
    ]);
  }
}

function updateSweepState(db: DatabaseHandle): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO trail_sweep_state (id, last_sweep_at, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_sweep_at = excluded.last_sweep_at, updated_at = excluded.updated_at`,
  ).run(now, now);
}
