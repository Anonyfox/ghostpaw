import { useEffect, useState } from "preact/hooks";
import { apiGet } from "../api.ts";

interface DashboardStats {
  version: string;
  uptimeMs: number;
  secretsCount: number;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<DashboardStats>("/api/dashboard")
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 class="mb-4">Dashboard</h2>
      {loading && <p class="text-muted">Loading...</p>}
      {error && <div class="alert alert-danger">{error}</div>}
      {stats && (
        <div class="row g-3">
          <div class="col-md-4">
            <div class="card">
              <div class="card-body">
                <h6 class="card-subtitle text-muted">Version</h6>
                <p class="card-text fs-4">{stats.version}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card">
              <div class="card-body">
                <h6 class="card-subtitle text-muted">Uptime</h6>
                <p class="card-text fs-4">{formatUptime(stats.uptimeMs)}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card">
              <div class="card-body">
                <h6 class="card-subtitle text-muted">Secrets</h6>
                <p class="card-text fs-4">{stats.secretsCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
