import { useState } from "preact/hooks";
import type { FragmentSourceSummary, SkillFragmentInfo } from "../../shared/trainer_types.ts";
import { FragmentTile } from "./fragment_tile.tsx";

interface FragmentStashProps {
  fragments: SkillFragmentInfo[];
  sources: FragmentSourceSummary[];
  onSkillClick?: (name: string) => void;
}

const SOURCE_LINKS: Record<string, { label: string; href: string }> = {
  quest: { label: "Quests", href: "/quests" },
  session: { label: "Sessions", href: "/sessions" },
  coordinator: { label: "Chat", href: "/chat" },
  historian: { label: "Sessions", href: "/sessions" },
};

const SOURCE_COLORS: Record<string, string> = {
  quest: "#d4a017",
  session: "#4a90d9",
  stoke: "#8b5cf6",
  coordinator: "#14b8a6",
  historian: "#6c757d",
};

const COLLAPSED_LIMIT = 12;

export function FragmentStash({ fragments, sources, onSkillClick }: FragmentStashProps) {
  const [expanded, setExpanded] = useState(false);

  const total = sources.reduce((sum, s) => sum + s.pending + s.absorbed, 0);
  const pendingTotal = sources.reduce((sum, s) => sum + s.pending, 0);

  if (total === 0) return null;

  const crossLinkSources = sources.filter((s) => s.pending > 0 && SOURCE_LINKS[s.source]);
  const visible = expanded ? fragments : fragments.slice(0, COLLAPSED_LIMIT);
  const hasMore = fragments.length > COLLAPSED_LIMIT;

  return (
    <div class="card border-secondary mb-4">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0">Fragment Stash</h5>
          <span class="text-muted small">
            {pendingTotal > 0 && (
              <span class="me-2">
                <span style="color: #8b5cf6;">●</span> {pendingTotal} pending
              </span>
            )}
            {total} total
          </span>
        </div>

        {crossLinkSources.length > 0 && (
          <div class="mb-3">
            {crossLinkSources.map((s) => {
              const link = SOURCE_LINKS[s.source];
              const color = SOURCE_COLORS[s.source] ?? "#6c757d";
              return (
                <div key={s.source} class="d-flex align-items-center gap-2 mb-1">
                  <span style={`color: ${color}; font-size: 0.85rem;`}>?</span>
                  <span class="small">
                    {s.pending} undiscovered from{" "}
                    <a href={link.href} class="text-info text-decoration-none fw-semibold">
                      {link.label}
                    </a>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div class="row g-2">
          {visible.map((f) => (
            <div key={f.id} class="col-md-6 col-lg-4">
              <FragmentTile fragment={f} onSkillClick={onSkillClick} />
            </div>
          ))}
        </div>

        {hasMore && !expanded && (
          <div class="text-center mt-2">
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              onClick={() => setExpanded(true)}
            >
              Show all {fragments.length}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
