import { useEffect, useState } from "preact/hooks";
import { Link, useParams } from "wouter-preact";
import type { PackMemberDetailResponse } from "../../shared/pack_types.ts";
import { apiGet } from "../api_get.ts";
import { apiPatch } from "../api_patch.ts";
import { PackInteractionTimeline } from "../components/pack_interaction_timeline.tsx";
import { PackKindBadge } from "../components/pack_kind_badge.tsx";
import { PackNoteForm } from "../components/pack_note_form.tsx";
import { PackTrustPips } from "../components/pack_trust_pips.tsx";

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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_BADGES: Record<string, string> = {
  active: "bg-success",
  dormant: "bg-secondary",
  lost: "bg-danger",
};

export function PackDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [member, setMember] = useState<PackMemberDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingBond, setEditingBond] = useState(false);
  const [bondValue, setBondValue] = useState("");
  const [editingTrust, setEditingTrust] = useState(false);
  const [trustValue, setTrustValue] = useState(0.5);
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusValue, setStatusValue] = useState("active");

  const load = async () => {
    try {
      const data = await apiGet<PackMemberDetailResponse>(`/api/pack/${id}`);
      setMember(data);
      setBondValue(data.bond);
      setTrustValue(data.trust);
      setStatusValue(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load member.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const saveBond = async () => {
    try {
      await apiPatch(`/api/pack/${id}`, { bond: bondValue });
      setEditingBond(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update bond.");
    }
  };

  const saveTrust = async () => {
    try {
      await apiPatch(`/api/pack/${id}`, { trust: trustValue });
      setEditingTrust(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trust.");
    }
  };

  const saveStatus = async () => {
    try {
      await apiPatch(`/api/pack/${id}`, { status: statusValue });
      setEditingStatus(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  if (loading) return <p class="text-muted">Loading...</p>;
  if (!member) return <p class="text-danger">{error ?? "Member not found."}</p>;

  return (
    <div>
      <Link href="/pack" class="text-muted small text-decoration-none">
        &larr; Back to Pack
      </Link>

      {error && <div class="alert alert-danger mt-2">{error}</div>}

      <div class="d-flex justify-content-between align-items-start mt-3 mb-3">
        <div>
          <h3 class="mb-1">{member.name}</h3>
          <div class="d-flex align-items-center gap-2">
            <PackKindBadge kind={member.kind} />
            <span class={`badge ${STATUS_BADGES[member.status] ?? "bg-secondary"}`}>
              {member.status}
            </span>
          </div>
        </div>
        <div class="text-end">
          <PackTrustPips trust={member.trust} size="md" />
          <small class="text-body-tertiary d-block mt-1">
            Trust: {(member.trust * 100).toFixed(0)}% ({member.trustLevel})
          </small>
        </div>
      </div>

      {/* Bond Narrative */}
      <div class="card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title">Bond</h5>
            {!editingBond && (
              <button
                type="button"
                class="btn btn-sm btn-outline-info"
                onClick={() => setEditingBond(true)}
              >
                Edit
              </button>
            )}
          </div>
          {editingBond ? (
            <div>
              <textarea
                class="form-control mb-2"
                rows={4}
                value={bondValue}
                onInput={(e) => setBondValue((e.target as HTMLTextAreaElement).value)}
              />
              <div class="d-flex gap-2">
                <button type="button" class="btn btn-sm btn-info" onClick={saveBond}>
                  Save
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  onClick={() => setEditingBond(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div class="mt-2" style="white-space: pre-wrap;">
              {member.bond || <em class="text-muted">No bond narrative yet.</em>}
            </div>
          )}
        </div>
      </div>

      {/* Details Panel */}
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Details</h5>
          <div class="row g-3">
            <div class="col-md-6">
              <div class="mb-3">
                <span class="form-label small text-body-secondary d-block">Trust</span>
                {editingTrust ? (
                  <div class="d-flex align-items-center gap-2">
                    <input
                      type="range"
                      class="form-range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={trustValue}
                      onInput={(e) => setTrustValue(Number((e.target as HTMLInputElement).value))}
                    />
                    <small class="text-body-tertiary" style="min-width: 3em;">
                      {trustValue.toFixed(2)}
                    </small>
                    <button type="button" class="btn btn-sm btn-info" onClick={saveTrust}>
                      Save
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      onClick={() => setEditingTrust(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    class="d-flex align-items-center gap-2 btn btn-link p-0 text-decoration-none"
                    onClick={() => setEditingTrust(true)}
                  >
                    <PackTrustPips trust={member.trust} />
                    <small class="text-body-tertiary">{(member.trust * 100).toFixed(0)}%</small>
                  </button>
                )}
              </div>

              <div class="mb-3">
                <span class="form-label small text-body-secondary d-block">Status</span>
                {editingStatus ? (
                  <div class="d-flex align-items-center gap-2">
                    <select
                      class="form-select form-select-sm"
                      style="width: auto;"
                      value={statusValue}
                      onChange={(e) => setStatusValue((e.target as HTMLSelectElement).value)}
                    >
                      <option value="active">active</option>
                      <option value="dormant">dormant</option>
                      <option value="lost">lost</option>
                    </select>
                    <button type="button" class="btn btn-sm btn-info" onClick={saveStatus}>
                      Save
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      onClick={() => setEditingStatus(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    class="btn btn-link p-0 text-decoration-none"
                    onClick={() => setEditingStatus(true)}
                  >
                    <span class={`badge ${STATUS_BADGES[member.status] ?? "bg-secondary"}`}>
                      {member.status}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div class="col-md-6">
              <div class="mb-2 small">
                <span class="text-body-secondary">Kind:</span> <PackKindBadge kind={member.kind} />
              </div>
              <div class="mb-2 small">
                <span class="text-body-secondary">First contact:</span>{" "}
                {formatDate(member.firstContact)}
              </div>
              <div class="mb-2 small">
                <span class="text-body-secondary">Last contact:</span>{" "}
                {relativeTime(member.lastContact)}
              </div>
              <div class="mb-2 small">
                <span class="text-body-secondary">Created:</span> {formatDate(member.createdAt)}
              </div>
              <div class="mb-2 small">
                <span class="text-body-secondary">Updated:</span> {relativeTime(member.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note Form */}
      <div class="mb-4">
        <PackNoteForm memberId={id} onNoted={load} />
      </div>

      {/* Interaction Timeline */}
      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title mb-3">Interaction Journal</h5>
          <PackInteractionTimeline interactions={member.interactions} />
        </div>
      </div>
    </div>
  );
}
