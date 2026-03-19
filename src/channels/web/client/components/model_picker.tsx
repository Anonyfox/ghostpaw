import { useCallback, useEffect, useState } from "preact/hooks";
import type { ModelsResponse } from "../../shared/models_response.ts";
import type { ProviderInfo } from "../../shared/provider_info.ts";
import { apiGet } from "../api_get.ts";

interface ModelPickerProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

function shortModelName(model: string): string {
  const parts = model.split("-");
  return parts.length > 2 ? parts.slice(-2).join("-") : model;
}

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiGet<ModelsResponse>("/api/models")
      .then((resp) => setProviders(resp.providers))
      .catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    if (!disabled) setOpen((o) => !o);
  }, [disabled]);

  const select = useCallback(
    (model: string) => {
      onChange(model);
      setOpen(false);
    },
    [onChange],
  );

  const activeProviders = providers.filter((p) => p.hasKey && p.models.length > 0);

  return (
    <div class="dropdown" style="position: relative;">
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm dropdown-toggle"
        onClick={toggle}
        disabled={disabled}
        title={value}
      >
        {shortModelName(value)}
      </button>
      {open && (
        <div
          class="dropdown-menu show shadow"
          style="position: absolute; bottom: 100%; left: 0; max-height: 300px; overflow-y: auto; min-width: 220px;"
        >
          {activeProviders.map((p) => (
            <div key={p.id}>
              <h6 class="dropdown-header">{p.name}</h6>
              {p.models.map((m) => (
                <button
                  key={m}
                  type="button"
                  class={`dropdown-item ${m === value ? "active" : ""}`}
                  onClick={() => select(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          ))}
          {activeProviders.length === 0 && (
            <span class="dropdown-item-text text-muted">No models available</span>
          )}
        </div>
      )}
    </div>
  );
}
