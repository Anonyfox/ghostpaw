import { useEffect, useState } from "preact/hooks";

interface EnvCheck {
  name: string;
  command: string;
  found: boolean;
  version: string | null;
  hint: string | null;
}

interface SetupEnvCheckProps {
  onNext: () => void;
  onBack: () => void;
}

export function SetupEnvCheck({ onNext, onBack }: SetupEnvCheckProps) {
  const [checks, setChecks] = useState<EnvCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/setup/env-check")
      .then((r) => r.json())
      .then((data) => {
        setChecks(data.checks ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h4 class="text-info mb-3">Environment Check</h4>
      <p class="text-muted mb-4">
        Optional — Ghostpaw works best when common dev tools are available.
      </p>

      {loading ? (
        <p class="text-muted">Checking...</p>
      ) : (
        <ul class="list-group mb-4">
          {checks.map((c) => (
            <li class="list-group-item d-flex justify-content-between align-items-start" key={c.name}>
              <div>
                <strong>{c.name}</strong>
                {c.found && c.version && (
                  <span class="text-muted ms-2 small">{c.version}</span>
                )}
                {!c.found && c.hint && (
                  <div class="text-muted small mt-1">
                    <code>{c.hint}</code>
                  </div>
                )}
              </div>
              <span class={`badge ${c.found ? "bg-success" : "bg-secondary"}`}>
                {c.found ? "Found" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" class="btn btn-primary" onClick={onNext}>
          {loading ? "Skip" : "Continue"}
        </button>
      </div>
    </div>
  );
}
