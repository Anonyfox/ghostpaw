import type { MemoryStrength } from "../../shared/memory_types.ts";

const BAR_COLORS: Record<MemoryStrength, string> = {
  strong: "bg-success",
  fading: "bg-warning",
  faint: "bg-secondary",
};

interface MemoryConfidenceBarProps {
  confidence: number;
  strength: MemoryStrength;
}

export function MemoryConfidenceBar({ confidence, strength }: MemoryConfidenceBarProps) {
  const pct = Math.round(confidence * 100);
  return (
    <div class="progress" style="height: 4px;" title={`Confidence: ${pct}%`}>
      <div
        class={`progress-bar ${BAR_COLORS[strength]}`}
        role="progressbar"
        style={`width: ${pct}%`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
