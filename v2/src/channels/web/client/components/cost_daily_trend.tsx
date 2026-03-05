import type { CostsDailyEntry } from "../../shared/cost_types.ts";

interface Props {
  daily: CostsDailyEntry[];
}

function formatUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n >= 0.01) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDate(iso: string, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Yesterday";
  const parts = iso.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[Number.parseInt(parts[1], 10) - 1] ?? parts[1];
  return `${month} ${Number.parseInt(parts[2], 10)}`;
}

export function CostDailyTrend({ daily }: Props) {
  if (daily.length === 0) return null;

  return (
    <div class="mb-4">
      <h6 class="text-body-secondary mb-2">Daily Trend</h6>
      <div class="table-responsive">
        <table class="table table-sm table-borderless mb-0">
          <thead>
            <tr>
              <th class="text-body-secondary fw-normal">Date</th>
              <th class="text-body-secondary fw-normal text-end">Cost</th>
              <th class="text-body-secondary fw-normal text-end">Tokens</th>
              <th class="text-body-secondary fw-normal text-end">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d, i) => (
              <tr key={d.date} class={d.costUsd === 0 ? "text-body-tertiary" : ""}>
                <td>{formatDate(d.date, i)}</td>
                <td class="text-end">{formatUsd(d.costUsd)}</td>
                <td class="text-end">{fmtTokens(d.tokens)}</td>
                <td class="text-end">{d.sessionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
