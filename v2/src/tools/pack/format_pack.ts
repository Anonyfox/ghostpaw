import type { PackInteraction, PackMember } from "../../core/pack/types.ts";
import type {
  FormattedInteraction,
  FormattedMemberDetail,
  FormattedMemberSummary,
} from "./types.ts";

export function trustLabel(trust: number): string {
  if (trust >= 0.8) return "deep";
  if (trust >= 0.6) return "solid";
  if (trust >= 0.3) return "growing";
  return "shallow";
}

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
    kind: member.kind,
    trust: Math.round(member.trust * 100) / 100,
    trust_level: trustLabel(member.trust),
    status: member.status,
    bond_excerpt: bondExcerpt(member.bond),
    last_contact: relativeTime(member.lastContact, now),
    interactions: interactionCount,
  };
}

export function formatInteraction(
  ix: PackInteraction,
  now: number = Date.now(),
): FormattedInteraction {
  return {
    id: ix.id,
    kind: ix.kind,
    summary: ix.summary,
    significance: Math.round(ix.significance * 100) / 100,
    age: relativeTime(ix.createdAt, now),
  };
}

export function formatMemberDetail(
  member: PackMember,
  interactions: PackInteraction[],
  now: number = Date.now(),
): FormattedMemberDetail {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(member.metadata);
  } catch {
    metadata = {};
  }

  return {
    id: member.id,
    name: member.name,
    kind: member.kind,
    trust: Math.round(member.trust * 100) / 100,
    trust_level: trustLabel(member.trust),
    status: member.status,
    bond: member.bond,
    first_contact: relativeTime(member.firstContact, now),
    last_contact: relativeTime(member.lastContact, now),
    metadata,
    recent_interactions: interactions.map((ix) => formatInteraction(ix, now)),
  };
}
