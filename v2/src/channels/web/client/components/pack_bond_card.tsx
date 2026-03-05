import { Link } from "wouter-preact";
import type { PackMemberInfo } from "../../shared/pack_types.ts";
import { PackKindBadge } from "./pack_kind_badge.tsx";
import { PackTrustPips } from "./pack_trust_pips.tsx";

interface PackBondCardProps {
  member: PackMemberInfo;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function statusCardClass(status: string): string {
  if (status === "dormant") return "card h-100 border-secondary opacity-75";
  if (status === "lost") return "card h-100 border-danger opacity-50";
  return "card h-100";
}

export function PackBondCard({ member }: PackBondCardProps) {
  const isLost = member.status === "lost";

  return (
    <div class={statusCardClass(member.status)}>
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <h6 class="card-title mb-0">
            <Link
              href={`/pack/${member.id}`}
              class="text-info text-decoration-none"
              style={isLost ? "text-decoration: line-through !important;" : ""}
            >
              {member.name}
            </Link>
          </h6>
          <PackKindBadge kind={member.kind} />
        </div>

        <div class="mb-2">
          <PackTrustPips trust={member.trust} />
        </div>

        {member.bondExcerpt && (
          <p class="card-text small text-body-secondary mb-2">{member.bondExcerpt}</p>
        )}

        <div class="d-flex justify-content-between align-items-center text-body-tertiary small">
          <span>{relativeTime(member.lastContact)}</span>
          <span class="badge bg-secondary bg-opacity-50">{member.interactionCount}</span>
        </div>
      </div>
    </div>
  );
}
