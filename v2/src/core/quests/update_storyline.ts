import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToStoryline } from "./row_to_storyline.ts";
import type { Storyline, UpdateStorylineInput } from "./types.ts";
import { STORYLINE_STATUSES } from "./types.ts";

export function updateStoryline(
  db: DatabaseHandle,
  id: number,
  input: UpdateStorylineInput,
): Storyline {
  const existing = db.prepare("SELECT * FROM storylines WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    throw new Error(`Storyline #${id} not found.`);
  }

  if (input.status !== undefined && !STORYLINE_STATUSES.includes(input.status)) {
    throw new Error(
      `Invalid status "${input.status}". Must be one of: ${STORYLINE_STATUSES.join(", ")}.`,
    );
  }

  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Storyline title cannot be empty.");
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  const field = (col: string, val: unknown) => {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      values.push(val);
    }
  };

  field("title", input.title?.trim());
  field("description", input.description === null ? null : input.description?.trim());
  field("status", input.status);
  field("due_at", input.dueAt);

  const now = Date.now();

  if (input.status === "completed" && existing.status !== "completed") {
    sets.push("completed_at = ?");
    values.push(now);
  }

  if (sets.length === 0) {
    return rowToStoryline(existing);
  }

  sets.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE storylines SET ${sets.join(", ")} WHERE id = ?`).run(...values);

  const row = db.prepare("SELECT * FROM storylines WHERE id = ?").get(id);
  return rowToStoryline(row as Record<string, unknown>);
}
