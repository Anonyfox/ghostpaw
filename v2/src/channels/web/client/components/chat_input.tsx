import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import { ModelPicker } from "./model_picker.tsx";

interface ChatInputProps {
  onSend: (text: string, model?: string, replyToId?: number) => void;
  disabled?: boolean;
  defaultModel: string;
  replyTo?: ChatMessageInfo | null;
  onCancelReply?: () => void;
}

function truncatePreview(text: string, maxLength = 60): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function ChatInput({
  onSend,
  disabled,
  defaultModel,
  replyTo,
  onCancelReply,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const handleInput = useCallback(
    (e: Event) => {
      setText((e.target as HTMLTextAreaElement).value);
      adjustHeight();
    },
    [adjustHeight],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    const modelOverride = selectedModel !== defaultModel ? selectedModel : undefined;
    onSend(trimmed, modelOverride, replyTo?.id);
    setText("");
    onCancelReply?.();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, disabled, onSend, selectedModel, defaultModel, replyTo, onCancelReply]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && replyTo) {
        onCancelReply?.();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, replyTo, onCancelReply],
  );

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  return (
    <div class="border-top p-3">
      {replyTo && (
        <div class="reply-preview d-flex align-items-center gap-2 mb-2 p-2 bg-body-tertiary rounded border-start border-info border-3">
          <span class="small text-muted flex-grow-1">
            <span class="fw-semibold">
              ↩ Replying to {replyTo.role === "user" ? "you" : "ghostpaw"}
            </span>
            <span class="d-block" style="font-size: 0.85em;">
              "{truncatePreview(replyTo.content)}"
            </span>
          </span>
          <button
            type="button"
            class="btn-close btn-close-sm"
            aria-label="Cancel reply"
            onClick={onCancelReply}
          />
        </div>
      )}
      <div class="d-flex align-items-end gap-2">
        <ModelPicker value={selectedModel} onChange={setSelectedModel} disabled={disabled} />
        <div class="flex-grow-1">
          <textarea
            ref={textareaRef}
            class="form-control"
            placeholder={disabled ? "Waiting for response..." : "Type a message..."}
            value={text}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            style="resize: none; overflow-y: auto; max-height: 200px;"
          />
        </div>
        <button
          type="button"
          class="btn btn-primary"
          onClick={handleSend}
          disabled={disabled || !text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
