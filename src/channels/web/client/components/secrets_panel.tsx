import { useCallback, useEffect, useState } from "preact/hooks";
import { apiGet } from "../api_get.ts";
import { AddSecretForm } from "./add_secret_form.tsx";
import type { SecretInfo } from "./secret_info.ts";
import { SecretRow } from "./secret_row.tsx";

export function SecretsPanel() {
  const [secrets, setSecrets] = useState<SecretInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSecrets = useCallback(() => {
    apiGet<{ secrets: SecretInfo[] }>("/api/secrets")
      .then((data) => {
        setSecrets(data.secrets);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  const renderSection = (title: string, category: string) => {
    const items = secrets.filter((s) => s.category === category);
    if (items.length === 0) return null;
    return (
      <section class="mb-4">
        <h5 class="mb-3">{title}</h5>
        <div class="list-group">
          {items.map((s) => (
            <SecretRow key={s.key} secret={s} onChanged={fetchSecrets} />
          ))}
        </div>
      </section>
    );
  };

  if (loading) return <p class="text-muted">Loading...</p>;
  if (error) return <div class="alert alert-danger">{error}</div>;

  return (
    <div>
      {renderSection("LLM Providers", "llm")}
      {renderSection("Search Providers", "search")}
      {(() => {
        const custom = secrets.filter((s) => s.category === "custom");
        return (
          <section class="mb-4">
            <h5 class="mb-3">Custom Secrets</h5>
            {custom.length > 0 && (
              <div class="list-group mb-3">
                {custom.map((s) => (
                  <SecretRow key={s.key} secret={s} onChanged={fetchSecrets} />
                ))}
              </div>
            )}
            <AddSecretForm onAdded={fetchSecrets} />
          </section>
        );
      })()}
    </div>
  );
}
