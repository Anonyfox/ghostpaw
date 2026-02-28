import { useCallback, useRef, useState } from "preact/hooks";
import { ModelPicker } from "./model_picker.tsx";

interface ChatInputProps {
  onSend: (text: string, model?: string) => void;
  disabled?: boolean;
  defaultModel: string;
}

export function ChatInput({ onSend, disabled, defaultModel }: ChatInputProps) {
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
    onSend(trimmed, modelOverride);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, disabled, onSend, selectedModel, defaultModel]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div class="border-top p-3">
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
