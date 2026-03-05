import { useState } from "preact/hooks";
import { Link } from "wouter-preact";
import type { MentorActionResponse } from "../../shared/mentor_types.ts";
import type { LevelInfo, SoulDetailResponse } from "../../shared/soul_types.ts";
import { apiPost } from "../api_post.ts";
import { MentorActionCard } from "./mentor_action_card.tsx";
import { MentorEvolutionResult } from "./mentor_evolution_result.tsx";
import { MentorEvolveConfirm } from "./mentor_evolve_confirm.tsx";
import { MentorResponse } from "./mentor_response.tsx";
import { MentorTrainInput } from "./mentor_train_input.tsx";

type Action = "consult" | "train" | "evolve" | null;
type Phase = "idle" | "input" | "confirm" | "loading" | "result";

interface MentorChamberProps {
  soul: SoulDetailResponse;
  onUpdated: () => Promise<SoulDetailResponse>;
}

export function MentorChamber({ soul, onUpdated }: MentorChamberProps) {
  const [action, setAction] = useState<Action>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<MentorActionResponse | null>(null);
  const [evolutionLevel, setEvolutionLevel] = useState<LevelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTraitCount = soul.traits.filter((t) => t.status === "active").length;
  const isReady = activeTraitCount >= soul.traitLimit;
  const busy = phase === "loading";

  const reset = () => {
    setAction(null);
    setPhase("idle");
    setResult(null);
    setEvolutionLevel(null);
    setError(null);
  };

  const handleConsult = async () => {
    setError(null);
    setAction("consult");
    setPhase("loading");
    try {
      const res = await apiPost<MentorActionResponse>(`/api/souls/${soul.id}/review`);
      setResult(res);
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
      setPhase("idle");
      setAction(null);
    }
  };

  const handleTrainSubmit = async (feedback: string) => {
    setError(null);
    setPhase("loading");
    try {
      const res = await apiPost<MentorActionResponse>(`/api/souls/${soul.id}/refine`, {
        feedback,
      });
      setResult(res);
      setPhase("result");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refinement failed.");
      setPhase("idle");
      setAction(null);
    }
  };

  const handleEvolveConfirm = async () => {
    setError(null);
    const prevLevel = soul.level;
    setPhase("loading");
    try {
      const res = await apiPost<MentorActionResponse>(`/api/souls/${soul.id}/level-up`);
      setResult(res);
      if (res.succeeded) {
        const fresh = await onUpdated();
        const newEntry = [...fresh.levels]
          .sort((a, b) => b.createdAt - a.createdAt)
          .find((l) => l.level > prevLevel);
        setEvolutionLevel(newEntry ?? null);
      }
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Level-up failed.");
      setPhase("idle");
      setAction(null);
    }
  };

  const loadingText =
    action === "consult"
      ? "The Mentor is examining this soul..."
      : action === "train"
        ? "The Mentor is processing your guidance..."
        : "The soul is evolving...";

  const chamberBorder = isReady && soul.mentorAvailable ? "border-warning" : "border-info";

  return (
    <div class={`card ${chamberBorder} mb-4`}>
      <div class="card-body">
        <h5 class="card-title mb-3">Mentor's Chamber</h5>

        {!soul.mentorAvailable && (
          <div>
            <p class="text-muted small mb-3">
              Soul mentoring requires an LLM provider.{" "}
              <Link href="/settings" class="text-info">
                Configure in Settings
              </Link>{" "}
              to enable.
            </p>
          </div>
        )}

        {error && <div class="alert alert-danger py-1 px-2 small mb-3">{error}</div>}

        <div class="row g-3 mb-0">
          <div class="col-md-4">
            <MentorActionCard
              title="Consult"
              description="Assess the soul's current state and growth potential"
              buttonLabel="Consult"
              disabled={!soul.mentorAvailable || busy}
              active={action === "consult"}
              onClick={handleConsult}
            />
          </div>
          <div class="col-md-4">
            <MentorActionCard
              title="Train"
              description="Guide the soul's growth with your feedback"
              buttonLabel="Train"
              disabled={!soul.mentorAvailable || busy}
              active={action === "train"}
              onClick={() => {
                setError(null);
                setAction("train");
                setPhase("input");
                setResult(null);
              }}
            />
          </div>
          <div class="col-md-4">
            <MentorActionCard
              title="Evolve"
              description="Ascend to the next level"
              buttonLabel={isReady ? "Evolve Now" : "Evolve"}
              disabled={!soul.mentorAvailable || busy || !isReady}
              active={action === "evolve"}
              variant={isReady && soul.mentorAvailable ? "ready" : "default"}
              statusText={`${activeTraitCount}/${soul.traitLimit}`}
              onClick={() => {
                setError(null);
                setAction("evolve");
                setPhase("confirm");
                setResult(null);
              }}
            />
          </div>
        </div>

        {phase === "input" && action === "train" && (
          <MentorTrainInput onSubmit={handleTrainSubmit} onCancel={reset} disabled={busy} />
        )}

        {phase === "confirm" && action === "evolve" && (
          <MentorEvolveConfirm
            soulName={soul.name}
            onConfirm={handleEvolveConfirm}
            onCancel={reset}
          />
        )}

        {phase === "loading" && (
          <div class="mt-3 text-center py-3">
            <div class="spinner-border spinner-border-sm text-info me-2" />
            <span class="text-muted small">{loadingText}</span>
          </div>
        )}

        {phase === "result" &&
          result &&
          (action === "evolve" && evolutionLevel ? (
            <MentorEvolutionResult
              content={result.content}
              succeeded={result.succeeded}
              cost={result.cost}
              level={evolutionLevel}
              newLevel={evolutionLevel.level}
              onClose={reset}
            />
          ) : (
            <MentorResponse
              content={result.content}
              succeeded={result.succeeded}
              cost={result.cost}
              onClose={reset}
            />
          ))}
      </div>
    </div>
  );
}
