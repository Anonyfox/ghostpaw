import { useEffect, useState } from "preact/hooks";
import type { PackListResponse } from "../../shared/pack_types.ts";
import { apiGet } from "../api_get.ts";
import { PackBondCard } from "../components/pack_bond_card.tsx";
import { PackCommandBox } from "../components/pack_command_box.tsx";
import { PackMergePreviewPanel } from "../components/pack_merge_preview_panel.tsx";
import { PackPatrolPanel } from "../components/pack_patrol_panel.tsx";

type Tab = "confidants" | "lost";

export function PackPage() {
  const [tab, setTab] = useState<Tab>("confidants");
  const [data, setData] = useState<PackListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [field, setField] = useState("");
  const [group, setGroup] = useState("");

  const load = async (filters?: { search?: string; field?: string; group?: string }) => {
    const nextSearch = filters?.search ?? search;
    const nextField = filters?.field ?? field;
    const nextGroup = filters?.group ?? group;
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextField.trim()) params.set("field", nextField.trim());
      if (nextGroup.trim()) params.set("group", nextGroup.trim());
      const query = params.toString();
      const res = await apiGet<PackListResponse>(`/api/pack${query ? `?${query}` : ""}`);
      setData(res);
    } catch {
      // Silently degrade — the page renders empty state instead of crashing
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <p class="text-muted">Loading pack...</p>;
  }

  const members = data?.members ?? [];
  const counts = data?.counts ?? { active: 0, dormant: 0, lost: 0, total: 0 };

  const confidants = members.filter((m) => m.status !== "lost");
  const lost = members.filter((m) => m.status === "lost");

  return (
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0">Pack</h3>
        <ul class="nav nav-tabs mb-0">
          <li class="nav-item">
            <button
              type="button"
              class={`nav-link ${tab === "confidants" ? "active" : ""}`}
              onClick={() => setTab("confidants")}
            >
              Confidants
            </button>
          </li>
          <li class="nav-item">
            <button
              type="button"
              class={`nav-link ${tab === "lost" ? "active" : ""}`}
              onClick={() => setTab("lost")}
            >
              Lost ({counts.lost})
            </button>
          </li>
        </ul>
      </div>

      <PackCommandBox onSuccess={load} />

      <PackPatrolPanel />
      <PackMergePreviewPanel />

      <form
        class="card mb-4"
        onSubmit={(event) => {
          event.preventDefault();
          setLoading(true);
          load();
        }}
      >
        <div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-5">
              <label class="form-label small text-body-secondary" for="pack-search">
                Search
              </label>
              <input
                id="pack-search"
                class="form-control form-control-sm"
                value={search}
                onInput={(event) => setSearch((event.currentTarget as HTMLInputElement).value)}
                placeholder="name, bond, field..."
              />
            </div>
            <div class="col-md-3">
              <label class="form-label small text-body-secondary" for="pack-field">
                Field
              </label>
              <input
                id="pack-field"
                class="form-control form-control-sm"
                value={field}
                onInput={(event) => setField((event.currentTarget as HTMLInputElement).value)}
                placeholder="vip"
              />
            </div>
            <div class="col-md-2">
              <label class="form-label small text-body-secondary" for="pack-group-id">
                Group ID
              </label>
              <input
                id="pack-group-id"
                class="form-control form-control-sm"
                value={group}
                onInput={(event) => setGroup((event.currentTarget as HTMLInputElement).value)}
                placeholder="12"
              />
            </div>
            <div class="col-md-2 d-flex gap-2">
              <button class="btn btn-sm btn-outline-info flex-fill" type="submit">
                Apply
              </button>
              <button
                class="btn btn-sm btn-outline-secondary flex-fill"
                type="button"
                onClick={() => {
                  setSearch("");
                  setField("");
                  setGroup("");
                  setLoading(true);
                  void load({ search: "", field: "", group: "" });
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </form>

      <div class="d-flex gap-4 mb-4 text-muted small">
        <span>
          {counts.total} Confidant{counts.total !== 1 ? "s" : ""}
        </span>
        <span>{counts.active} Active</span>
        <span>{counts.dormant} Dormant</span>
      </div>

      {tab === "confidants" && (
        <div class="row g-3">
          {confidants.map((m) => (
            <div class="col-md-6 col-lg-4" key={m.id}>
              <PackBondCard member={m} />
            </div>
          ))}
        </div>
      )}

      {tab === "lost" && (
        <div>
          {lost.length === 0 ? (
            <p class="text-muted">No lost connections.</p>
          ) : (
            <div class="row g-3">
              {lost.map((m) => (
                <div class="col-md-6 col-lg-4" key={m.id}>
                  <PackBondCard member={m} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
