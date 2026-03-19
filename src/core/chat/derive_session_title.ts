const MAX_LENGTH = 50;

export function deriveSessionTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim().replace(/\s+/g, " ");
  if (!trimmed) return "New Chat";
  if (trimmed.length <= MAX_LENGTH) return trimmed;

  const truncated = trimmed.slice(0, MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  const cutPoint = lastSpace > MAX_LENGTH * 0.4 ? lastSpace : MAX_LENGTH;
  return `${truncated.slice(0, cutPoint)}...`;
}
