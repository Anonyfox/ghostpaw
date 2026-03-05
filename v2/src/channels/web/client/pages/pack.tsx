import { useEffect, useState } from "preact/hooks";
import type { PackListResponse } from "../../shared/pack_types.ts";
import { apiGet } from "../api_get.ts";
import { PackBondCard } from "../components/pack_bond_card.tsx";
import { PackMeetForm } from "../components/pack_meet_form.tsx";

type Tab = "confidants" | "lost";

export function PackPage() {
  const [tab, setTab] = useState<Tab>("confidants");
  const [data, setData] = useState<PackListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await apiGet<PackListResponse>("/api/pack");
      setData(res);
    } catch {
      // handled gracefully
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
          <div class="col-md-6 col-lg-4">
            <PackMeetForm onCreated={load} />
          </div>
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
