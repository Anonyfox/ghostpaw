import { useState } from "preact/hooks";

const PROVIDER_KEY_MAP: Record<string, string> = {
  anthropic: "API_KEY_ANTHROPIC",
  openai: "API_KEY_OPENAI",
  xai: "API_KEY_XAI",
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  xai: "xAI",
};

interface SetupApiKeyInputProps {
  provider: string;
  onDone: () => void;
  onBack: () => void;
}

export function SetupApiKeyInput({ provider, onDone, onBack }: SetupApiKeyInputProps) {
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  const testKey = async () => {
    setError("");
    setTesting(true);
    try {
      const res = await fetch("/api/setup/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: key.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setVerified(true);
      } else {
        setError(data.error || "Key verification failed.");
      }
    } catch {
      setError("Connection failed.");
    } finally {
      setTesting(false);
    }
  };

  const saveKey = async () => {
    setSaving(true);
    try {
      const secretKey = PROVIDER_KEY_MAP[provider];
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: secretKey, value: key.trim() }),
      });
      if (res.ok) {
        onDone();
      } else {
        setError("Failed to save key.");
      }
    } catch {
      setError("Failed to save key.");
    } finally {
      setSaving(false);
    }
  };

  const label = PROVIDER_LABELS[provider] ?? provider;

  return (
    <div>
      <h4 class="text-info mb-3">{label} API Key</h4>
      <p class="text-muted mb-4">
        Paste your {label} API key below. It stays on this machine — never sent anywhere except the
        provider's own API.
      </p>

      {error && <div class="alert alert-danger">{error}</div>}
      {verified && <div class="alert alert-success">Key verified — {label} is reachable.</div>}

      <div class="mb-3">
        <input
          type="password"
          class="form-control"
          placeholder={`${label} API key`}
          value={key}
          onInput={(e) => {
            setKey((e.target as HTMLInputElement).value);
            setVerified(false);
            setError("");
          }}
        />
      </div>

      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary" onClick={onBack}>
          Back
        </button>
        {!verified ? (
          <button
            type="button"
            class="btn btn-outline-info"
            disabled={!key.trim() || testing}
            onClick={testKey}
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
        ) : (
          <button type="button" class="btn btn-primary" disabled={saving} onClick={saveKey}>
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
