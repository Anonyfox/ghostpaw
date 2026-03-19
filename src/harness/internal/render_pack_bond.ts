import {
  getMember,
  listContacts,
  listFields,
  listLinks,
  resolveNames,
} from "../../core/pack/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

/**
 * Canonical text rendering of a pack member for prompt assembly.
 * Returns null only if the member doesn't exist.
 */
export function renderPackBond(db: DatabaseHandle, memberId: number): string | null {
  const member = getMember(db, memberId);
  if (!member) return null;

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

  const fields = listFields(db, memberId);
  const tags = fields.filter((field) => field.value === null).map((field) => field.key);
  const data = fields.filter((field) => field.value !== null);

  if (tags.length > 0) {
    lines.push("", `Tags: ${tags.join(", ")}`);
  }
  if (data.length > 0) {
    lines.push("", "### Fields");
    for (const field of data) {
      lines.push(`- ${field.key}: ${field.value}`);
    }
  }

  const links = listLinks(db, memberId);
  if (links.length > 0) {
    const targetIds = [...new Set(links.map((link) => link.targetId))];
    const nameMap = resolveNames(db, targetIds);

    lines.push("", "### Links");
    for (const link of links) {
      const targetName = nameMap.get(link.targetId) ?? `#${link.targetId}`;
      const parts = [`${link.label} → ${targetName}`];
      if (link.role) parts.push(`(${link.role})`);
      if (!link.active) parts.push("[former]");
      lines.push(`- ${parts.join(" ")}`);
    }
  }

  const contacts = listContacts(db, memberId);
  if (contacts.length > 0) {
    lines.push("", "### Contacts");
    for (const contact of contacts) {
      lines.push(
        contact.label
          ? `- ${contact.type}: ${contact.value} (${contact.label})`
          : `- ${contact.type}: ${contact.value}`,
      );
    }
  }

  return lines.join("\n");
}
