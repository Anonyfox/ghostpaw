import type { SkillFragmentInfo } from "../../shared/trainer_types.ts";

interface FragmentTileProps {
  fragment: SkillFragmentInfo;
  onSkillClick?: (name: string) => void;
}

const SOURCE_COLORS: Record<string, string> = {
  quest: "#d4a017",
  session: "#4a90d9",
  stoke: "#8b5cf6",
  coordinator: "#14b8a6",
  historian: "#6c757d",
};

const SOURCE_LABELS: Record<string, string> = {
  quest: "Quest",
  session: "Session",
  stoke: "Stoke",
  coordinator: "Coord",
  historian: "Hist",
};

function relativeAge(ts: number): string {
  const secs = Math.floor(Date.now() / 1000) - ts;
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

export function FragmentTile({ fragment, onSkillClick }: FragmentTileProps) {
  const color = SOURCE_COLORS[fragment.source] ?? SOURCE_COLORS.historian;
  const label = SOURCE_LABELS[fragment.source] ?? fragment.source;
  const absorbed = fragment.status === "absorbed";

  return (
    <div
      class="card bg-body-tertiary border-0 h-100"
      style={`border-left: 3px solid ${color} !important; opacity: ${absorbed ? 0.6 : 1};`}
    >
      <div class="card-body py-2 px-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge" style={`background: ${color}; font-size: 0.6rem;`}>
            {label}
          </span>
          <span class="text-muted" style="font-size: 0.65rem;">
            {relativeAge(fragment.createdAt)}
          </span>
        </div>
        <p
          class="mb-1 small"
          style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3;"
        >
          {fragment.observation}
        </p>
        <div class="d-flex justify-content-between align-items-center">
          {fragment.domain ? (
            <span class="badge bg-body-secondary text-muted" style="font-size: 0.6rem;">
              {fragment.domain}
            </span>
          ) : (
            <span />
          )}
          {absorbed && fragment.consumedBy ? (
            <button
              type="button"
              class="btn btn-link p-0 text-info"
              style="font-size: 0.6rem; text-decoration: none;"
              onClick={() => onSkillClick?.(fragment.consumedBy!)}
            >
              → {fragment.consumedBy}
            </button>
          ) : (
            <span
              class="text-muted"
              style={`font-size: 0.5rem; ${absorbed ? "" : "animation: pulse 2s ease-in-out infinite;"}`}
            >
              {absorbed ? "absorbed" : "pending"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
