import type { MemoryStrength } from "../../shared/memory_types.ts";

const STRENGTH_COLORS: Record<MemoryStrength, string> = {
  strong: "text-success",
  fading: "text-warning",
  faint: "text-body-tertiary",
};

const STRENGTH_LABELS: Record<MemoryStrength, string> = {
  strong: "Strong belief",
  fading: "Fading belief",
  faint: "Faint belief",
};

interface MemoryStrengthDotProps {
  strength: MemoryStrength;
}

export function MemoryStrengthDot({ strength }: MemoryStrengthDotProps) {
  return (
    <span class={STRENGTH_COLORS[strength]} title={STRENGTH_LABELS[strength]}>
      &#9679;
    </span>
  );
}
