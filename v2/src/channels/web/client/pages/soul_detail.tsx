import { useEffect, useState } from "preact/hooks";
import { Link, useParams } from "wouter-preact";
import type { SoulDetailResponse } from "../../shared/soul_types.ts";
import { apiDelete } from "../api_delete.ts";
import { apiGet } from "../api_get.ts";
import { apiPatch } from "../api_patch.ts";
import { apiPost } from "../api_post.ts";
import { SoulAddTraitForm } from "../components/soul_add_trait_form.tsx";
import { SoulLevelHistory } from "../components/soul_level_history.tsx";
import { SoulTraitList } from "../components/soul_trait_list.tsx";
import { SoulXpBar } from "../components/soul_xp_bar.tsx";

export function SoulDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [soul, setSoul] = useState<SoulDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingEssence, setEditingEssence] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [essenceValue, setEssenceValue] = useState("");
  const [suggestingName, setSuggestingName] = useState(false);
  const [suggestingDesc, setSuggestingDesc] = useState(false);

  const load = async () => {
    try {
      const data = await apiGet<SoulDetailResponse>(`/api/souls/${id}`);
      setSoul(data);
      setNameValue(data.name);
      setDescriptionValue(data.description);
      setEssenceValue(data.essence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load soul.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const saveName = async () => {
    try {
      await apiPatch(`/api/souls/${id}`, { name: nameValue });
      setEditingName(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name.");
    }
  };

  const saveDescription = async () => {
    try {
      await apiPatch(`/api/souls/${id}`, { description: descriptionValue });
      setEditingDescription(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update description.");
    }
  };

  const saveEssence = async () => {
    try {
      await apiPatch(`/api/souls/${id}`, { essence: essenceValue });
      setEditingEssence(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update essence.");
    }
  };

  const suggestDescription = async () => {
    setSuggestingDesc(true);
    setError(null);
    try {
      const data = await apiPost<{ description?: string; error?: string }>(
        `/api/souls/${id}/generate-description`,
      );
      if (data.description) {
        setDescriptionValue(data.description);
        setEditingDescription(true);
      } else {
        setError(data.error ?? "Failed to generate description.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate description.");
    } finally {
      setSuggestingDesc(false);
    }
  };

  const suggestName = async () => {
    setSuggestingName(true);
    setError(null);
    try {
      const data = await apiPost<{ name?: string; error?: string }>(
        `/api/souls/${id}/generate-name`,
      );
      if (data.name) {
        setNameValue(data.name);
        setEditingName(true);
      } else {
        setError(data.error ?? "Failed to generate name.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate name.");
    } finally {
      setSuggestingName(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Archive soul "${soul?.name}"?`)) return;
    try {
      await apiDelete(`/api/souls/${id}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive.");
    }
  };

  const handleRestore = async () => {
    try {
      await apiPost(`/api/souls/${id}/restore`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore.");
    }
  };

  if (loading) return <p class="text-muted">Loading...</p>;
  if (!soul) return <p class="text-danger">{error ?? "Soul not found."}</p>;

  const isArchived = soul.deletedAt != null;
  const activeTraitCount = soul.traits.filter((t) => t.status === "active").length;
  const statusCounts: Record<string, number> = {};
  for (const t of soul.traits) statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;

  return (
    <div>
      <Link href="/souls" class="text-muted small text-decoration-none">
        &larr; Back to Souls
      </Link>

      {isArchived && (
        <div class="alert alert-warning mt-3 d-flex justify-content-between align-items-center">
          <span>This soul is archived.</span>
          <button type="button" class="btn btn-sm btn-success" onClick={handleRestore}>
            Restore
          </button>
        </div>
      )}

      {error && <div class="alert alert-danger mt-2">{error}</div>}

      <div class="d-flex justify-content-between align-items-start mt-3 mb-3">
        <div>
          {editingName && !isArchived ? (
            <div class="d-flex gap-2 align-items-center">
              <input
                type="text"
                class="form-control"
                value={nameValue}
                onInput={(e) => setNameValue((e.target as HTMLInputElement).value)}
              />
              <button type="button" class="btn btn-sm btn-info" onClick={saveName}>
                Save
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                onClick={() => setEditingName(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div class="d-flex align-items-center gap-2">
              <h3
                role={!isArchived ? "button" : undefined}
                tabIndex={!isArchived ? 0 : undefined}
                class="mb-0"
                style={!isArchived ? "cursor: pointer;" : ""}
                onClick={() => !isArchived && setEditingName(true)}
                onKeyDown={(e) => e.key === "Enter" && !isArchived && setEditingName(true)}
              >
                {soul.name}
              </h3>
              {!isArchived && (
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm py-0 px-1"
                  style="font-size: 0.7rem;"
                  onClick={suggestName}
                  disabled={suggestingName}
                >
                  {suggestingName ? "..." : "Suggest"}
                </button>
              )}
            </div>
          )}
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge bg-info fs-6">Lv. {soul.level}</span>
          {soul.isMandatory && <span class="badge bg-warning text-dark">Mandatory</span>}
          {!soul.isMandatory && !isArchived && (
            <button type="button" class="btn btn-outline-danger btn-sm" onClick={handleArchive}>
              Archive
            </button>
          )}
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-body py-3">
          <SoulXpBar
            activeTraits={activeTraitCount}
            traitLimit={soul.traitLimit}
            variant="full"
            isArchived={isArchived}
          />
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title">Description</h5>
            {!isArchived && !editingDescription && (
              <div class="d-flex gap-1">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-info"
                  onClick={() => setEditingDescription(true)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  onClick={suggestDescription}
                  disabled={suggestingDesc}
                >
                  {suggestingDesc ? "Generating..." : "Suggest"}
                </button>
              </div>
            )}
          </div>
          {editingDescription && !isArchived ? (
            <div>
              <textarea
                class="form-control mb-2"
                rows={3}
                value={descriptionValue}
                onInput={(e) => setDescriptionValue((e.target as HTMLTextAreaElement).value)}
              />
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-info" onClick={saveDescription}>
                  Save
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  onClick={() => setEditingDescription(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div class="mt-2" style="white-space: pre-wrap;">
              {soul.description || <em class="text-muted">No description yet.</em>}
            </div>
          )}
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title">Essence</h5>
            {!isArchived && !editingEssence && (
              <button
                type="button"
                class="btn btn-sm btn-outline-info"
                onClick={() => setEditingEssence(true)}
              >
                Edit
              </button>
            )}
          </div>
          {editingEssence && !isArchived ? (
            <div>
              <textarea
                class="form-control mb-2"
                rows={6}
                value={essenceValue}
                onInput={(e) => setEssenceValue((e.target as HTMLTextAreaElement).value)}
              />
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-info" onClick={saveEssence}>
                  Save
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  onClick={() => setEditingEssence(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div class="mt-2" style="white-space: pre-wrap;">
              {soul.essence || <em class="text-muted">No essence yet.</em>}
            </div>
          )}
        </div>
      </div>

      <div class="d-flex gap-3 mb-4 text-muted small">
        <span>Active: {statusCounts.active ?? 0}</span>
        <span>Consolidated: {statusCounts.consolidated ?? 0}</span>
        <span>Promoted: {statusCounts.promoted ?? 0}</span>
        <span>Reverted: {statusCounts.reverted ?? 0}</span>
      </div>

      {!isArchived && <SoulAddTraitForm soulId={soul.id} onAdded={load} />}

      <div class="mb-4">
        <h5 class="mb-3">Traits</h5>
        <SoulTraitList
          traits={soul.traits}
          soulId={soul.id}
          isArchived={isArchived}
          onUpdated={load}
        />
      </div>

      <SoulLevelHistory
        levels={soul.levels}
        soulId={soul.id}
        isArchived={isArchived}
        activeTraitCount={activeTraitCount}
        traitLimit={soul.traitLimit}
        onUpdated={load}
      />
    </div>
  );
}
