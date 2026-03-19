export interface SessionXPInputs {
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  uniqueToolCount: number;
  durationMs: number;
}

const XP_SCALE = 10;
const MAX_DIVERSITY = 1.5;
const MAX_DURATION = 2.0;
const DURATION_BASE = Math.log(61);

export function computeSessionXP(inputs: SessionXPInputs): number {
  const totalTokens = inputs.tokensIn + inputs.tokensOut + inputs.reasoningTokens;
  if (totalTokens === 0) return 0;

  const tokenBase = Math.log(1 + totalTokens);
  const diversityFactor = Math.min(MAX_DIVERSITY, 0.5 + inputs.uniqueToolCount * 0.1);
  const durationMinutes = inputs.durationMs / 60_000;
  if (durationMinutes <= 0) return 0;
  const durationFactor = Math.min(MAX_DURATION, Math.log(1 + durationMinutes) / DURATION_BASE);

  return Math.round(XP_SCALE * tokenBase * diversityFactor * durationFactor * 100) / 100;
}
