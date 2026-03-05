import { useEffect, useState } from "preact/hooks";
import type { SkillDetailInfo } from "../../shared/trainer_types.ts";
import { apiGet } from "../api_get.ts";
import { SkillRankBadge } from "./skill_rank_badge.tsx";

interface SkillDetailModalProps {
  skillName: string;
  onClose: () => void;
  onTrain: (name: string) => void;
}

export function SkillDetailModal({ skillName, onClose, onTrain }: SkillDetailModalProps) {
  const [skill, setSkill] = useState<SkillDetailInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet<SkillDetailInfo>(`/api/skills/${encodeURIComponent(skillName)}`)
      .then((data) => setSkill(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load skill."))
      .finally(() => setLoading(false));
  }, [skillName]);

  const fileGroups = skill
    ? [
        { label: "Scripts", items: skill.files.scripts },
        { label: "References", items: skill.files.references },
        { label: "Assets", items: skill.files.assets },
        { label: "Other", items: skill.files.other },
      ].filter((g) => g.items.length > 0)
    : [];

  const issues = skill?.validation.issues ?? [];
  const severityBadge = (s: string) =>
    s === "error" ? "bg-danger" : s === "warning" ? "bg-warning text-dark" : "bg-info";

  return (
    <div
      class="offcanvas offcanvas-end show"
      style="width: 500px; visibility: visible;"
      tabIndex={-1}
    >
      <div class="offcanvas-header border-bottom">
        <div>
          <h5 class="offcanvas-title mb-1">{skillName}</h5>
          {skill && <SkillRankBadge rank={skill.rank} variant="full" />}
        </div>
        <button type="button" class="btn-close" aria-label="Close" onClick={onClose} />
      </div>
      <div class="offcanvas-body">
        {loading && <p class="text-muted">Loading skill details...</p>}
        {error && <div class="alert alert-danger py-1 px-2 small">{error}</div>}

        {skill && (
          <>
            <div class="d-flex gap-2 mb-3">
              {skill.hasPendingChanges && (
                <span class="badge bg-warning text-dark">Pending Changes</span>
              )}
              {skill.validation.valid ? (
                <span class="badge bg-success">Valid</span>
              ) : (
                <span class="badge bg-danger">Issues Found</span>
              )}
            </div>

            {fileGroups.length > 0 && (
              <div class="mb-3">
                <h6 class="small text-muted mb-2">Files</h6>
                {fileGroups.map((group) => (
                  <div key={group.label} class="mb-1">
                    <span class="text-muted small">{group.label}:</span>{" "}
                    <span class="small">{group.items.join(", ")}</span>
                  </div>
                ))}
              </div>
            )}

            {issues.length > 0 && (
              <div class="mb-3">
                <h6 class="small text-muted mb-2">Validation</h6>
                {issues.map((issue, i) => (
                  <div key={i} class="d-flex align-items-center gap-2 mb-1">
                    <span class={`badge ${severityBadge(issue.severity)}`} style="font-size: 0.65rem;">
                      {issue.severity}
                    </span>
                    <span class="small">{issue.message}</span>
                  </div>
                ))}
              </div>
            )}

            <div class="mb-3">
              <h6 class="small text-muted mb-2">Content</h6>
              <div
                class="rendered-markdown border rounded p-2 bg-body-secondary small"
                style="max-height: 400px; overflow-y: auto; white-space: pre-wrap;"
              >
                {skill.body || <em class="text-muted">No content.</em>}
              </div>
            </div>

            <button
              type="button"
              class="btn btn-sm btn-outline-info"
              onClick={() => onTrain(skillName)}
            >
              Train This Skill
            </button>
          </>
        )}
      </div>
    </div>
  );
}
