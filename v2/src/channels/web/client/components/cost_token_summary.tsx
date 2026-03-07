import type { CostSummary } from "../../shared/cost_types.ts";

interface Props {
  today: CostSummary;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span class="me-4">
      <span class="text-body-secondary small">{label}</span>{" "}
      <span class="fw-semibold">{value}</span>
    </span>
  );
}

export function CostTokenSummary({ today }: Props) {
  const total = today.tokensIn + today.tokensOut;

  return (
    <div class="mb-4 d-flex flex-wrap align-items-center">
      <Stat label="Total tokens" value={fmt(total)} />
      <Stat label="Input" value={fmt(today.tokensIn)} />
      <Stat label="Output" value={fmt(today.tokensOut)} />
      {today.reasoningTokens > 0 && <Stat label="Reasoning" value={fmt(today.reasoningTokens)} />}
      {today.cachedTokens > 0 && <Stat label="Cached" value={fmt(today.cachedTokens)} />}
      <Stat label="Sessions" value={String(today.sessionCount)} />
    </div>
  );
}
