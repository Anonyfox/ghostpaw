import { useState } from "preact/hooks";
import { Link } from "wouter-preact";
import type { MentorActionResponse } from "../../shared/mentor_types.ts";
import type { LevelInfo, SoulDetailResponse } from "../../shared/soul_types.ts";
import { apiPost } from "../api_post.ts";
import { MentorActionCard } from "./mentor_action_card.tsx";
import { MentorLevelUpConfirm } from "./mentor_level_up_confirm.tsx";
import { MentorLevelUpResult } from "./mentor_level_up_result.tsx";
import { MentorRefineInput } from "./mentor_refine_input.tsx";
import { MentorResponse } from "./mentor_response.tsx";

type Action = "review" | "refine" | "levelUp" | null;
type Phase = "idle" | "input" | "confirm" | "loading" | "result";

interface MentorChamberProps {
  soul: SoulDetailResponse;
  onUpdated: () => Promise<SoulDetailResponse>;
}

export function MentorChamber({ soul, onUpdated }: MentorChamberProps) {
  const [action, setAction] = useState<Action>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<MentorActionResponse | null>(null);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTraitCount = soul.traits.filter((t) => t.status === "active").length;
  const isReady = activeTraitCount >= soul.traitLimit;
  const busy = phase === "loading";

  const reset = () => {
    setAction(null);
    setPhase("idle");
    setResult(null);
    setLevelUpInfo(null);
    setError(null);
  };

  const handleReview = async () => {
    setError(null);
    setAction("review");
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

  const handleRefineSubmit = async (feedback: string) => {
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

  const handleLevelUpConfirm = async () => {
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
        setLevelUpInfo(newEntry ?? null);
      }
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Level-up failed.");
      setPhase("idle");
      setAction(null);
    }
  };

  const loadingText =
    action === "review"
      ? "The Mentor is reviewing this soul..."
      : action === "refine"
        ? "The Mentor is refining this soul..."
        : "The soul is leveling up...";

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
              title="Review"
              description="Review the soul's current state and growth potential"
              buttonLabel="Review"
              disabled={!soul.mentorAvailable || busy}
              active={action === "review"}
              onClick={handleReview}
            />
          </div>
          <div class="col-md-4">
            <MentorActionCard
              title="Refine"
              description="Refine this soul based on your feedback"
              buttonLabel="Refine"
              disabled={!soul.mentorAvailable || busy}
              active={action === "refine"}
              onClick={() => {
                setError(null);
                setAction("refine");
                setPhase("input");
                setResult(null);
              }}
            />
          </div>
          <div class="col-md-4">
            <MentorActionCard
              title="Level Up"
              description="Advance to the next level"
              buttonLabel={isReady ? "Level Up Now" : "Level Up"}
              disabled={!soul.mentorAvailable || busy || !isReady}
              active={action === "levelUp"}
              variant={isReady && soul.mentorAvailable ? "ready" : "default"}
              statusText={`${activeTraitCount}/${soul.traitLimit}`}
              onClick={() => {
                setError(null);
                setAction("levelUp");
                setPhase("confirm");
                setResult(null);
              }}
            />
          </div>
        </div>

        {phase === "input" && action === "refine" && (
          <MentorRefineInput onSubmit={handleRefineSubmit} onCancel={reset} disabled={busy} />
        )}

        {phase === "confirm" && action === "levelUp" && (
          <MentorLevelUpConfirm
            soulName={soul.name}
            onConfirm={handleLevelUpConfirm}
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
          (action === "levelUp" && levelUpInfo ? (
            <MentorLevelUpResult
              content={result.content}
              succeeded={result.succeeded}
              cost={result.cost}
              level={levelUpInfo}
              newLevel={levelUpInfo.level}
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
