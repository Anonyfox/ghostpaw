import type { SkillSummaryInfo } from "../../shared/trainer_types.ts";
import { SkillCard } from "./skill_card.tsx";

interface SkillInventoryProps {
  skills: SkillSummaryInfo[];
  onSelectSkill: (name: string) => void;
}

export function SkillInventory({ skills, onSelectSkill }: SkillInventoryProps) {
  if (skills.length === 0) {
    return (
      <div class="card border-secondary mb-4">
        <div class="card-body text-center py-4">
          <p class="text-muted mb-0">
            No skills discovered yet. Start a Training session to bootstrap your skill library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div class="mb-4">
      <h5 class="mb-3">Skill Inventory</h5>
      <div class="row g-3">
        {skills.map((skill) => (
          <div key={skill.name} class="col-md-6 col-lg-4">
            <SkillCard skill={skill} onClick={() => onSelectSkill(skill.name)} />
          </div>
        ))}
      </div>
    </div>
  );
}
