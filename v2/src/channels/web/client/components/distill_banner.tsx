import { useCallback, useState } from "preact/hooks";
import type { DistillStatusResponse, DistillSweepResponse } from "../../shared/distill_types.ts";
import { apiPost } from "../api_post.ts";

type Phase = "idle" | "distilling" | "result" | "error";

interface DistillBannerProps {
  status: DistillStatusResponse | null;
  onComplete: () => void;
}

export function DistillBanner({ status, onComplete }: DistillBannerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<DistillSweepResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDistill = useCallback(async () => {
    setPhase("distilling");
    setError(null);
    try {
      const res = await apiPost<DistillSweepResponse>("/api/distill");
      setResult(res);
      setPhase("result");
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Distillation failed.");
      setPhase("error");
    }
  }, [onComplete]);

  const handleDismiss = useCallback(() => {
    setPhase("idle");
    setResult(null);
  }, []);

  const handleRetry = useCallback(() => {
    handleDistill();
  }, [handleDistill]);

  if (phase === "idle" && (!status || status.undistilledCount === 0)) {
    return null;
  }

  if (phase === "distilling") {
    return (
      <div class="border border-info rounded px-3 py-2 mb-3">
        <div class="d-flex align-items-center gap-2">
          <div class="spinner-border spinner-border-sm text-info" />
          <span class="text-body small fw-semibold">
            Distilling {status?.undistilledCount ?? ""} session
            {status?.undistilledCount !== 1 ? "s" : ""}...
          </span>
        </div>
        <div class="text-body-tertiary small mt-1">
          Extracting beliefs from recent conversations.
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    const tc = result.totalToolCalls;
    const parts: string[] = [];
    if (tc.remember > 0) parts.push(`Remembered ${tc.remember}`);
    if (tc.revise > 0) parts.push(`Confirmed/Revised ${tc.revise}`);
    if (tc.forget > 0) parts.push(`Forgot ${tc.forget}`);
    const summary = parts.length > 0 ? parts.join(" · ") : "No new beliefs extracted.";

    return (
      <div class="border border-success rounded px-3 py-2 mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <span class="text-success small fw-semibold">
            Distilled {result.sessionsProcessed} session
            {result.sessionsProcessed !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary py-0 px-2"
            onClick={handleDismiss}
          >
            Dismiss
          </button>
        </div>
        <div class="text-body-secondary small mt-1">{summary}</div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div class="border border-danger rounded px-3 py-2 mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <span class="text-danger small fw-semibold">Distillation failed</span>
          <button
            type="button"
            class="btn btn-sm btn-outline-danger py-0 px-2"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
        <div class="text-body-secondary small mt-1">{error}</div>
      </div>
    );
  }

  return (
    <div class="border border-info rounded px-3 py-2 mb-3">
      <div class="d-flex justify-content-between align-items-center">
        <span class="text-body small">
          <strong class="text-info">{status!.undistilledCount}</strong> undistilled session
          {status!.undistilledCount !== 1 ? "s" : ""}
        </span>
        <button type="button" class="btn btn-sm btn-info py-0 px-2" onClick={handleDistill}>
          Distill Now
        </button>
      </div>
      <div class="text-body-tertiary small mt-1">
        Recent conversations not yet processed into memories.
      </div>
    </div>
  );
}
