import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import { RenderMarkdown } from "./render_markdown.tsx";

interface MessageBubbleProps {
  message: ChatMessageInfo;
  streaming?: boolean;
}

export function MessageBubble({ message, streaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div class={`d-flex mb-3 ${isUser ? "justify-content-end" : "justify-content-start"}`}>
      <div
        class={`card ${isUser ? "bg-primary text-white" : "bg-light"}`}
        style="max-width: 80%; min-width: 60px;"
      >
        <div class="card-body py-2 px-3">
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
