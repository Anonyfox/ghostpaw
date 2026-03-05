export interface TrainerOption {
  id: string;
  title: string;
  description: string;
}

const OPTION_PATTERN = /### Option (\d+): (.+)\n([\s\S]*?)(?=\n### Option \d|$)/g;

/**
 * Extracts structured options from trainer LLM output.
 * Expects `### Option N: <title>\n<description>` blocks.
 * Falls back to a single option wrapping the full text if parsing yields nothing.
 */
export function parseTrainerOptions(text: string): TrainerOption[] {
  const options: TrainerOption[] = [];
  const pattern = new RegExp(OPTION_PATTERN.source, OPTION_PATTERN.flags);

  for (const match of text.matchAll(pattern)) {
    const desc = match[3].trim();
    if (desc) {
      options.push({ id: match[1], title: match[2].trim(), description: desc });
    }
  }

  if (options.length === 0 && text.trim()) {
    const firstLine = text.trim().split("\n")[0].slice(0, 120);
    options.push({
      id: "1",
      title: firstLine,
      description: text.trim(),
    });
  }

  return options;
}
