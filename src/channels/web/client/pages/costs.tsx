import { useEffect, useState } from "preact/hooks";
import type { CostsResponse } from "../../shared/cost_types.ts";
import { CostBreakdownTable } from "../components/cost_breakdown_table.tsx";
import { CostDailyTrend } from "../components/cost_daily_trend.tsx";
import { CostSpendGauge } from "../components/cost_spend_gauge.tsx";
import { CostTokenSummary } from "../components/cost_token_summary.tsx";

const PURPOSE_LABELS: Record<string, string> = {
  chat: "Chat",
  delegate: "Delegation",
  train: "Training",
  scout: "Scouting",
  refine: "Refinement",
  system: "System",
};

function fmtUsd(v: unknown): string {
  const n = typeof v === "number" ? v : 0;
  if (n === 0) return "$0.00";
  if (n >= 0.01) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtTokens(v: unknown): string {
  const n = typeof v === "number" ? v : 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtStr(v: unknown): string {
  return String(v ?? "");
}

function fmtPurpose(v: unknown): string {
  const s = String(v ?? "");
  return PURPOSE_LABELS[s] ?? s;
}

export function CostsPage() {
  const [data, setData] = useState<CostsResponse | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/costs")
      .then((r) => r.json())
      .then((d) => setData(d as CostsResponse))
      .catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
  }, []);

  const handleLimitChange = async (value: number) => {
    try {
      await fetch("/api/costs/limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCostPerDay: value }),
      });
      load();
    } catch (e) {
      setError(String(e));
    }
  };

  if (error) {
    return <p class="text-danger">{error}</p>;
  }

  if (!data) {
    return <p class="text-body-secondary">Loading costs...</p>;
  }

  const modelColumns = [
    { key: "model", label: "Model", format: fmtStr },
    { key: "costUsd", label: "Cost", align: "end" as const, format: fmtUsd },
    { key: "tokens", label: "Tokens", align: "end" as const, format: fmtTokens },
    { key: "calls", label: "Calls", align: "end" as const, format: fmtStr },
  ];

  const soulColumns = [
    { key: "soul", label: "Soul", format: fmtStr },
    { key: "costUsd", label: "Cost", align: "end" as const, format: fmtUsd },
    { key: "runs", label: "Runs", align: "end" as const, format: fmtStr },
    { key: "avgCostUsd", label: "Avg Cost", align: "end" as const, format: fmtUsd },
  ];

  const purposeColumns = [
    { key: "purpose", label: "Purpose", format: fmtPurpose },
    { key: "costUsd", label: "Cost", align: "end" as const, format: fmtUsd },
    { key: "sessionCount", label: "Sessions", align: "end" as const, format: fmtStr },
  ];

  return (
    <div style="max-width: 800px;">
      <h4 class="mb-4">Costs</h4>

      <CostSpendGauge today={data.today} limit={data.limit} onLimitChange={handleLimitChange} />
      <CostTokenSummary today={data.today} />

      <div class="row">
        <div class="col-12 col-md-6">
          <CostBreakdownTable title="By Model" columns={modelColumns} rows={data.byModel} />
        </div>
        <div class="col-12 col-md-6">
          <CostBreakdownTable title="By Soul" columns={soulColumns} rows={data.bySoul} />
        </div>
      </div>

      <CostBreakdownTable title="By Purpose" columns={purposeColumns} rows={data.byPurpose} />
      <CostDailyTrend daily={data.daily} />
    </div>
  );
}
