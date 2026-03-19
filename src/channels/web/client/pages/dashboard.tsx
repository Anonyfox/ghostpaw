import { useCallback, useEffect, useState } from "preact/hooks";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import { ProcessCard } from "../components/process_card.tsx";

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

function HauntButton() {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    apiGet<{ running: boolean }>("/api/haunt/status")
      .then((d) => {
        if (d.running) setState("running");
      })
      .catch(() => {});
  }, []);

  const trigger = useCallback(async () => {
    setState("running");
    setMsg("");
    try {
      await apiPost<{ ok: boolean }>("/api/haunt");
      setState("done");
      setMsg("Haunt triggered — running in background.");
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      if (m.includes("already running")) {
        setState("running");
        setMsg("A haunt is already in progress.");
      } else {
        setState("error");
        setMsg(m);
      }
    }
  }, []);

  return (
    <div class="card border h-100">
      <div class="card-body d-flex flex-column justify-content-between">
        <h6 class="card-subtitle text-body-secondary mb-2">Haunt</h6>
        <button
          type="button"
          class={`btn btn-sm ${state === "running" ? "btn-outline-secondary" : "btn-outline-info"}`}
          onClick={trigger}
          disabled={state === "running"}
        >
          {state === "running" ? (
            <>
              <span class="spinner-border spinner-border-sm me-1" />
              Running...
            </>
          ) : (
            "Trigger Haunt"
          )}
        </button>
        {msg && (
          <small class={`mt-1 ${state === "error" ? "text-danger" : "text-muted"}`}>{msg}</small>
        )}
      </div>
    </div>
  );
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
            <div class="card border">
              <div class="card-body">
                <h6 class="card-subtitle text-body-secondary">Version</h6>
                <p class="card-text fs-4">{stats.version}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card border">
              <div class="card-body">
                <h6 class="card-subtitle text-body-secondary">Uptime</h6>
                <p class="card-text fs-4">{formatUptime(stats.uptimeMs)}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card border">
              <div class="card-body">
                <h6 class="card-subtitle text-body-secondary">Secrets</h6>
                <p class="card-text fs-4">{stats.secretsCount}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <HauntButton />
          </div>
          <ProcessCard />
        </div>
      )}
    </div>
  );
}
