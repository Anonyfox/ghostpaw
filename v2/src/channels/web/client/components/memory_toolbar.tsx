import { useCallback, useRef } from "preact/hooks";

export type MemorySortOption =
  | "newest"
  | "oldest"
  | "confidence_desc"
  | "confidence_asc"
  | "evidence"
  | "stalest";

interface MemoryToolbarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  category: string;
  onCategoryChange: (cat: string) => void;
  strength: string;
  onStrengthChange: (s: string) => void;
  sort: MemorySortOption;
  onSortChange: (s: MemorySortOption) => void;
  selectMode: boolean;
  onToggleSelect: () => void;
  selectedCount: number;
  onMerge: () => void;
  onAdd: () => void;
}

export function MemoryToolbar({
  searchQuery,
  onSearch,
  category,
  onCategoryChange,
  strength,
  onStrengthChange,
  sort,
  onSortChange,
  selectMode,
  onToggleSelect,
  selectedCount,
  onMerge,
  onAdd,
}: MemoryToolbarProps) {
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = useCallback(
    (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => onSearch(value), 300);
    },
    [onSearch],
  );

  return (
    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
      <input
        type="search"
        class="form-control form-control-sm"
        style="max-width: 260px;"
        placeholder="Search memories..."
        value={searchQuery}
        onInput={handleSearchInput}
      />

      <select
        class="form-select form-select-sm"
        style="max-width: 140px;"
        value={category}
        onChange={(e) => onCategoryChange((e.target as HTMLSelectElement).value)}
      >
        <option value="">All categories</option>
        <option value="preference">Preference</option>
        <option value="fact">Fact</option>
        <option value="procedure">Procedure</option>
        <option value="capability">Capability</option>
        <option value="custom">Custom</option>
      </select>

      <select
        class="form-select form-select-sm"
        style="max-width: 120px;"
        value={strength}
        onChange={(e) => onStrengthChange((e.target as HTMLSelectElement).value)}
      >
        <option value="">All strengths</option>
        <option value="strong">Strong</option>
        <option value="fading">Fading</option>
        <option value="faint">Faint</option>
      </select>

      <select
        class="form-select form-select-sm"
        style="max-width: 150px;"
        value={sort}
        onChange={(e) => onSortChange((e.target as HTMLSelectElement).value as MemorySortOption)}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="confidence_desc">Most confident</option>
        <option value="confidence_asc">Least confident</option>
        <option value="evidence">Most evidence</option>
        <option value="stalest">Stalest</option>
      </select>

      <div class="ms-auto d-flex gap-2">
        <button
          type="button"
          class={`btn btn-sm ${selectMode ? "btn-info" : "btn-outline-secondary"}`}
          onClick={onToggleSelect}
          title="Select memories to merge"
        >
          Select
        </button>
        {selectMode && selectedCount >= 2 && (
          <button type="button" class="btn btn-sm btn-outline-info" onClick={onMerge}>
            Merge {selectedCount}
          </button>
        )}
        <button type="button" class="btn btn-sm btn-outline-info" onClick={onAdd}>
          + Add
        </button>
      </div>
    </div>
  );
}
