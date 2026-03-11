import { useState } from "preact/hooks";
import { Link } from "wouter-preact";
import type { PackMergePreviewResponse } from "../../shared/pack_types.ts";
import { apiGet } from "../api_get.ts";

function fmtValue(value: string | number | null): string {
  if (value === null || value === "") return "none";
  return String(value);
}

export function PackMergePreviewPanel() {
  const [keep, setKeep] = useState("");
  const [merge, setMerge] = useState("");
  const [preview, setPreview] = useState<PackMergePreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPreview = async (event: Event) => {
    event.preventDefault();
    if (!keep.trim() || !merge.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<PackMergePreviewResponse>(
        `/api/pack/merge-preview?keep=${encodeURIComponent(keep.trim())}&merge=${encodeURIComponent(merge.trim())}`,
      );
      setPreview(result);
    } catch {
      setPreview(null);
      setError("Could not load merge preview.");
    } finally {
      setLoading(false);
    }
  };

  const changedChoices =
    preview?.memberChoices.filter((choice) => choice.chosenSource !== "same") ?? [];

  return (
    <div class="card mb-4">
      <div class="card-body">
        <h6 class="card-title mb-3">Merge Preview</h6>
        <form class="row g-2 align-items-end mb-3" onSubmit={loadPreview}>
          <div class="col-sm-4">
            <label class="form-label small text-body-secondary">Keep ID</label>
            <input
              class="form-control form-control-sm"
              value={keep}
              onInput={(event) => setKeep((event.currentTarget as HTMLInputElement).value)}
            />
          </div>
          <div class="col-sm-4">
            <label class="form-label small text-body-secondary">Merge ID</label>
            <input
              class="form-control form-control-sm"
              value={merge}
              onInput={(event) => setMerge((event.currentTarget as HTMLInputElement).value)}
            />
          </div>
          <div class="col-sm-4">
            <button class="btn btn-sm btn-outline-info w-100" type="submit" disabled={loading}>
              {loading ? "Loading..." : "Preview"}
            </button>
          </div>
        </form>

        {error && <div class="small text-danger">{error}</div>}

        {preview && (
          <div class="small">
            <div class="mb-2">
              <Link href={`/pack/${preview.keepMember.id}`} class="text-info text-decoration-none">
                {preview.keepMember.name}
              </Link>
              <span class="text-body-tertiary mx-2">keeps</span>
              <Link href={`/pack/${preview.mergeMember.id}`} class="text-info text-decoration-none">
                {preview.mergeMember.name}
              </Link>
            </div>

            {changedChoices.length > 0 && (
              <div class="mb-3">
                <div class="text-body-secondary mb-1">Survivorship</div>
                {changedChoices.map((choice) => (
                  <div key={choice.field}>
                    <span class="text-body-secondary">{choice.field}</span>
                    <span class="mx-2">
                      {fmtValue(choice.keepValue)} / {fmtValue(choice.mergeValue)}
                    </span>
                    <span class="text-info">
                      {fmtValue(choice.chosenValue)} ({choice.chosenSource})
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div class="mb-3">
              <div class="text-body-secondary mb-1">Interactions</div>
              <div>
                keep {preview.interactions.keepCount} / merge {preview.interactions.mergeCount} /
                combined {preview.interactions.combinedCount}
              </div>
            </div>

            {preview.fieldConflicts.length > 0 && (
              <div class="mb-3">
                <div class="text-body-secondary mb-1">Field conflicts</div>
                {preview.fieldConflicts.map((field) => (
                  <div key={field.key}>
                    {field.key}: {fmtValue(field.keepValue)} / {fmtValue(field.mergeValue)} {"->"}{" "}
                    <span class="text-info">
                      {fmtValue(field.chosenValue)} ({field.chosenSource})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {preview.linkConflicts.length > 0 && (
              <div class="mb-3">
                <div class="text-body-secondary mb-1">Link conflicts</div>
                {preview.linkConflicts.map((conflict, index) => (
                  <div key={`${conflict.label}-${index}`}>
                    {conflict.direction}: {conflict.label} {conflict.memberName} {"->"}{" "}
                    {conflict.targetName}
                    <span class="text-body-tertiary ms-2">({conflict.resolution})</span>
                  </div>
                ))}
              </div>
            )}

            {preview.overlappingContacts.length > 0 && (
              <div>
                <div class="text-body-secondary mb-1">Overlapping contacts</div>
                {preview.overlappingContacts.map((contact) => (
                  <div key={`${contact.type}-${contact.value}`}>
                    {contact.type}: {contact.value}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
