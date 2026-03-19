import { useEffect, useRef } from "preact/hooks";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import { MessageBubble } from "./message_bubble.tsx";
import type { ToolActivity } from "./use_chat_session.ts";

interface MessageListProps {
  messages: ChatMessageInfo[];
  streamingContent: string;
  waiting?: boolean;
  toolActivity?: ToolActivity | null;
  onReply?: (msg: ChatMessageInfo) => void;
}

export function MessageList({
  messages,
  streamingContent,
  waiting,
  toolActivity,
  onReply,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasTools = toolActivity !== null && toolActivity !== undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent, waiting, hasTools, toolActivity?.running]);

  const streaming = streamingContent.length > 0;
  const streamMsg: ChatMessageInfo | null = streaming
    ? {
        id: -1,
        role: "assistant",
        content: streamingContent,
        createdAt: Date.now(),
        replyToId: null,
      }
    : null;

  const showThinking = waiting && !streaming && !hasTools;

  return (
    <div class="flex-grow-1 overflow-auto p-3" style="min-height: 0;">
      {messages.length === 0 && !streaming && !waiting && !hasTools && (
        <div class="text-center text-muted mt-5">
          <p class="fs-5">Start a conversation</p>
          <p class="small">Type a message below to begin.</p>
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.id} id={`msg-${msg.id}`} class="message-row">
          <MessageBubble
            message={msg}
            allMessages={messages}
            onReply={msg.id > 0 ? onReply : undefined}
          />
        </div>
      ))}
      {streamMsg && <MessageBubble message={streamMsg} streaming />}
      {hasTools && <ToolActivityIndicator activity={toolActivity} />}
      {showThinking && <ThinkingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}

function ToolActivityIndicator({ activity }: { activity: ToolActivity }) {
  const label = activity.tools.join(", ");
  return (
    <div class="d-flex mb-3 justify-content-start">
      <div class="d-flex align-items-center gap-2 rounded-3 px-3 py-2 bg-info bg-opacity-10 border-start border-info border-3">
        {activity.running ? (
          <span
            class="spinner-border spinner-border-sm text-info"
            style="width: 0.875rem; height: 0.875rem;"
          />
        ) : (
          <span class="text-info" style="font-size: 0.875rem;">
            &#10003;
          </span>
        )}
        <span class="small fw-medium text-info">
          {activity.running ? `Using ${label}` : `Used ${label}`}
        </span>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div class="d-flex mb-3 justify-content-start">
      <div class="card bg-body-secondary" style="min-width: 60px;">
        <div class="card-body py-2 px-3">
          <div class="d-flex align-items-center gap-1">
            <span
              class="spinner-grow spinner-grow-sm text-secondary"
              style="width: 0.5rem; height: 0.5rem; animation-delay: 0ms;"
            />
            <span
              class="spinner-grow spinner-grow-sm text-secondary"
              style="width: 0.5rem; height: 0.5rem; animation-delay: 150ms;"
            />
            <span
              class="spinner-grow spinner-grow-sm text-secondary"
              style="width: 0.5rem; height: 0.5rem; animation-delay: 300ms;"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
