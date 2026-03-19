export const DESC_SYSTEM_PROMPT =
  "You generate concise soul descriptions. Output ONLY the description, nothing else. Max 2 sentences.";

export const NAME_SYSTEM_PROMPT =
  "You suggest concise soul names. Output ONLY the name. Max 4 words, no explanation.";

export function buildDescriptionPrompt(
  name: string,
  essence: string,
  traitPrinciples: string[],
): string {
  const truncatedEssence = essence.length > 300 ? essence.slice(0, 300) : essence;
  let prompt = `Given this soul named "${name}"`;
  if (truncatedEssence) {
    prompt += ` with essence: ${truncatedEssence}`;
  }
  if (traitPrinciples.length > 0) {
    const top = traitPrinciples.slice(0, 5).join("; ");
    prompt += ` and ${traitPrinciples.length} active traits including: ${top}`;
  }
  prompt += "... Write a concise 1-2 sentence description that captures what this soul represents.";
  return prompt;
}

export function buildNamePrompt(currentName: string, description: string, essence: string): string {
  const truncatedEssence = essence.length > 200 ? essence.slice(0, 200) : essence;
  let prompt = `Given this soul currently named "${currentName}"`;
  if (description) {
    prompt += ` with description: ${description}`;
  }
  if (truncatedEssence) {
    prompt += ` and essence excerpt: ${truncatedEssence}`;
  }
  prompt +=
    "... Suggest a short, descriptive human-readable name (like 'Ghost Analyst' or 'Code Reviewer'). Max 4 words.";
  return prompt;
}
