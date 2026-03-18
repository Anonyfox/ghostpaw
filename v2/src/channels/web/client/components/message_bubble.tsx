import { useCallback } from "preact/hooks";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import { RenderMarkdown } from "./render_markdown.tsx";

interface MessageBubbleProps {
  message: ChatMessageInfo;
  streaming?: boolean;
  allMessages?: ChatMessageInfo[];
  onReply?: (msg: ChatMessageInfo) => void;
}

function truncateQuote(text: string, maxLength = 80): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function MessageBubble({ message, streaming, allMessages, onReply }: MessageBubbleProps) {
  const isUser = message.role === "user";

  const handleReply = useCallback(() => {
    onReply?.(message);
  }, [onReply, message]);

  const replyTarget =
    message.replyToId && allMessages ? allMessages.find((m) => m.id === message.replyToId) : null;

  const handleQuoteClick = useCallback(() => {
    if (!message.replyToId) return;
    const el = document.getElementById(`msg-${message.replyToId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [message.replyToId]);

  return (
    <div class={`d-flex mb-3 ${isUser ? "justify-content-end" : "justify-content-start"}`}>
      <div
        class={`card position-relative ${isUser ? "bg-primary text-white" : "bg-body-secondary"}`}
        style="max-width: 80%; min-width: 60px;"
      >
        {onReply && (
          <button
            type="button"
            class="reply-action btn btn-sm btn-outline-secondary position-absolute"
            style="top: -0.5rem; right: -0.5rem; padding: 0.1rem 0.35rem; font-size: 0.75rem; line-height: 1;"
            onClick={handleReply}
            title="Reply"
          >
            ↩
          </button>
        )}
        <div class="card-body py-2 px-3">
          {replyTarget && (
            // biome-ignore lint/a11y/useKeyWithClickEvents: quote click
            // biome-ignore lint/a11y/noStaticElementInteractions: quote click
            <div
              class="reply-quote mb-1 small text-muted border-start border-info border-2 ps-2"
              style="cursor: pointer;"
              onClick={handleQuoteClick}
            >
              <div class="fw-semibold" style="font-size: 0.75em;">
                {replyTarget.role === "user" ? "you" : "ghostpaw"}
              </div>
              <div style="font-size: 0.8em;">{truncateQuote(replyTarget.content)}</div>
            </div>
          )}
          {isUser ? (
            <div style="white-space: pre-wrap;">{message.content}</div>
          ) : (
            <RenderMarkdown content={message.content} />
          )}
          {streaming && (
            <span class="streaming-indicator d-inline-block ms-1">
              <span class="spinner-grow spinner-grow-sm text-secondary" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
