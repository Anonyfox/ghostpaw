import type { QuestLogInfo } from "../../shared/quest_types.ts";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  status: string;
  onStatusChange: (s: string) => void;
  priority: string;
  onPriorityChange: (p: string) => void;
  logFilter: string;
  onLogFilterChange: (id: string) => void;
  logs: QuestLogInfo[];
  onAdd: () => void;
}

export function QuestToolbar({
  query, onQueryChange, onSearch,
  status, onStatusChange,
  priority, onPriorityChange,
  logFilter, onLogFilterChange,
  logs, onAdd,
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
        <option value="pending">Pending</option>
        <option value="active">Active</option>
        <option value="blocked">Blocked</option>
        <option value="done">Done</option>
        <option value="failed">Failed</option>
        <option value="cancelled">Cancelled</option>
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

      {logs.length > 0 && (
        <select
          class="form-select form-select-sm"
          style="max-width: 160px;"
          value={logFilter}
          onChange={(e) => onLogFilterChange((e.target as HTMLSelectElement).value)}
        >
          <option value="">All quest logs</option>
          {logs.map((l) => (
            <option key={l.id} value={String(l.id)}>{l.title}</option>
          ))}
        </select>
      )}

      <button type="button" class="btn btn-sm btn-info ms-auto" onClick={onAdd}>
        + New Quest
      </button>
    </div>
  );
}
