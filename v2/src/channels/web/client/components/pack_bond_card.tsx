import { Link } from "wouter-preact";
import type { PackMemberInfo } from "../../shared/pack_types.ts";
import { relativeTime } from "../relative_time.ts";
import { PackKindBadge } from "./pack_kind_badge.tsx";
import { PackTrustPips } from "./pack_trust_pips.tsx";

interface PackBondCardProps {
  member: PackMemberInfo;
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
            {member.nickname && <small class="text-muted ms-1">"{member.nickname}"</small>}
          </h6>
          <PackKindBadge kind={member.kind} />
        </div>

        <div class="mb-2">
          <PackTrustPips trust={member.trust} />
        </div>

        {member.bondExcerpt && (
          <p class="card-text small text-body-secondary mb-2">{member.bondExcerpt}</p>
        )}

        {member.tags && member.tags.length > 0 && (
          <div class="d-flex flex-wrap gap-1 mb-2">
            {member.tags.map((t) => (
              <span key={t} class="badge bg-info bg-opacity-25 text-info" style="font-size: 0.7em;">
                {t}
              </span>
            ))}
          </div>
        )}

        <div class="d-flex justify-content-between align-items-center text-body-tertiary small">
          <span>{relativeTime(member.lastContact)}</span>
          <span class="badge bg-secondary bg-opacity-50">{member.interactionCount}</span>
        </div>
      </div>
    </div>
  );
}
