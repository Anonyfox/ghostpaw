import type { DatabaseHandle } from "../../lib/index.ts";
import { resolveNames } from "./resolve_names.ts";
import { rowToContact } from "./row_to_contact.ts";
import { rowToField } from "./row_to_field.ts";
import { rowToLink } from "./row_to_link.ts";
import { rowToMember } from "./row_to_member.ts";

/**
 * Canonical text rendering of a pack member.
 * Used for LLM context injection (command sessions) and CLI display.
 * Returns null only if the member doesn't exist.
 */
export function renderBond(db: DatabaseHandle, memberId: number): string | null {
  const row = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(memberId);
  if (!row) return null;

  const member = rowToMember(row as Record<string, unknown>);

  const displayName = member.nickname ? `${member.name} ("${member.nickname}")` : member.name;

  const lines: string[] = [`## ${displayName} (${member.kind}, #${member.id})`];

  const meta: string[] = [`Trust: ${member.trust.toFixed(2)} | Status: ${member.status}`];
  if (member.timezone) meta.push(`Timezone: ${member.timezone}`);
  if (member.locale) meta.push(`Locale: ${member.locale}`);
  if (member.location) meta.push(`Location: ${member.location}`);
  if (member.address) meta.push(`Address: ${member.address}`);
  if (member.pronouns) meta.push(`Pronouns: ${member.pronouns}`);
  if (member.birthday) meta.push(`Birthday: ${member.birthday}`);
  lines.push("", meta.join(" | "));

  if (member.parentId) {
    const nameMap = resolveNames(db, [member.parentId]);
    const parentName = nameMap.get(member.parentId);
    if (parentName) {
      lines.push(`Parent: ${parentName} (#${member.parentId})`);
    }
  }

  if (member.bond) {
    lines.push("", "### Bond", "", member.bond);
  }

  const fieldRows = db
    .prepare("SELECT * FROM pack_fields WHERE member_id = ? ORDER BY key")
    .all(memberId) as Record<string, unknown>[];
  const fields = fieldRows.map(rowToField);
  const tags = fields.filter((f) => f.value === null).map((f) => f.key);
  const data = fields.filter((f) => f.value !== null);

  if (tags.length > 0) {
    lines.push("", `Tags: ${tags.join(", ")}`);
  }
  if (data.length > 0) {
    lines.push("", "### Fields");
    for (const d of data) {
      lines.push(`- ${d.key}: ${d.value}`);
    }
  }

  const linkRows = db
    .prepare("SELECT * FROM pack_links WHERE member_id = ? ORDER BY label")
    .all(memberId) as Record<string, unknown>[];
  const links = linkRows.map(rowToLink);

  if (links.length > 0) {
    const targetIds = [...new Set(links.map((l) => l.targetId))];
    const nameMap = resolveNames(db, targetIds);

    lines.push("", "### Links");
    for (const l of links) {
      const targetName = nameMap.get(l.targetId) ?? `#${l.targetId}`;
      const parts = [`${l.label} → ${targetName}`];
      if (l.role) parts.push(`(${l.role})`);
      if (!l.active) parts.push("[former]");
      lines.push(`- ${parts.join(" ")}`);
    }
  }

  const contactRows = db
    .prepare("SELECT * FROM pack_contacts WHERE member_id = ? ORDER BY type, value")
    .all(memberId) as Record<string, unknown>[];
  const contacts = contactRows.map(rowToContact);

  if (contacts.length > 0) {
    lines.push("", "### Contacts");
    for (const c of contacts) {
      lines.push(c.label ? `- ${c.type}: ${c.value} (${c.label})` : `- ${c.type}: ${c.value}`);
    }
  }

  return lines.join("\n");
}
