import { useState } from "preact/hooks";
import type { MemoryCommandResponse } from "../../shared/memory_types.ts";
import { apiPost } from "../api_post.ts";

interface Props {
  memoryId?: number;
  onSuccess: () => void;
  placeholder?: string;
}

export function MemoryCommandBox({ memoryId, onSuccess, placeholder }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; cost: number; acted: boolean } | null>(null);

  const submit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { text: input.trim() };
      if (memoryId) body.memoryId = memoryId;
      const res = await apiPost<MemoryCommandResponse>("/api/memories/command", body);
      setResult({ text: res.response, cost: res.cost, acted: res.acted });
      setInput("");
      if (res.acted) onSuccess();
    } catch (err) {
      setResult({
        text: err instanceof Error ? err.message : "Command failed.",
        cost: 0,
        acted: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const dismiss = () => setResult(null);

  const defaultPlaceholder = memoryId
    ? "e.g. 'this is outdated, forget it'"
    : "e.g. 'remember that deploy uses port 8080'";

  return (
    <div class="mb-3">
      <div class="input-group">
        <input
          type="text"
          class="form-control"
          placeholder={placeholder ?? defaultPlaceholder}
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          type="button"
          class="btn btn-info"
          onClick={submit}
          disabled={loading || !input.trim()}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
      {result && (
        <div
          class={`alert ${result.acted ? "alert-success" : "alert-warning"} mt-2 mb-0 d-flex justify-content-between align-items-start`}
          role="alert"
        >
          <div>
            <div style="white-space: pre-wrap;">{result.text}</div>
            {result.cost > 0 && (
              <small class="text-muted d-block mt-1">${result.cost.toFixed(4)}</small>
            )}
          </div>
          <button type="button" class="btn-close ms-2" aria-label="Dismiss" onClick={dismiss} />
        </div>
      )}
    </div>
  );
}
