const SOUL_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 64;

export function validateSoulName(name: string): void {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Soul name must be a non-empty string.");
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Soul name must be at most ${MAX_NAME_LENGTH} characters. Got ${name.length}.`);
  }
  if (!SOUL_NAME_PATTERN.test(name)) {
    throw new Error(
      `Soul name "${name}" is invalid. Must be lowercase alphanumeric with hyphens, ` +
        "starting with a letter (e.g. 'my-soul', 'code-reviewer-3').",
    );
  }
}
