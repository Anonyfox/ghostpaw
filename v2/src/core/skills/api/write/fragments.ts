import type { DatabaseHandle } from "../../../../lib/index.ts";
import { pendingFragmentCount } from "../read/fragments.ts";

export function dropSkillFragment(
  db: DatabaseHandle,
  source: string,
  sourceId: string | null,
  observation: string,
  domain?: string,
): void {
  db.prepare(
    "INSERT INTO skill_fragments (source, source_id, observation, domain) VALUES (?, ?, ?, ?)",
  ).run(source, sourceId, observation, domain ?? null);
}

export function absorbFragment(db: DatabaseHandle, id: number, skillName: string): void {
  db.prepare("UPDATE skill_fragments SET status = 'absorbed', consumed_by = ? WHERE id = ?").run(
    skillName,
    id,
  );
}

export function expireStaleFragments(db: DatabaseHandle, maxAgeDays = 90): void {
  db.prepare(
    `UPDATE skill_fragments SET status = 'expired'
     WHERE status = 'pending' AND created_at < unixepoch() - ? * 86400`,
  ).run(maxAgeDays);
}

export function enforceFragmentCap(db: DatabaseHandle, cap = 50): void {
  const count = pendingFragmentCount(db);
  if (count <= cap) return;

  db.prepare(
    `UPDATE skill_fragments SET status = 'expired'
     WHERE id IN (
       SELECT id FROM skill_fragments
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT ?
     )`,
  ).run(count - cap);
}
