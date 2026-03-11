import type { ContactType } from "../../types.ts";

const LOWERCASE_CONTACT_TYPES = new Set<ContactType>([
  "email",
  "github",
  "gitlab",
  "twitter",
  "bluesky",
  "mastodon",
  "linkedin",
  "telegram",
  "discord",
  "slack",
]);

export function normalizeContactValue(type: ContactType, value: string): string {
  const trimmed = value.trim();
  if (LOWERCASE_CONTACT_TYPES.has(type)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}
