import { useState } from "preact/hooks";
import { ConfigPanel } from "../components/config_panel.tsx";
import { ModelSelector } from "../components/model_selector.tsx";
import { SecretsPanel } from "../components/secrets_panel.tsx";

type Tab = "secrets" | "config";

const TABS: { id: Tab; label: string }[] = [
  { id: "secrets", label: "API Keys" },
  { id: "config", label: "Configuration" },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("secrets");

  return (
    <div>
      <h2 class="mb-4">Settings</h2>
      <ModelSelector />
      <ul class="nav nav-tabs mb-4">
        {TABS.map((tab) => (
          <li key={tab.id} class="nav-item">
            <button
              type="button"
              class={`nav-link${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
      {activeTab === "secrets" && <SecretsPanel />}
      {activeTab === "config" && <ConfigPanel />}
    </div>
  );
}
