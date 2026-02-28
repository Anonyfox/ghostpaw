export interface KeyInputState {
  buffer: string;
  cursor: number;
  history: string[];
  historyIndex: number;
}

export interface KeyInfo {
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  sequence?: string;
}

export type InputEvent =
  | { type: "submit"; text: string }
  | { type: "cancel" }
  | { type: "clear" }
  | { type: "scroll"; delta: number }
  | { type: "redraw" };

export function createInputState(): KeyInputState {
  return { buffer: "", cursor: 0, history: [], historyIndex: -1 };
}

export function handleKeypress(
  state: KeyInputState,
  ch: string | undefined,
  key: KeyInfo | undefined,
): InputEvent | null {
  if (key?.ctrl) {
    if (key.name === "c") return { type: "cancel" };
    if (key.name === "l") return { type: "clear" };
    if (key.name === "a") {
      state.cursor = 0;
      return { type: "redraw" };
    }
    if (key.name === "e") {
      state.cursor = state.buffer.length;
      return { type: "redraw" };
    }
    if (key.name === "u") {
      state.buffer = state.buffer.slice(state.cursor);
      state.cursor = 0;
      return { type: "redraw" };
    }
    if (key.name === "w") {
      return deleteWordBack(state);
    }
    if (key.name === "p") return navigateHistory(state, -1);
    if (key.name === "n") return navigateHistory(state, 1);
    return null;
  }

  if (key?.name === "return") {
    const text = state.buffer.trim();
    if (!text) return null;
    state.history.push(text);
    state.buffer = "";
    state.cursor = 0;
    state.historyIndex = -1;
    return { type: "submit", text };
  }

  if (key?.name === "backspace") {
    if (state.cursor > 0) {
      state.buffer = state.buffer.slice(0, state.cursor - 1) + state.buffer.slice(state.cursor);
      state.cursor--;
    }
    return { type: "redraw" };
  }

  if (key?.name === "delete") {
    if (state.cursor < state.buffer.length) {
      state.buffer = state.buffer.slice(0, state.cursor) + state.buffer.slice(state.cursor + 1);
    }
    return { type: "redraw" };
  }

  if (key?.name === "left") {
    if (state.cursor > 0) state.cursor--;
    return { type: "redraw" };
  }

  if (key?.name === "right") {
    if (state.cursor < state.buffer.length) state.cursor++;
    return { type: "redraw" };
  }

  if (key?.name === "home") {
    state.cursor = 0;
    return { type: "redraw" };
  }

  if (key?.name === "end") {
    state.cursor = state.buffer.length;
    return { type: "redraw" };
  }

  if (key?.name === "up") return { type: "scroll", delta: -1 };
  if (key?.name === "down") return { type: "scroll", delta: 1 };
  if (key?.name === "pageup") return { type: "scroll", delta: -20 };
  if (key?.name === "pagedown") return { type: "scroll", delta: 20 };

  if (ch && !key?.ctrl && !key?.meta) {
    state.buffer = state.buffer.slice(0, state.cursor) + ch + state.buffer.slice(state.cursor);
    state.cursor += ch.length;
    return { type: "redraw" };
  }

  return null;
}

export function renderInputLine(state: KeyInputState, prompt: string, width: number): string {
  const available = width - prompt.length;
  if (available <= 0) return prompt;
  const visible = state.buffer.slice(0, available);
  const padding = Math.max(0, available - visible.length);
  return prompt + visible + " ".repeat(padding);
}

function navigateHistory(state: KeyInputState, direction: number): InputEvent | null {
  if (state.history.length === 0) return null;
  const newIndex =
    state.historyIndex === -1
      ? direction === -1
        ? state.history.length - 1
        : -1
      : state.historyIndex + direction;

  if (newIndex < 0 || newIndex >= state.history.length) {
    state.historyIndex = -1;
    state.buffer = "";
    state.cursor = 0;
    return { type: "redraw" };
  }

  state.historyIndex = newIndex;
  state.buffer = state.history[newIndex]!;
  state.cursor = state.buffer.length;
  return { type: "redraw" };
}

function deleteWordBack(state: KeyInputState): InputEvent {
  const before = state.buffer.slice(0, state.cursor);
  const trimmed = before.replace(/\s+$/, "");
  const wordStart = trimmed.lastIndexOf(" ") + 1;
  state.buffer = state.buffer.slice(0, wordStart) + state.buffer.slice(state.cursor);
  state.cursor = wordStart;
  return { type: "redraw" };
}
