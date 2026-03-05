import { useEffect, useState } from "preact/hooks";
import type {
  SkillSummaryInfo,
  TrainerExecuteResponse,
  TrainerOption,
  TrainerProposalResponse,
} from "../../shared/trainer_types.ts";
import { apiPost } from "../api_post.ts";
import { TrainerActionCard } from "./trainer_action_card.tsx";
import { TrainerInput } from "./trainer_input.tsx";
import { TrainerOptionsPicker } from "./trainer_options_picker.tsx";
import { TrainerResponse } from "./trainer_response.tsx";

type Action = "scout" | "train" | null;
type Phase = "idle" | "input" | "proposing" | "options" | "executing" | "result";

interface TrainerWorkshopProps {
  trainerAvailable: boolean;
  pendingChanges: number;
  skills: SkillSummaryInfo[];
  onSkillsChanged: () => void;
  initialTrainSkill?: string;
}

const PROPOSING_TEXT: Record<string, string> = {
  scout: "The Trainer is analyzing skill gaps...",
  train: "The Trainer is reviewing this skill...",
};

const EXECUTING_TEXT: Record<string, string> = {
  scout: "The Trainer is creating the new skill...",
  train: "The Trainer is applying the improvement...",
};

export function TrainerWorkshop({
  trainerAvailable,
  pendingChanges,
  skills,
  onSkillsChanged,
  initialTrainSkill,
}: TrainerWorkshopProps) {
  const [action, setAction] = useState<Action>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [options, setOptions] = useState<TrainerOption[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [trainSkillName, setTrainSkillName] = useState<string | null>(null);
  const [proposeCost, setProposeCost] = useState(0);
  const [result, setResult] = useState<TrainerExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTrainSkill) {
      setAction("train");
      setTrainSkillName(initialTrainSkill);
      runPropose("train", initialTrainSkill);
    }
  }, [initialTrainSkill]);

  const busy = phase === "proposing" || phase === "executing";

  const reset = () => {
    setAction(null);
    setPhase("idle");
    setOptions([]);
    setSessionId(null);
    setTrainSkillName(null);
    setProposeCost(0);
    setResult(null);
    setError(null);
  };

  const runPropose = async (act: "scout" | "train", value?: string) => {
    setError(null);
    setPhase("proposing");
    try {
      const endpoint =
        act === "scout" ? "/api/trainer/scout/propose" : "/api/trainer/train/propose";
      const body =
        act === "scout" ? (value ? { direction: value } : {}) : { skillName: value };
      const res = await apiPost<TrainerProposalResponse>(endpoint, body);
      setOptions(res.options);
      setSessionId(res.sessionId);
      setProposeCost(res.cost.totalUsd);
      setPhase("options");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proposal failed.");
      setPhase("idle");
      setAction(null);
    }
  };

  const runExecute = async (optionId?: string, guidance?: string) => {
    if (sessionId == null) return;
    setError(null);
    setPhase("executing");
    try {
      const endpoint =
        action === "scout" ? "/api/trainer/scout/execute" : "/api/trainer/train/execute";
      const body: Record<string, unknown> = { sessionId };
      if (optionId) body.optionId = optionId;
      if (guidance) body.guidance = guidance;
      if (action === "train" && trainSkillName) body.skillName = trainSkillName;

      const selected = options.find((o) => o.id === optionId);
      if (selected) {
        body.optionTitle = selected.title;
        body.optionDescription = selected.description;
      }

      const res = await apiPost<TrainerExecuteResponse>(endpoint, body);
      setResult(res);
      setPhase("result");
      if (res.succeeded) onSkillsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed.");
      setPhase("options");
    }
  };

  const handleScoutStart = () => {
    setError(null);
    setAction("scout");
    setPhase("input");
    setResult(null);
  };

  const handleTrainStart = () => {
    setError(null);
    setAction("train");
    setPhase("input");
    setResult(null);
  };

  const handleInputSubmit = (value: string) => {
    if (action === "scout") {
      runPropose("scout", value || undefined);
    } else if (action === "train") {
      setTrainSkillName(value);
      runPropose("train", value);
    }
  };

  const handleOptionPick = (optionId: string) => {
    runExecute(optionId);
  };

  const handleCustomGuidance = (text: string) => {
    runExecute(undefined, text);
  };

  const loadingText =
    phase === "proposing"
      ? PROPOSING_TEXT[action ?? "scout"]
      : EXECUTING_TEXT[action ?? "scout"];

  const workshopBorder = pendingChanges > 0 ? "border-warning" : "border-info";

  const totalCost = proposeCost + (result?.cost.totalUsd ?? 0);

  return (
    <div class={`card ${workshopBorder} mb-4`}>
      <div class="card-body">
        <h5 class="card-title mb-3">Trainer Workshop</h5>

        {!trainerAvailable && (
          <p class="text-muted small mb-3">
            Skill training requires an LLM provider.{" "}
            <a href="/settings" class="text-info">
              Configure in Settings
            </a>{" "}
            to enable.
          </p>
        )}

        {error && <div class="alert alert-danger py-1 px-2 small mb-3">{error}</div>}

        <div class="row g-3 mb-0">
          <div class="col-md-6">
            <TrainerActionCard
              title="Scout"
              description="Discover and create new skills from gaps and opportunities"
              buttonLabel="Scout"
              disabled={!trainerAvailable || busy}
              active={action === "scout"}
              onClick={handleScoutStart}
            />
          </div>
          <div class="col-md-6">
            <TrainerActionCard
              title="Train"
              description="Improve an existing skill based on experience"
              buttonLabel="Train"
              disabled={!trainerAvailable || busy}
              active={action === "train"}
              statusText={pendingChanges > 0 ? `${pendingChanges} pending` : undefined}
              variant={pendingChanges > 0 ? "ready" : "default"}
              onClick={handleTrainStart}
            />
          </div>
        </div>

        {phase === "input" && action && (
          <TrainerInput
            mode={action}
            skills={action === "train" ? skills : undefined}
            onSubmit={handleInputSubmit}
            onCancel={reset}
            disabled={busy}
          />
        )}

        {(phase === "proposing" || phase === "executing") && (
          <div class="mt-3 text-center py-3">
            <div class="spinner-border spinner-border-sm text-info me-2" />
            <span class="text-muted small">{loadingText}</span>
          </div>
        )}

        {phase === "options" && options.length > 0 && (
          <TrainerOptionsPicker
            options={options}
            onPick={handleOptionPick}
            onCustom={handleCustomGuidance}
            onCancel={reset}
          />
        )}

        {phase === "result" && result && (
          <TrainerResponse
            content={result.content}
            succeeded={result.succeeded}
            cost={{ totalUsd: totalCost }}
            onClose={reset}
          />
        )}
      </div>
    </div>
  );
}
