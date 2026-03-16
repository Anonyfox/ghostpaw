import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToStoryline } from "./row_to_storyline.ts";
import type { CreateStorylineInput, Storyline } from "./types.ts";

export function createStoryline(db: DatabaseHandle, input: CreateStorylineInput): Storyline {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Storyline title is required and cannot be empty.");
  }

  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO storylines (title, description, created_at, created_by, updated_at, due_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      title,
      input.description?.trim() ?? null,
      now,
      input.createdBy ?? "human",
      now,
      input.dueAt ?? null,
    );

  const row = db.prepare("SELECT * FROM storylines WHERE id = ?").get(lastInsertRowid);
  return rowToStoryline(row as Record<string, unknown>);
}
