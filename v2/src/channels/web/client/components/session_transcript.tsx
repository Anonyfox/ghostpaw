import { useState } from "preact/hooks";
import type { SessionMessageInfo } from "../../shared/session_types.ts";

interface Props {
  messages: SessionMessageInfo[];
  sessionModel: string | null;
}

function ToolCallMessage({ msg }: { msg: SessionMessageInfo }) {
  const [open, setOpen] = useState(false);
  let toolNames = "tools";
  try {
    const calls = JSON.parse(msg.content || "[]");
    if (Array.isArray(calls)) {
      toolNames = calls.map((c: { name?: string }) => c.name ?? "?").join(", ");
    }
  } catch {
    /* ignore */
  }

  return (
    <div class="my-1">
      <button type="button" class="btn btn-sm p-0 text-info" onClick={() => setOpen(!open)}>
        {open ? "▾" : "▸"} Tool call: {toolNames}
      </button>
      {open && (
        <pre class="bg-body-tertiary rounded p-2 mt-1 small" style="white-space: pre-wrap;">
          {msg.content}
        </pre>
      )}
    </div>
  );
}

function ToolResultMessage({ msg }: { msg: SessionMessageInfo }) {
  const [open, setOpen] = useState(false);
  let label = "Tool result";
  try {
    const data = JSON.parse(msg.toolData || "{}");
    if (data.toolCallId) label = `Result for ${data.toolCallId.slice(0, 12)}...`;
  } catch {
    /* ignore */
  }

  return (
    <div class="my-1">
      <button
        type="button"
        class="btn btn-sm p-0 text-body-secondary"
        onClick={() => setOpen(!open)}
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && (
        <pre
          class="bg-body-tertiary rounded p-2 mt-1 small"
          style="white-space: pre-wrap; max-height: 300px; overflow-y: auto;"
        >
          {msg.content}
        </pre>
      )}
    </div>
  );
}

export function SessionTranscript({ messages, sessionModel }: Props) {
  if (messages.length === 0) {
    return <p class="text-body-tertiary small">No messages.</p>;
  }

  return (
    <div class="mt-2">
      {messages.map((msg) => {
        if (msg.isCompaction) {
          return (
            <div key={msg.id} class="text-center text-body-tertiary small my-2">
              -- context compacted --
            </div>
          );
        }

        if (msg.role === "tool_call") return <ToolCallMessage key={msg.id} msg={msg} />;
        if (msg.role === "tool_result") return <ToolResultMessage key={msg.id} msg={msg} />;

        const isUser = msg.role === "user";
        const showModel = msg.model && msg.model !== sessionModel;

        return (
          <div
            key={msg.id}
            class={`mb-2 p-2 rounded ${isUser ? "bg-primary bg-opacity-10" : "bg-body-secondary"}`}
          >
            <div class="d-flex justify-content-between mb-1">
              <span class="small fw-semibold">{isUser ? "User" : "Assistant"}</span>
              <span class="text-body-tertiary small">
                {showModel && <span class="me-2">{msg.model}</span>}
              </span>
            </div>
            <div
              class="rendered-markdown small"
              dangerouslySetInnerHTML={{ __html: msg.content }}
            />
          </div>
        );
      })}
    </div>
  );
}
