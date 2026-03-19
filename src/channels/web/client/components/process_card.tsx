import { useCallback, useEffect, useState } from "preact/hooks";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";

interface SupervisorStatus {
  version: string;
  uptime: string;
  uptimeMs: number;
  supervisor: { pid: number | null; crashes: number | null };
  service: { initSystem: string; installed: boolean; running: boolean };
  disk: { totalFormatted: string; freeFormatted: string };
  dbSizeFormatted: string;
}

type CardState = "idle" | "restarting" | "stopping" | "error";

export function ProcessCard() {
  const [data, setData] = useState<SupervisorStatus | null>(null);
  const [state, setState] = useState<CardState>("idle");
  const [msg, setMsg] = useState("");

  const fetchStatus = useCallback(() => {
    apiGet<SupervisorStatus>("/api/supervisor/status")
      .then((d) => {
        setData(d);
        if (state === "restarting") setState("idle");
      })
      .catch(() => {});
  }, [state]);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (state !== "restarting") return;
    const timer = setInterval(fetchStatus, 3000);
    return () => clearInterval(timer);
  }, [state, fetchStatus]);

  const handleRestart = useCallback(async () => {
    if (!window.confirm("Restart ghostpaw?")) return;
    setState("restarting");
    setMsg("");
    try {
      await apiPost("/api/supervisor/restart");
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setState("error");
      setMsg(m);
    }
  }, []);

  const handleStop = useCallback(async () => {
    if (!window.confirm("Stop ghostpaw? The process will shut down.")) return;
    if (!window.confirm("Are you sure? This will make ghostpaw unreachable.")) return;
    setState("stopping");
    setMsg("");
    try {
      await apiPost("/api/supervisor/stop", { confirm: true });
      setMsg("Stop signal sent.");
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setState("error");
      setMsg(m);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    try {
      await apiPost("/api/supervisor/install");
      fetchStatus();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }, [fetchStatus]);

  const handleUninstall = useCallback(async () => {
    if (!window.confirm("Remove the system service?")) return;
    try {
      await apiPost("/api/supervisor/uninstall");
      fetchStatus();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }, [fetchStatus]);

  if (!data) return null;

  const svcLabel = data.service.installed
    ? `${data.service.initSystem} (installed)`
    : `${data.service.initSystem} (not installed)`;

  return (
    <div class="col-12">
      <div class="card border">
        <div class="card-body">
          <h6 class="card-subtitle text-body-secondary mb-3">Process</h6>
          <div class="row g-2 mb-3">
            <div class="col-sm-6 col-md-3">
              <small class="text-body-secondary d-block">Version</small>
              <span>{data.version}</span>
            </div>
            <div class="col-sm-6 col-md-3">
              <small class="text-body-secondary d-block">Uptime</small>
              <span>{data.uptime}</span>
            </div>
            <div class="col-sm-6 col-md-3">
              <small class="text-body-secondary d-block">Service</small>
              <span>{svcLabel}</span>
            </div>
            <div class="col-sm-6 col-md-3">
              <small class="text-body-secondary d-block">Disk</small>
              <span>{data.disk.freeFormatted} free</span>
              <small class="text-body-secondary ms-1">(DB: {data.dbSizeFormatted})</small>
            </div>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <button
              type="button"
              class="btn btn-sm btn-outline-warning"
              onClick={handleRestart}
              disabled={state === "restarting" || state === "stopping"}
            >
              {state === "restarting" ? (
                <>
                  <span class="spinner-border spinner-border-sm me-1" />
                  Restarting...
                </>
              ) : (
                "Restart"
              )}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              onClick={handleStop}
              disabled={state === "restarting" || state === "stopping"}
            >
              Stop
            </button>
            {data.service.installed ? (
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                onClick={handleUninstall}
              >
                Uninstall Service
              </button>
            ) : (
              <button type="button" class="btn btn-sm btn-outline-info" onClick={handleInstall}>
                Install as Service
              </button>
            )}
          </div>
          {msg && (
            <small class={`mt-2 d-block ${state === "error" ? "text-danger" : "text-muted"}`}>
              {msg}
            </small>
          )}
        </div>
      </div>
    </div>
  );
}
