import { useEffect, useRef } from "preact/hooks";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import { MessageBubble } from "./message_bubble.tsx";

interface MessageListProps {
  messages: ChatMessageInfo[];
  streamingContent: string;
}

export function MessageList({ messages, streamingContent }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  const streaming = streamingContent.length > 0;
  const streamMsg: ChatMessageInfo | null = streaming
    ? { id: -1, role: "assistant", content: streamingContent, createdAt: Date.now() }
    : null;

  return (
    <div class="flex-grow-1 overflow-auto p-3" style="min-height: 0;">
      {messages.length === 0 && !streaming && (
        <div class="text-center text-muted mt-5">
          <p class="fs-5">Start a conversation</p>
          <p class="small">Type a message below to begin.</p>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {streamMsg && <MessageBubble message={streamMsg} streaming />}
      <div ref={bottomRef} />
    </div>
  );
}
