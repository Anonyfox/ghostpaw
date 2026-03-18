import { useCallback, useState } from "preact/hooks";
import { useRoute } from "wouter-preact";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import { ChatInput } from "../components/chat_input.tsx";
import { ChatSidebar } from "../components/chat_sidebar.tsx";
import { MessageList } from "../components/message_list.tsx";
import { TrailBanner } from "../components/trail_banner.tsx";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessageInfo | null>(null);

  const handleReply = useCallback((msg: ChatMessageInfo) => {
    setReplyToMessage(msg);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  const handleTitleGenerated = useCallback((sessionId: number, title: string) => {
    setUpdatedTitle({ sessionId, title });
  }, []);

  const handleSessionCreated = useCallback((sessionId: number) => {
    setActiveSessionId(sessionId);
  }, []);

  const {
    messages,
    streamingContent,
    waiting,
    toolActivity,
    loading,
    error,
    totalTokens,
    model,
    session,
    sendMessage,
  } = useChatSession({
    sessionId: activeSessionId,
    onTitleGenerated: handleTitleGenerated,
    onSessionCreated: handleSessionCreated,
  });

  const busy = waiting || streamingContent.length > 0 || toolActivity !== null;

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setSidebarOpen(false);
  }, []);

  const handleSelectSession = useCallback((id: number) => {
    setActiveSessionId(id);
    setSidebarOpen(false);
  }, []);

  return (
    <div class="d-flex flex-column h-100 position-relative">
      {sidebarOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss
        <div class="offcanvas-backdrop fade show" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        class={`offcanvas offcanvas-start bg-body-secondary ${sidebarOpen ? "show" : ""}`}
        style={sidebarOpen ? "visibility: visible;" : ""}
      >
        <div class="offcanvas-header border-bottom py-2">
          <h6 class="offcanvas-title mb-0">Chats</h6>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
        <div class="offcanvas-body p-0">
          <ChatSidebar
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            updatedTitle={updatedTitle}
          />
        </div>
      </div>

      {loading ? (
        <div class="d-flex align-items-center justify-content-center h-100">
          <div class="spinner-border text-primary" />
        </div>
      ) : (
        <>
          <div class="border-bottom px-3 py-2 d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                aria-label="Open chat list"
                onClick={() => setSidebarOpen(true)}
              >
                &#9776;
              </button>
              <span class="fw-semibold text-truncate" style="max-width: 300px;">
                {session?.displayName ?? "New Chat"}
              </span>
            </div>
            <div class="d-flex align-items-center gap-3">
              <span class="text-muted small">{model}</span>
              {totalTokens > 0 && (
                <span class="text-muted small">{totalTokens.toLocaleString()} tokens</span>
              )}
            </div>
          </div>

          <TrailBanner />

          {error && <div class="alert alert-danger m-3 mb-0 py-1 px-2 small">{error}</div>}

          <MessageList
            messages={messages}
            streamingContent={streamingContent}
            waiting={waiting}
            toolActivity={toolActivity}
            onReply={handleReply}
          />
          <ChatInput
            onSend={sendMessage}
            disabled={busy}
            defaultModel={model || "claude-sonnet-4-6"}
            replyTo={replyToMessage}
            onCancelReply={handleCancelReply}
          />
        </>
      )}
    </div>
  );
}
