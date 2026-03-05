import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import type { TrainerOption } from "../../harness/index.ts";
import { style } from "../../lib/terminal/index.ts";

export interface ChoiceResult {
  optionId?: string;
  guidance?: string;
}

/**
 * Displays numbered options and prompts the user to pick one or type custom guidance.
 * Returns the selected option ID, or custom guidance text.
 */
export async function promptChoice(options: TrainerOption[]): Promise<ChoiceResult> {
  console.log();
  for (const opt of options) {
    console.log(`  ${style.boldCyan(opt.id)}. ${style.bold(opt.title)}`);
    console.log(`     ${style.dim(opt.description)}`);
    console.log();
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(style.dim("Pick a number, or type custom guidance: "));
    const trimmed = answer.trim();
    if (!trimmed) return {};

    const matched = options.find((o) => o.id === trimmed);
    if (matched) return { optionId: matched.id };

    return { guidance: trimmed };
  } finally {
    rl.close();
  }
}

/**
 * Prompts the user to pick a skill from a numbered list.
 * Returns the selected skill name, or undefined if cancelled.
 */
export async function promptSkillPick(skillNames: string[]): Promise<string | undefined> {
  console.log();
  for (let i = 0; i < skillNames.length; i++) {
    console.log(`  ${style.boldCyan(String(i + 1))}. ${skillNames[i]}`);
  }
  console.log();

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(style.dim("Pick a skill number: "));
    const idx = Number.parseInt(answer.trim(), 10) - 1;
    if (idx >= 0 && idx < skillNames.length) return skillNames[idx];
    return undefined;
  } finally {
    rl.close();
  }
}
