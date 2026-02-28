import { useCallback, useState } from "preact/hooks";
import { useRoute } from "wouter-preact";
import { ChatInput } from "../components/chat_input.tsx";
import { ChatSidebar } from "../components/chat_sidebar.tsx";
import { MessageList } from "../components/message_list.tsx";
import { useChatSession } from "../components/use_chat_session.ts";

export function ChatPage() {
  const [, routeParams] = useRoute("/chat/:id");
  const routeId = routeParams?.id ? Number(routeParams.id) : null;

  const [activeSessionId, setActiveSessionId] = useState<number | null>(
    routeId && Number.isFinite(routeId) ? routeId : null,
  );
  const [updatedTitle, setUpdatedTitle] = useState<{
    sessionId: number;
    title: string;
  } | null>(null);

  const handleTitleGenerated = useCallback((sessionId: number, title: string) => {
    setUpdatedTitle({ sessionId, title });
  }, []);

  const handleSessionCreated = useCallback((sessionId: number) => {
    setActiveSessionId(sessionId);
  }, []);

  const { messages, streamingContent, loading, error, totalTokens, model, session, sendMessage } =
    useChatSession({
      sessionId: activeSessionId,
      onTitleGenerated: handleTitleGenerated,
      onSessionCreated: handleSessionCreated,
    });

  const streaming = streamingContent.length > 0;

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  const handleSelectSession = useCallback((id: number) => {
    setActiveSessionId(id);
  }, []);

  return (
    <div class="d-flex h-100">
      <ChatSidebar
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        updatedTitle={updatedTitle}
      />
      <div class="d-flex flex-column flex-grow-1 h-100" style="min-width: 0;">
        {loading ? (
          <div class="d-flex align-items-center justify-content-center h-100">
            <div class="spinner-border text-primary" />
          </div>
        ) : (
          <>
            <div class="border-bottom px-3 py-2 d-flex align-items-center justify-content-between">
              <span class="fw-semibold text-truncate" style="max-width: 50%;">
                {session?.displayName ?? "New Chat"}
              </span>
              <div class="d-flex align-items-center gap-3">
                <span class="text-muted small">{model}</span>
                {totalTokens > 0 && (
                  <span class="text-muted small">{totalTokens.toLocaleString()} tokens</span>
                )}
              </div>
            </div>

            {error && <div class="alert alert-danger m-3 mb-0 py-1 px-2 small">{error}</div>}

            <MessageList messages={messages} streamingContent={streamingContent} />
            <ChatInput
              onSend={sendMessage}
              disabled={streaming}
              defaultModel={model || "claude-sonnet-4-6"}
            />
          </>
        )}
      </div>
    </div>
  );
}
