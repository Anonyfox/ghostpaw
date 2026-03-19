import type { DatabaseHandle } from "../../../lib/index.ts";

interface StarterQuestion {
  question: string;
  priority: number;
  tier: "starter" | "observation" | "depth";
}

const STARTER_DECK: StarterQuestion[] = [
  { question: "What should I call you?", priority: 10, tier: "starter" },
  { question: "What is your primary work domain?", priority: 9, tier: "starter" },
  { question: "Do you work solo or on a team?", priority: 8, tier: "starter" },
  {
    question: "What timezone are you in, and when do you typically work?",
    priority: 7,
    tier: "starter",
  },
  {
    question: "Do you prefer concise responses or thorough explanations?",
    priority: 6,
    tier: "starter",
  },
  {
    question: "Is there anything I should never do without asking you first?",
    priority: 5,
    tier: "starter",
  },
];

/**
 * Seeds starter questions as curiosity-category open loops on the first
 * sweep (when no chronicle entry exists yet). Idempotent — skips if
 * any starter questions are already seeded.
 */
export function seedStarterQuestions(db: DatabaseHandle): void {
  const existing = (
    db.prepare("SELECT COUNT(*) AS c FROM trail_starter_questions").get() as { c: number }
  ).c;
  if (existing > 0) return;

  const now = Date.now();

  const insertQuestion = db.prepare(
    `INSERT INTO trail_starter_questions (question, priority, tier, loop_id, seeded_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertLoop = db.prepare(
    `INSERT INTO trail_open_loops
     (description, category, source_type, significance, status, recommended_action, created_at, updated_at)
     VALUES (?, 'curiosity', 'starter_deck', ?, 'alive', 'ask', ?, ?)`,
  );

  db.exec("BEGIN");
  try {
    for (const q of STARTER_DECK) {
      const significance = q.priority / 10;
      const { lastInsertRowid } = insertLoop.run(q.question, significance, now, now);
      insertQuestion.run(q.question, q.priority, q.tier, Number(lastInsertRowid), now);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
