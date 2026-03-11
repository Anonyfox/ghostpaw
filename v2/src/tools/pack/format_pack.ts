import type {
  PackContact,
  PackField,
  PackInteraction,
  PackLink,
  PackMember,
} from "../../core/pack/api/types.ts";
import { trustLabel } from "./trust_label.ts";
import type {
  FormattedContact,
  FormattedFieldEntry,
  FormattedInteraction,
  FormattedLinkEntry,
  FormattedMemberDetail,
  FormattedMemberSummary,
} from "./types.ts";

export function relativeTime(ts: number, now: number = Date.now()): string {
  const ms = now - ts;
  if (ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function bondExcerpt(bond: string, maxLen = 120): string {
  if (bond.length <= maxLen) return bond;
  return `${bond.slice(0, maxLen)}...`;
}

export function formatMemberSummary(
  member: PackMember,
  interactionCount: number,
  now: number = Date.now(),
): FormattedMemberSummary {
  return {
    id: member.id,
    name: member.name,
    nickname: member.nickname,
    kind: member.kind,
    trust: Math.round(member.trust * 100) / 100,
    trust_level: trustLabel(member.trust),
    status: member.status,
    bond_excerpt: bondExcerpt(member.bond),
    last_contact: relativeTime(member.lastContact, now),
    interactions: interactionCount,
  };
}

export function formatContact(contact: PackContact): FormattedContact {
  return {
    type: contact.type,
    value: contact.value,
    label: contact.label,
  };
}

export function formatInteraction(
  ix: PackInteraction,
  now: number = Date.now(),
): FormattedInteraction {
  const result: FormattedInteraction = {
    id: ix.id,
    kind: ix.kind,
    summary: ix.summary,
    significance: Math.round(ix.significance * 100) / 100,
    age: relativeTime(ix.createdAt, now),
  };
  if (ix.occurredAt != null && ix.occurredAt !== ix.createdAt) {
    result.event_date = new Date(ix.occurredAt).toISOString().slice(0, 10);
  }
  return result;
}

export interface FormatDetailInput {
  member: PackMember;
  interactions: PackInteraction[];
  contacts?: PackContact[];
  fields?: PackField[];
  links?: PackLink[];
  resolveTargetName?: (id: number) => string;
  now?: number;
}

export function formatMemberDetail(input: FormatDetailInput): FormattedMemberDetail {
  const { member, interactions, contacts = [], fields = [], links = [], now = Date.now() } = input;
  const resolveName = input.resolveTargetName ?? ((id) => `#${id}`);

  const tags: string[] = [];
  const dataFields: FormattedFieldEntry[] = [];
  for (const f of fields) {
    if (f.value === null) {
      tags.push(f.key);
    } else {
      dataFields.push({ key: f.key, value: f.value });
    }
  }

  const formattedLinks: FormattedLinkEntry[] = links.map((l) => ({
    target_id: l.targetId,
    target_name: resolveName(l.targetId),
    label: l.label,
    role: l.role,
    active: l.active,
  }));

  return {
    id: member.id,
    name: member.name,
    nickname: member.nickname,
    kind: member.kind,
    trust: Math.round(member.trust * 100) / 100,
    trust_level: trustLabel(member.trust),
    status: member.status,
    is_user: member.isUser,
    bond: member.bond,
    parent_id: member.parentId,
    timezone: member.timezone,
    locale: member.locale,
    location: member.location,
    address: member.address,
    pronouns: member.pronouns,
    birthday: member.birthday,
    first_contact: relativeTime(member.firstContact, now),
    last_contact: relativeTime(member.lastContact, now),
    tags,
    fields: dataFields,
    links: formattedLinks,
    contacts: contacts.map(formatContact),
    recent_interactions: interactions.map((ix) => formatInteraction(ix, now)),
  };
}
