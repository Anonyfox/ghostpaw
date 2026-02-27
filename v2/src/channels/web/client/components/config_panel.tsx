import { useCallback, useEffect, useState } from "preact/hooks";
import type { ConfigInfo } from "../../shared/config_types.ts";
import { apiGet } from "../api_get.ts";
import { AddConfigForm } from "./add_config_form.tsx";
import { ConfigRow } from "./config_row.tsx";

const HIDDEN_KEYS = new Set(["default_model"]);

const CATEGORY_ORDER = ["model", "cost", "behavior", "custom"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  model: "Model",
  cost: "Cost",
  behavior: "Behavior",
  custom: "Custom",
};

export function ConfigPanel() {
  const [configs, setConfigs] = useState<ConfigInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchConfigs = useCallback(() => {
    apiGet<{ config: ConfigInfo[] }>("/api/config")
      .then((data) => {
        setConfigs(data.config);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  if (loading) return <p class="text-muted">Loading...</p>;
  if (error) return <div class="alert alert-danger">{error}</div>;

  return (
    <div>
      {CATEGORY_ORDER.map((cat) => {
        const items = configs.filter((c) => c.category === cat && !HIDDEN_KEYS.has(c.key));
        if (items.length === 0 && cat !== "custom") return null;
        return (
          <section key={cat} class="mb-4">
            <h5 class="mb-3">{CATEGORY_LABELS[cat] ?? cat}</h5>
            {items.length > 0 && (
              <div class="list-group mb-3">
                {items.map((c) => (
                  <ConfigRow key={c.key} config={c} onChanged={fetchConfigs} />
                ))}
              </div>
            )}
            {cat === "custom" && <AddConfigForm onAdded={fetchConfigs} />}
          </section>
        );
      })}
    </div>
  );
}
