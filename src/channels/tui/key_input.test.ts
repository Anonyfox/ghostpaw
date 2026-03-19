import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { createInputState, handleKeypress, renderInputLine } from "./key_input.ts";

describe("createInputState", () => {
  it("starts with empty buffer and zero cursor", () => {
    const state = createInputState();
    strictEqual(state.buffer, "");
    strictEqual(state.cursor, 0);
    strictEqual(state.history.length, 0);
    strictEqual(state.historyIndex, -1);
  });
});

describe("handleKeypress", () => {
  it("inserts printable characters at cursor position", () => {
    const state = createInputState();
    handleKeypress(state, "a", { name: "a" });
    handleKeypress(state, "b", { name: "b" });
    strictEqual(state.buffer, "ab");
    strictEqual(state.cursor, 2);
  });

  it("handles backspace", () => {
    const state = createInputState();
    handleKeypress(state, "a", { name: "a" });
    handleKeypress(state, "b", { name: "b" });
    handleKeypress(state, undefined, { name: "backspace" });
    strictEqual(state.buffer, "a");
    strictEqual(state.cursor, 1);
  });

  it("backspace at position 0 does nothing", () => {
    const state = createInputState();
    const event = handleKeypress(state, undefined, { name: "backspace" });
    strictEqual(state.buffer, "");
    ok(event);
  });

  it("handles delete key", () => {
    const state = createInputState();
    state.buffer = "abc";
    state.cursor = 1;
    handleKeypress(state, undefined, { name: "delete" });
    strictEqual(state.buffer, "ac");
    strictEqual(state.cursor, 1);
  });

  it("handles left arrow", () => {
    const state = createInputState();
    state.buffer = "ab";
    state.cursor = 2;
    handleKeypress(state, undefined, { name: "left" });
    strictEqual(state.cursor, 1);
  });

  it("handles right arrow", () => {
    const state = createInputState();
    state.buffer = "ab";
    state.cursor = 0;
    handleKeypress(state, undefined, { name: "right" });
    strictEqual(state.cursor, 1);
  });

  it("handles home and end keys", () => {
    const state = createInputState();
    state.buffer = "hello";
    state.cursor = 3;
    handleKeypress(state, undefined, { name: "home" });
    strictEqual(state.cursor, 0);
    handleKeypress(state, undefined, { name: "end" });
    strictEqual(state.cursor, 5);
  });

  it("ctrl+a moves to start, ctrl+e moves to end", () => {
    const state = createInputState();
    state.buffer = "hello";
    state.cursor = 3;
    handleKeypress(state, undefined, { name: "a", ctrl: true });
    strictEqual(state.cursor, 0);
    handleKeypress(state, undefined, { name: "e", ctrl: true });
    strictEqual(state.cursor, 5);
  });

  it("returns submit event on enter with text", () => {
    const state = createInputState();
    state.buffer = "hello";
    state.cursor = 5;
    const event = handleKeypress(state, undefined, { name: "return" });
    ok(event);
    strictEqual(event.type, "submit");
    if (event.type === "submit") strictEqual(event.text, "hello");
    strictEqual(state.buffer, "");
    strictEqual(state.history.length, 1);
  });

  it("enter on empty buffer does nothing", () => {
    const state = createInputState();
    const event = handleKeypress(state, undefined, { name: "return" });
    strictEqual(event, null);
  });

  it("returns cancel event on ctrl+c", () => {
    const state = createInputState();
    const event = handleKeypress(state, undefined, { name: "c", ctrl: true });
    ok(event);
    strictEqual(event.type, "cancel");
  });

  it("returns clear event on ctrl+l", () => {
    const state = createInputState();
    const event = handleKeypress(state, undefined, { name: "l", ctrl: true });
    ok(event);
    strictEqual(event.type, "clear");
  });

  it("up arrow emits scroll event with delta -1", () => {
    const state = createInputState();
    const event = handleKeypress(state, undefined, { name: "up" });
    ok(event);
    strictEqual(event.type, "scroll");
    if (event.type === "scroll") strictEqual(event.delta, -1);
  });

  it("down arrow emits scroll event with delta +1", () => {
    const state = createInputState();
    const event = handleKeypress(state, undefined, { name: "down" });
    ok(event);
    strictEqual(event.type, "scroll");
    if (event.type === "scroll") strictEqual(event.delta, 1);
  });

  it("page up emits scroll event with delta -20", () => {
    const state = createInputState();
    const event = handleKeypress(state, undefined, { name: "pageup" });
    ok(event);
    strictEqual(event.type, "scroll");
    if (event.type === "scroll") strictEqual(event.delta, -20);
  });

  it("page down emits scroll event with delta +20", () => {
    const state = createInputState();
    const event = handleKeypress(state, undefined, { name: "pagedown" });
    ok(event);
    strictEqual(event.type, "scroll");
    if (event.type === "scroll") strictEqual(event.delta, 20);
  });

  it("ctrl+p navigates history up", () => {
    const state = createInputState();
    state.history = ["first", "second"];
    handleKeypress(state, undefined, { name: "p", ctrl: true });
    strictEqual(state.buffer, "second");
    handleKeypress(state, undefined, { name: "p", ctrl: true });
    strictEqual(state.buffer, "first");
  });

  it("ctrl+n navigates history down", () => {
    const state = createInputState();
    state.history = ["first"];
    handleKeypress(state, undefined, { name: "p", ctrl: true });
    strictEqual(state.buffer, "first");
    handleKeypress(state, undefined, { name: "n", ctrl: true });
    strictEqual(state.buffer, "");
  });

  it("ctrl+w deletes word backward", () => {
    const state = createInputState();
    state.buffer = "hello world";
    state.cursor = 11;
    handleKeypress(state, undefined, { name: "w", ctrl: true });
    strictEqual(state.buffer, "hello ");
    strictEqual(state.cursor, 6);
  });

  it("ctrl+u clears to beginning of line", () => {
    const state = createInputState();
    state.buffer = "hello world";
    state.cursor = 6;
    handleKeypress(state, undefined, { name: "u", ctrl: true });
    strictEqual(state.buffer, "world");
    strictEqual(state.cursor, 0);
  });

  it("inserts at cursor mid-buffer", () => {
    const state = createInputState();
    state.buffer = "ac";
    state.cursor = 1;
    handleKeypress(state, "b", { name: "b" });
    strictEqual(state.buffer, "abc");
    strictEqual(state.cursor, 2);
  });
});

describe("renderInputLine", () => {
  it("renders prompt followed by buffer content", () => {
    const state = createInputState();
    state.buffer = "hello";
    const line = renderInputLine(state, "  > ", 40);
    ok(line.startsWith("  > hello"));
    strictEqual(line.length, 40);
  });

  it("truncates buffer to available width", () => {
    const state = createInputState();
    state.buffer = "a".repeat(100);
    const line = renderInputLine(state, "> ", 10);
    strictEqual(line.length, 10);
  });
});
