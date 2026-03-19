const MAX_NAME_LENGTH = 128;

export function validateMemberName(name: string): string {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Pack member name must be a non-empty string.");
  }
  const trimmed = name.trim();
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(
      `Pack member name must be at most ${MAX_NAME_LENGTH} characters. Got ${trimmed.length}.`,
    );
  }
  return trimmed;
}
