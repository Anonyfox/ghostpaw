/**
 * Vocabulary baseline for pack fields and link labels.
 * Constants only — not inserted into the database.
 * Referenced in Warden tool guidance so the LLM knows conventional
 * names from cold start. Users and the Warden can create any
 * tag/field/label beyond these.
 */

export const SEED_FIELDS = {
  tags: [
    "client",
    "prospect",
    "lead",
    "partner",
    "vendor",
    "competitor",
    "family",
    "friend",
    "colleague",
    "mentor",
    "vip",
    "needs-followup",
    "on-hold",
    "churned",
    "company",
    "team",
    "community",
    "pet",
  ],
  keyed: [
    { key: "billing_rate", example: "150/hr EUR" },
    { key: "account_id", example: "CUST-2025-042" },
    { key: "source", example: "conference-2025" },
    { key: "preferred_contact", example: "telegram" },
    { key: "anniversary", example: "2020-06-15" },
    { key: "diet", example: "vegan" },
    { key: "species", example: "dog" },
  ],
} as const;

export const SEED_LINK_LABELS = [
  "works-at",
  "subsidiary-of",
  "client-of",
  "partner-with",
  "married-to",
  "parent-of",
  "sibling-of",
  "manages",
  "mentors",
  "reports-to",
  "cared-for-by",
  "member-of",
] as const;
