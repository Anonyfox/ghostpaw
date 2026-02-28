import { emitKeypressEvents } from "node:readline";
import { Chat } from "chatoyant";
import type { ChatFactory, TurnContext, TurnResult } from "../../core/chat/index.ts";
import { closeSession, createSession, streamTurn } from "../../core/chat/index.ts";
import { getConfig } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { style } from "../../lib/terminal/index.ts";
import { ansi } from "./ansi.ts";
import { renderChatMessages } from "./chat_view.ts";
import type { KeyInfo } from "./key_input.ts";
import { createInputState, handleKeypress, renderInputLine } from "./key_input.ts";
import { renderBottomBar, renderTopBar } from "./status_bar.ts";
import { stripAnsi, wrapText } from "./wrap_text.ts";

export interface TuiOptions {
  db: DatabaseHandle;
  version: string;
  createChat?: ChatFactory;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function runTui(opts: TuiOptions): Promise<void> {
  const { db, version } = opts;
  const createChat: ChatFactory = opts.createChat ?? ((model: string) => new Chat({ model }));
  const model = resolveModel(db);

  const messages: ChatMessage[] = [];
  const inputState = createInputState();
  let totalTokens = 0;
  let streaming = false;
  let streamContent = "";
  let scrollOffset = 0;
  let running = true;

  const out = process.stdout;
  const w = () => out.columns || 80;
  const h = () => out.rows || 24;

  const session = createSession(db, `tui:${Date.now()}`, { purpose: "chat" });
  const ctx: TurnContext = { db, tools: [], createChat };
  const systemPrompt =
    "You are a helpful AI assistant. Respond concisely, accurately, and directly.";

  function allChatLines(width: number): string[] {
    const lines = renderChatMessages(messages, width);
    if (streaming) {
      lines.push("");
      lines.push(`  ${style.boldCyan("ghostpaw:")}`);
      if (streamContent) {
        for (const raw of streamContent.split("\n")) {
          for (const wrapped of wrapText(raw, width - 4)) {
            lines.push(`  ${wrapped}`);
          }
        }
      }
    }
    return lines;
  }

  function clampScroll(lines: number, chatRows: number): void {
    const maxScroll = Math.max(0, lines - chatRows);
    scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
  }

  function buildFrame(): string {
    const width = w();
    const height = h();
    const chatRows = height - 3;
    const prompt = streaming ? "  ... " : "  > ";

    const lines = allChatLines(width);
    clampScroll(lines.length, chatRows);

    const end = lines.length - scrollOffset;
    const start = Math.max(0, end - chatRows);

    let buf = ansi.hideCursor;

    buf += ansi.cursorTo(1, 1);
    buf += padLine(renderTopBar({ version, model, width }), width);

    for (let i = 0; i < chatRows; i++) {
      buf += ansi.cursorTo(2 + i, 1);
      const idx = start + i;
      buf += idx >= 0 && idx < end ? padLine(lines[idx]!, width) : " ".repeat(width);
    }

    buf += ansi.cursorTo(height - 1, 1);
    buf += padLine(renderInputLine(inputState, prompt, width), width);

    buf += ansi.cursorTo(height, 1);
    buf += padLine(
      renderBottomBar({ tokens: totalTokens, width, scrolled: scrollOffset > 0 }),
      width,
    );

    if (!streaming) {
      buf += ansi.cursorTo(height - 1, prompt.length + inputState.cursor + 1);
    }
    buf += ansi.showCursor;

    return buf;
  }

  function paint(): void {
    if (!running) return;
    out.write(buildFrame());
  }

  function paintInputOnly(): void {
    if (!running) return;
    const width = w();
    const height = h();
    const prompt = "  > ";
    let buf = ansi.hideCursor;
    buf += ansi.cursorTo(height - 1, 1);
    buf += padLine(renderInputLine(inputState, prompt, width), width);
    buf += ansi.cursorTo(height - 1, prompt.length + inputState.cursor + 1);
    buf += ansi.showCursor;
    out.write(buf);
  }

  function cleanup(): void {
    running = false;
    out.write(ansi.showCursor + ansi.exitAltScreen);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  }

  async function handleSubmit(text: string): Promise<void> {
    streaming = true;
    streamContent = "";
    scrollOffset = 0;
    messages.push({ role: "user", content: text });
    paint();

    let fullText = "";
    try {
      const gen = streamTurn({ sessionId: session.id, content: text, systemPrompt, model }, ctx);
      for (;;) {
        const next = await gen.next();
        if (next.done) {
          const result: TurnResult = next.value;
          totalTokens += result.usage.totalTokens;
          break;
        }
        fullText += next.value;
        streamContent = fullText;
        scrollOffset = 0;
        paint();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fullText = fullText || `Error: ${msg}`;
    }

    messages.push({ role: "assistant", content: fullText });
    streaming = false;
    streamContent = "";
    scrollOffset = 0;
    paint();
  }

  out.write(ansi.enterAltScreen + ansi.clearScreen);
  paint();

  emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();

  process.on("SIGINT", () => {
    cleanup();
    closeSession(db, session.id);
    process.exit(0);
  });

  out.on("resize", paint);

  return new Promise<void>((resolve) => {
    process.stdin.on("keypress", (ch: string | undefined, key: KeyInfo | undefined) => {
      if (!running) return;

      if (key?.ctrl && key?.name === "c") {
        cleanup();
        closeSession(db, session.id);
        resolve();
        return;
      }

      if (streaming) return;

      const event = handleKeypress(inputState, ch, key);
      if (!event) return;

      switch (event.type) {
        case "cancel":
          cleanup();
          closeSession(db, session.id);
          resolve();
          break;
        case "clear":
          messages.length = 0;
          totalTokens = 0;
          scrollOffset = 0;
          paint();
          break;
        case "scroll":
          scrollOffset -= event.delta;
          paint();
          break;
        case "submit":
          scrollOffset = 0;
          handleSubmit(event.text);
          break;
        case "redraw":
          paintInputOnly();
          break;
      }
    });
  });
}

function padLine(line: string, width: number): string {
  const visible = stripAnsi(line).length;
  if (visible >= width) return line;
  return `${line}${" ".repeat(width - visible)}`;
}

function resolveModel(db: DatabaseHandle): string {
  const configured = getConfig(db, "default_model");
  return typeof configured === "string" && configured ? configured : "claude-sonnet-4-6";
}
