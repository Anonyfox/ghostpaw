import type { DatabaseHandle } from "../../../../lib/index.ts";

export function queueProposal(
  db: DatabaseHandle,
  title: string,
  rationale: string,
  fragmentIds: number[],
): void {
  db.prepare("INSERT INTO skill_proposals (title, rationale, fragment_ids) VALUES (?, ?, ?)").run(
    title,
    rationale,
    JSON.stringify(fragmentIds),
  );
}

export function dismissProposal(db: DatabaseHandle, id: number): void {
  db.prepare("UPDATE skill_proposals SET status = 'dismissed' WHERE id = ?").run(id);
}

export function approveProposal(db: DatabaseHandle, id: number): void {
  db.prepare("UPDATE skill_proposals SET status = 'approved' WHERE id = ?").run(id);
}
