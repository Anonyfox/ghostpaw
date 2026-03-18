import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ChatMessageInfo } from "../../shared/chat_message_info.ts";
import { ModelPicker } from "./model_picker.tsx";

const SLASH_COMMANDS = [
  { name: "help", description: "List available commands", args: "[command]" },
  { name: "new", description: "Start a fresh chat session" },
  { name: "undo", description: "Remove the last message exchange" },
  { name: "model", description: "List or switch models", args: "[name]" },
  { name: "costs", description: "Show cost breakdown" },
] as const;

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
  const [selectedIdx, setSelectedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const slashMatches = useMemo(() => {
    if (!text.startsWith("/")) return [];
    const typed = text.slice(1).toLowerCase();
    if (typed.includes(" ")) return [];
    return SLASH_COMMANDS.filter((c) => c.name.startsWith(typed));
  }, [text]);

  const showDropdown = slashMatches.length > 0;

  const handleInput = useCallback(
    (e: Event) => {
      setText((e.target as HTMLTextAreaElement).value);
      setSelectedIdx(0);
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

  const acceptCompletion = useCallback((cmd: (typeof SLASH_COMMANDS)[number]) => {
    const hasArgs = "args" in cmd && cmd.args;
    setText(`/${cmd.name}${hasArgs ? " " : ""}`);
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDropdown) {
          setText("");
          return;
        }
        if (replyTo) {
          onCancelReply?.();
          return;
        }
      }

      if (showDropdown) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIdx((i) => Math.min(i + 1, slashMatches.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIdx((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Tab") {
          e.preventDefault();
          const match = slashMatches[selectedIdx];
          if (match) acceptCompletion(match);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, replyTo, onCancelReply, showDropdown, slashMatches, selectedIdx, acceptCompletion],
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
      <div class="d-flex align-items-end gap-2 position-relative">
        <ModelPicker value={selectedModel} onChange={setSelectedModel} disabled={disabled} />
        <div class="flex-grow-1 position-relative">
          {showDropdown && (
            <div
              class="position-absolute bottom-100 start-0 w-100 mb-1 border rounded bg-body shadow-sm"
              style="z-index: 10; max-height: 220px; overflow-y: auto;"
            >
              {slashMatches.map((cmd, i) => (
                // biome-ignore lint/a11y/useKeyWithClickEvents: dropdown click
                // biome-ignore lint/a11y/noStaticElementInteractions: dropdown click
                <div
                  key={cmd.name}
                  class={`px-3 py-2 d-flex align-items-baseline gap-2 small ${i === selectedIdx ? "bg-primary text-white" : ""}`}
                  style="cursor: pointer;"
                  onClick={() => acceptCompletion(cmd)}
                >
                  <span class="fw-semibold">/{cmd.name}</span>
                  {"args" in cmd && cmd.args ? <span class="text-muted">{cmd.args}</span> : null}
                  <span class={`ms-auto ${i === selectedIdx ? "text-white-50" : "text-muted"}`}>
                    {cmd.description}
                  </span>
                </div>
              ))}
            </div>
          )}
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
