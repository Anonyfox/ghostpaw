import { useEffect, useState } from "preact/hooks";
import type { SoulsListResponse } from "../../shared/soul_types.ts";
import { apiDelete } from "../api_delete.ts";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import { SoulCard } from "../components/soul_card.tsx";
import { SoulCreateForm } from "../components/soul_create_form.tsx";

type Tab = "active" | "dormant";

interface ShardReadinessEntry {
  soulId: number;
  count: number;
  sourceCount: number;
  crystallizing: boolean;
}

export function SoulsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [souls, setSouls] = useState<SoulsListResponse["souls"]>([]);
  const [dormant, setDormant] = useState<SoulsListResponse["souls"]>([]);
  const [traitLimit, setTraitLimit] = useState(10);
  const [shardReadiness, setShardReadiness] = useState<ShardReadinessEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [activeRes, dormantRes, readinessRes] = await Promise.all([
        apiGet<SoulsListResponse>("/api/souls"),
        apiGet<SoulsListResponse>("/api/souls/dormant"),
        apiGet<{ readiness: ShardReadinessEntry[] }>("/api/souls/shard-readiness"),
      ]);
      setSouls(activeRes.souls);
      setDormant(dormantRes.souls);
      setTraitLimit(activeRes.traitLimit);
      setShardReadiness(readinessRes.readiness);
    } catch {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRetire = async (id: number) => {
    try {
      await apiDelete(`/api/souls/${id}`);
      load();
    } catch {
      // handled gracefully
    }
  };

  const handleAwaken = async (id: number) => {
    try {
      await apiPost(`/api/souls/${id}/awaken`);
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
              class={`nav-link ${tab === "dormant" ? "active" : ""}`}
              onClick={() => setTab("dormant")}
            >
              Dormant ({dormant.length})
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
              <SoulCard
                soul={heroSoul}
                traitLimit={traitLimit}
                variant="hero"
                shardInfo={shardReadiness.find((r) => r.soulId === heroSoul.id)}
              />
            </div>
          )}

          {partySouls.length > 0 && (
            <div class="mb-4">
              <h5 class="text-muted mb-3">Core Party</h5>
              <div class="row g-3">
                {partySouls.map((s) => (
                  <div class="col-md-6 col-lg-4" key={s.id}>
                    <SoulCard
                      soul={s}
                      traitLimit={traitLimit}
                      variant="party"
                      shardInfo={shardReadiness.find((r) => r.soulId === s.id)}
                    />
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
                    onRetire={handleRetire}
                    shardInfo={shardReadiness.find((r) => r.soulId === s.id)}
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

      {tab === "dormant" && (
        <div>
          {dormant.length === 0 ? (
            <p class="text-muted">No dormant souls.</p>
          ) : (
            <div class="row g-3">
              {dormant.map((s) => (
                <div class="col-md-6 col-lg-4" key={s.id}>
                  <SoulCard
                    soul={s}
                    traitLimit={traitLimit}
                    variant="dormant"
                    onAwaken={handleAwaken}
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
