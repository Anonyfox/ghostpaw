import { useEffect, useState } from "preact/hooks";
import type { SkillSummaryInfo, TrainerStatusResponse } from "../../shared/trainer_types.ts";
import { apiGet } from "../api_get.ts";
import { SkillDetailModal } from "../components/skill_detail_modal.tsx";
import { SkillInventory } from "../components/skill_inventory.tsx";
import { TrainerWorkshop } from "../components/trainer_workshop.tsx";

export function TrainingGroundsPage() {
  const [status, setStatus] = useState<TrainerStatusResponse | null>(null);
  const [skills, setSkills] = useState<SkillSummaryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [trainTarget, setTrainTarget] = useState<string | undefined>(undefined);

  const loadData = async () => {
    try {
      const [s, sk] = await Promise.all([
        apiGet<TrainerStatusResponse>("/api/trainer/status"),
        apiGet<SkillSummaryInfo[]>("/api/skills"),
      ]);
      setStatus(s);
      setSkills(sk);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTrainFromDetail = (name: string) => {
    setSelectedSkill(null);
    setTrainTarget(name);
  };

  if (loading) return <p class="text-muted">Loading...</p>;
  if (error && !status) return <p class="text-danger">{error}</p>;

  return (
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3 class="mb-0">Training Grounds</h3>
        {status && (
          <div class="d-flex gap-3 text-muted small">
            <span>{status.skillCount} Skill{status.skillCount !== 1 ? "s" : ""}</span>
            <span>{status.totalRanks} Total Ranks</span>
            {status.pendingChanges > 0 && (
              <span class="text-warning">{status.pendingChanges} Pending</span>
            )}
          </div>
        )}
      </div>

      {error && <div class="alert alert-danger py-1 px-2 small mb-3">{error}</div>}

      <TrainerWorkshop
        trainerAvailable={status?.trainerAvailable ?? false}
        pendingChanges={status?.pendingChanges ?? 0}
        skills={skills}
        onSkillsChanged={loadData}
        initialTrainSkill={trainTarget}
      />

      <SkillInventory skills={skills} onSelectSkill={setSelectedSkill} />

      {selectedSkill && (
        <SkillDetailModal
          skillName={selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onTrain={handleTrainFromDetail}
        />
      )}
    </div>
  );
}
