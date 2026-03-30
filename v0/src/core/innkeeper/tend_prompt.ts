import type { types } from "@ghostpaw/affinity";

export interface ContactSummary {
  identities: string[];
  attributes: string[];
  linkCount: number;
}

export interface CandidateContext {
  names: Map<number, string>;
  profiles: Map<number, ContactSummary>;
  linksBetween: Map<string, { kind: string; role: string | null }[]>;
}

function formatContactDesc(
  id: number,
  name: string,
  profiles: Map<number, ContactSummary>,
): string {
  const p = profiles.get(id);
  if (!p) return `"${name}" (#${id})`;

  const parts: string[] = [];
  if (p.identities.length > 0) parts.push(p.identities.join(", "));
  if (p.attributes.length > 0) parts.push(p.attributes.join(", "));
  parts.push(`${p.linkCount} links`);

  return `"${name}" (#${id}, ${parts.join("; ")})`;
}

export function buildTendPrompt(
  candidates: types.DuplicateCandidateRecord[],
  driftItems: types.RadarRecord[],
  context: CandidateContext,
): string {
  const { names, profiles, linksBetween } = context;

  const lines: string[] = [
    "Social graph maintenance detected issues requiring your attention.",
    "",
    `Duplicate candidates: ${candidates.length} (previously reviewed pairs are excluded automatically)`,
    `Drift items: ${driftItems.length}`,
  ];

  if (candidates.length > 0) {
    lines.push(
      "",
      "DUPLICATES — decide for each pair whether to merge or leave separate.",
      "",
      "Decision guide (apply in order):",
      '- MERGE when one contact is a short name or nickname of the other (e.g. "Marcus" and "Marcus Hoffmann", "Mike J." and "Michael Johnson"). The fuller name wins.',
      "- MERGE when both share the same name and one or both lack distinguishing identities, attributes, or links. The richer contact wins.",
      '- MERGE when a name includes a role suffix that matches the other (e.g. "Mike Johnson" and "Mike Johnson CTO" are the same person).',
      "- MERGE when identities or attributes positively confirm same person.",
      "- DO NOT MERGE when both contacts have different distinguishing data that points to genuinely different people (different roles, departments, identities, or relationships to distinct others).",
      "- A contact with 0 identities, 0 attributes, and 0-1 links is almost always a stub from an early mention — merge it into the richer contact with the same or similar name.",
    );
    for (const c of candidates) {
      const left = names.get(c.leftContactId) ?? `#${c.leftContactId}`;
      const right = names.get(c.rightContactId) ?? `#${c.rightContactId}`;
      const leftDesc = formatContactDesc(c.leftContactId, left, profiles);
      const rightDesc = formatContactDesc(c.rightContactId, right, profiles);
      let line = `- ${leftDesc} and ${rightDesc}: ${c.matchReason}, score ${c.matchScore.toFixed(2)}`;
      const key = `${c.leftContactId}:${c.rightContactId}`;
      const links = linksBetween.get(key);
      if (links && links.length > 0) {
        const descs = links.map((l) => (l.role ? `${l.kind}/${l.role}` : l.kind));
        line += ` [links: ${descs.join(", ")}]`;
      }
      lines.push(line);
    }
  }

  if (driftItems.length > 0) {
    lines.push(
      "",
      "RELATIONSHIP DRIFT — use manage_relationship to adjust bond state if appropriate:",
    );
    for (const r of driftItems) {
      const name = names.get(r.contactId) ?? `#${r.contactId}`;
      lines.push(
        `- "${name}" (#${r.contactId}): driftPriority ${r.driftPriority.toFixed(2)} — "${r.recommendedReason}"`,
      );
    }
  }

  lines.push(
    "",
    "Act on every pair. Merge the clear matches, leave the genuinely different ones.",
    "For drift: only adjust bonds that have clearly changed — some dormancy is natural.",
  );

  return lines.join("\n");
}
