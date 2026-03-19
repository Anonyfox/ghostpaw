export function resolvePrompt(
  positional: string | undefined,
  rest: string[],
  stdinContent: string | null,
): string {
  const words = [positional, ...rest].filter(
    (w): w is string => typeof w === "string" && w.length > 0,
  );
  if (words.length > 0) return words.join(" ");
  if (stdinContent?.trim()) return stdinContent.trim();
  throw new Error('No prompt provided. Usage: ghostpaw run "your prompt" or pipe via stdin.');
}
