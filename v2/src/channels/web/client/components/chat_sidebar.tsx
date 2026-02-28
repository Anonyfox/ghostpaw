import { useCallback, useEffect, useState } from "preact/hooks";
import type { ChatSessionSummary } from "../../shared/chat_session_summary.ts";
import { apiGet } from "../api_get.ts";
import { ChatSidebarItem } from "./chat_sidebar_item.tsx";

interface ChatSidebarProps {
  activeSessionId: number | null;
  onSelectSession: (id: number) => void;
  onNewChat: () => void;
  updatedTitle: { sessionId: number; title: string } | null;
}

export function ChatSidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
  updatedTitle,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(() => {
    apiGet<ChatSessionSummary[]>("/api/chat")
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (!updatedTitle) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionId === updatedTitle.sessionId ? { ...s, displayName: updatedTitle.title } : s,
      ),
    );
  }, [updatedTitle]);

  const handleRenamed = useCallback((id: number, name: string) => {
    setSessions((prev) => prev.map((s) => (s.sessionId === id ? { ...s, displayName: name } : s)));
  }, []);

  return (
    <div
      class="d-flex flex-column bg-light border-end h-100"
      style="width: 260px; min-width: 260px;"
    >
      <div class="p-3 border-bottom">
        <button type="button" class="btn btn-primary btn-sm w-100" onClick={onNewChat}>
          + New Chat
        </button>
      </div>
      <div class="overflow-auto flex-grow-1">
        {loading && (
          <div class="text-center text-muted py-3" style="font-size: 0.85rem;">
            Loading...
          </div>
        )}
        {!loading && sessions.length === 0 && (
          <div class="text-center text-muted py-3" style="font-size: 0.85rem;">
            No chats yet
          </div>
        )}
        {sessions.map((s) => (
          <ChatSidebarItem
            key={s.sessionId}
            session={s}
            active={s.sessionId === activeSessionId}
            onSelect={onSelectSession}
            onRenamed={handleRenamed}
          />
        ))}
      </div>
    </div>
  );
}
