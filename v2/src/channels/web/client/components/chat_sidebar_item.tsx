import { useCallback, useState } from "preact/hooks";
import type { ChatSessionSummary } from "../../shared/chat_session_summary.ts";
import { apiPatch } from "../api_patch.ts";
import { relativeTime } from "../relative_time.ts";

interface ChatSidebarItemProps {
  session: ChatSessionSummary;
  active: boolean;
  onSelect: (id: number) => void;
  onRenamed: (id: number, name: string) => void;
}

export function ChatSidebarItem({ session, active, onSelect, onRenamed }: ChatSidebarItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [hovered, setHovered] = useState(false);

  const startEdit = useCallback(
    (e: Event) => {
      e.stopPropagation();
      setEditValue(session.displayName);
      setEditing(true);
    },
    [session.displayName],
  );

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const saveEdit = useCallback(async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.displayName) {
      await apiPatch(`/api/chat/${session.sessionId}`, { displayName: trimmed });
      onRenamed(session.sessionId, trimmed);
    }
    setEditing(false);
  }, [editValue, session.sessionId, session.displayName, onRenamed]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") saveEdit();
      if (e.key === "Escape") cancelEdit();
    },
    [saveEdit, cancelEdit],
  );

  return (
    <button
      type="button"
      class={`d-block w-100 text-start border-0 px-3 py-2 border-bottom text-body ${active ? "bg-body-tertiary fw-semibold" : "bg-body-secondary"}`}
      style="cursor: pointer;"
      onClick={() => onSelect(session.sessionId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <input
          class="form-control form-control-sm"
          value={editValue}
          onInput={(e) => setEditValue((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
          onBlur={cancelEdit}
          // biome-ignore lint/a11y/noAutofocus: inline rename requires focus
          autoFocus
        />
      ) : (
        <div class="d-flex align-items-center justify-content-between">
          <div class="text-truncate me-2" style="max-width: 180px;" title={session.displayName}>
            {session.displayName}
          </div>
          <button
            type="button"
            class="btn btn-sm btn-link p-0 text-muted edit-btn"
            style={`opacity: ${hovered ? "1" : "0"}; transition: opacity 0.15s;`}
            onClick={startEdit}
            title="Rename"
          >
            &#9998;
          </button>
        </div>
      )}
      <div class="d-flex align-items-center mt-1" style="font-size: 0.75rem;">
        <span class="text-muted me-2">{relativeTime(session.lastActiveAt)}</span>
        <span class="text-body-tertiary">{session.channel}</span>
      </div>
    </button>
  );
}
