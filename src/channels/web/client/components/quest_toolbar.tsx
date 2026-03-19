import type { StorylineInfo } from "../../shared/quest_types.ts";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  status: string;
  onStatusChange: (s: string) => void;
  priority: string;
  onPriorityChange: (p: string) => void;
  storylineFilter: string;
  onStorylineFilterChange: (id: string) => void;
  storylines: StorylineInfo[];
  onAdd: () => void;
}

export function QuestToolbar({
  query,
  onQueryChange,
  onSearch,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  storylineFilter,
  onStorylineFilterChange,
  storylines,
  onAdd,
}: Props) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") onSearch();
  };

  return (
    <div class="d-flex flex-wrap gap-2 mb-3 align-items-center">
      <div class="input-group input-group-sm" style="max-width: 260px;">
        <input
          type="text"
          class="form-control"
          placeholder="Search quests..."
          value={query}
          onInput={(e) => onQueryChange((e.target as HTMLInputElement).value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" class="btn btn-outline-info" onClick={onSearch}>
          Search
        </button>
      </div>

      <select
        class="form-select form-select-sm"
        style="max-width: 140px;"
        value={status}
        onChange={(e) => onStatusChange((e.target as HTMLSelectElement).value)}
      >
        <option value="">Active statuses</option>
        <option value="offered">Offered</option>
        <option value="accepted">Accepted</option>
        <option value="active">Active</option>
        <option value="blocked">Blocked</option>
        <option value="done">Done</option>
        <option value="failed">Failed</option>
        <option value="abandoned">Abandoned</option>
        <option value="__all">All (incl. done)</option>
      </select>

      <select
        class="form-select form-select-sm"
        style="max-width: 130px;"
        value={priority}
        onChange={(e) => onPriorityChange((e.target as HTMLSelectElement).value)}
      >
        <option value="">All priorities</option>
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>

      {storylines.length > 0 && (
        <select
          class="form-select form-select-sm"
          style="max-width: 160px;"
          value={storylineFilter}
          onChange={(e) => onStorylineFilterChange((e.target as HTMLSelectElement).value)}
        >
          <option value="">All storylines</option>
          {storylines.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.title}
            </option>
          ))}
        </select>
      )}

      <button type="button" class="btn btn-sm btn-info ms-auto" onClick={onAdd}>
        + New Quest
      </button>
    </div>
  );
}
