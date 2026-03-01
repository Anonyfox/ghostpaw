import { useEffect, useState } from "preact/hooks";
import type { SoulsListResponse } from "../../shared/soul_types.ts";
import { apiDelete } from "../api_delete.ts";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import { SoulCard } from "../components/soul_card.tsx";
import { SoulCreateForm } from "../components/soul_create_form.tsx";

type Tab = "active" | "graveyard";

export function SoulsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [souls, setSouls] = useState<SoulsListResponse["souls"]>([]);
  const [deleted, setDeleted] = useState<SoulsListResponse["souls"]>([]);
  const [traitLimit, setTraitLimit] = useState(10);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [activeRes, deletedRes] = await Promise.all([
        apiGet<SoulsListResponse>("/api/souls"),
        apiGet<SoulsListResponse>("/api/souls/deleted"),
      ]);
      setSouls(activeRes.souls);
      setDeleted(deletedRes.souls);
      setTraitLimit(activeRes.traitLimit);
    } catch {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleArchive = async (id: number) => {
    try {
      await apiDelete(`/api/souls/${id}`);
      load();
    } catch {
      // handled gracefully
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await apiPost(`/api/souls/${id}/restore`);
      load();
    } catch {
      // handled gracefully
    }
  };

  if (loading) {
    return <p class="text-muted">Loading souls...</p>;
  }

  const heroSoul = souls.find((s) => s.id === 1);
  const partySouls = souls.filter((s) => s.isMandatory && s.id !== 1);
  const customSouls = souls.filter((s) => !s.isMandatory);

  const totalTraits = souls.reduce((sum, s) => sum + s.activeTraitCount, 0);
  const totalLevels = souls.reduce((sum, s) => sum + s.level, 0);

  return (
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0">Souls</h3>
        <ul class="nav nav-tabs mb-0">
          <li class="nav-item">
            <button
              type="button"
              class={`nav-link ${tab === "active" ? "active" : ""}`}
              onClick={() => setTab("active")}
            >
              Active Party
            </button>
          </li>
          <li class="nav-item">
            <button
              type="button"
              class={`nav-link ${tab === "graveyard" ? "active" : ""}`}
              onClick={() => setTab("graveyard")}
            >
              Graveyard ({deleted.length})
            </button>
          </li>
        </ul>
      </div>

      {tab === "active" && (
        <div>
          <div class="d-flex gap-4 mb-4 text-muted small">
            <span>
              {souls.length} Active Soul{souls.length !== 1 ? "s" : ""}
            </span>
            <span>
              {totalTraits} Active Trait{totalTraits !== 1 ? "s" : ""}
            </span>
            <span>
              {totalLevels} Level-Up{totalLevels !== 1 ? "s" : ""}
            </span>
          </div>

          {heroSoul && (
            <div class="mb-4">
              <SoulCard soul={heroSoul} traitLimit={traitLimit} variant="hero" />
            </div>
          )}

          {partySouls.length > 0 && (
            <div class="mb-4">
              <h5 class="text-muted mb-3">Core Party</h5>
              <div class="row g-3">
                {partySouls.map((s) => (
                  <div class="col-md-6 col-lg-4" key={s.id}>
                    <SoulCard soul={s} traitLimit={traitLimit} variant="party" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div class="mb-4">
            <h5 class="text-muted mb-3">Custom Souls</h5>
            <div class="row g-3">
              {customSouls.map((s) => (
                <div class="col-md-6 col-lg-4" key={s.id}>
                  <SoulCard
                    soul={s}
                    traitLimit={traitLimit}
                    variant="custom"
                    onArchive={handleArchive}
                  />
                </div>
              ))}
              <div class="col-md-6 col-lg-4">
                <SoulCreateForm onCreated={load} />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "graveyard" && (
        <div>
          {deleted.length === 0 ? (
            <p class="text-muted">No archived souls.</p>
          ) : (
            <div class="row g-3">
              {deleted.map((s) => (
                <div class="col-md-6 col-lg-4" key={s.id}>
                  <SoulCard
                    soul={s}
                    traitLimit={traitLimit}
                    variant="graveyard"
                    onRestore={handleRestore}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
