import type { MemoryInfo, MemorySearchResult } from "../../shared/memory_types.ts";
import { relativeTime } from "../relative_time.ts";
import { MemoryConfidenceBar } from "./memory_confidence_bar.tsx";
import { MemoryStrengthDot } from "./memory_strength_dot.tsx";

const CATEGORY_BADGE: Record<string, string> = {
  fact: "bg-info",
  preference: "bg-success",
  procedure: "bg-warning text-dark",
  capability: "bg-secondary",
  custom: "border border-secondary text-body-secondary",
};

const SOURCE_LABELS: Record<string, string> = {
  explicit: "explicit",
  observed: "observed",
  distilled: "distilled",
  inferred: "inferred",
};

interface MemoryRowProps {
  memory: MemoryInfo;
  isExpanded: boolean;
  onToggle: (id: number) => void;
  onConfirm: (id: number) => void;
  onForget: (id: number) => void;
  selectMode: boolean;
  selected: boolean;
  onSelect: (id: number) => void;
  isSearchResult?: boolean;
}

export function MemoryRow({
  memory,
  isExpanded,
  onToggle,
  onConfirm,
  onForget,
  selectMode,
  selected,
  onSelect,
  isSearchResult,
}: MemoryRowProps) {
  const m = memory;
  const searchMem = isSearchResult ? (m as MemorySearchResult) : null;

  const handleClick = () => {
    if (selectMode) {
      onSelect(m.id);
    } else {
      onToggle(m.id);
    }
  };

  const handleConfirm = (e: Event) => {
    e.stopPropagation();
    onConfirm(m.id);
  };

  const handleForget = (e: Event) => {
    e.stopPropagation();
    onForget(m.id);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: row contains nested interactive elements
    <div
      role="button"
      tabIndex={0}
      class={`border-bottom py-2 px-2 ${isExpanded ? "bg-body-tertiary" : ""} ${selected ? "bg-info bg-opacity-10" : ""}`}
      style="cursor: pointer;"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div class="d-flex align-items-start gap-2">
        {selectMode && (
          <input
            type="checkbox"
            class="form-check-input mt-1"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onSelect(m.id)}
          />
        )}

        <span class="mt-1">
          <MemoryStrengthDot strength={m.strength} />
        </span>

        <div class="flex-grow-1 min-width-0">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <span class="text-body" style="line-height: 1.4;">
              {m.claim.length > 160 ? `${m.claim.slice(0, 160)}...` : m.claim}
            </span>
            <div class="d-flex gap-1 flex-shrink-0">
              <span class={`badge ${CATEGORY_BADGE[m.category] ?? CATEGORY_BADGE.custom} small`}>
                {m.category}
              </span>
              <span class="text-body-tertiary small">{SOURCE_LABELS[m.source]}</span>
            </div>
          </div>

          <div class="d-flex align-items-center gap-3 mt-1">
            <div style="width: 120px;">
              <MemoryConfidenceBar confidence={m.confidence} strength={m.strength} />
            </div>
            <span class="text-body-tertiary small">{m.evidenceCount}x confirmed</span>
            <span class="text-body-tertiary small">{relativeTime(m.verifiedAt)}</span>
            {searchMem && (
              <span class="text-info small">{Math.round(searchMem.similarity * 100)}% match</span>
            )}
            {!selectMode && (
              <div class="ms-auto d-flex gap-1">
                <button
                  type="button"
                  class="btn btn-outline-info btn-sm py-0 px-2"
                  onClick={handleConfirm}
                  title="Confirm this memory — bumps confidence and resets freshness"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm py-0 px-2"
                  onClick={handleForget}
                  title="Forget this memory — excluded from future recall but preserved in history"
                >
                  Forget
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
