import { useState } from "preact/hooks";
import type { TraitInfo } from "../../shared/soul_types.ts";
import { SoulTraitRow } from "./soul_trait_row.tsx";

interface SoulTraitListProps {
  traits: TraitInfo[];
  soulId: number;
  isArchived: boolean;
  onUpdated: () => void;
}

const TABS = ["all", "active", "consolidated", "promoted", "reverted"] as const;

export function SoulTraitList({ traits, soulId, isArchived, onUpdated }: SoulTraitListProps) {
  const [filter, setFilter] = useState<string>("all");

  const counts: Record<string, number> = { all: traits.length };
  for (const t of traits) counts[t.status] = (counts[t.status] ?? 0) + 1;

  const filtered = filter === "all" ? traits : traits.filter((t) => t.status === filter);

  return (
    <div>
      <ul class="nav nav-tabs mb-3">
        {TABS.map((tab) => (
          <li class="nav-item" key={tab}>
            <button
              type="button"
              class={`nav-link ${filter === tab ? "active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab] ?? 0})
            </button>
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p class="text-muted small">No traits in this category.</p>
      ) : (
        <ul class="list-group">
          {filtered.map((t) => (
            <SoulTraitRow
              key={t.id}
              trait={t}
              soulId={soulId}
              isArchived={isArchived}
              onUpdated={onUpdated}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
