import * as readline from "node:readline";
import { createSession, getSession, listSessions } from "../../core/chat/session.ts";
import type { Agent, TurnResult } from "../../core/chat/types.ts";
import type { CommandRegistry } from "../../core/commands/registry.ts";
import { renderSoul } from "../../core/souls/render.ts";
import { bold, cyan, dim, gray, green, yellow } from "../../lib/terminal/style.ts";
import { VERSION } from "../../lib/version.ts";
import type { RuntimeContext } from "../../runtime.ts";
import { ansi } from "./ansi.ts";
import { createInputState, handleKeypress, type KeyInfo, renderInputLine } from "./key_input.ts";
import { wrapText } from "./wrap_text.ts";

interface TuiState {
  sessionId: number;
  lines: string[];
  scrollOffset: number;
  streaming: boolean;
  streamAbort: AbortController | null;
  toolStatus: string;
  ghostMode: boolean;
}

function getSize(): { rows: number; cols: number } {
  return {
    rows: process.stdout.rows ?? 24,
    cols: process.stdout.columns ?? 80,
  };
}

function pushLines(state: TuiState, text: string, cols: number): void {
  const wrapped = wrapText(text, cols - 2);
  for (const line of wrapped) {
    state.lines.push(line);
  }
}

function paint(state: TuiState, inputState: ReturnType<typeof createInputState>): void {
  const { rows, cols } = getSize();
  const chatHeight = rows - 2; // 1 for status, 1 for input

  let buf = "";
  buf += ansi.cursorTo(1, 1);

  const totalLines = state.lines.length;
  const start = Math.max(0, totalLines - chatHeight - state.scrollOffset);
  const end = Math.min(totalLines, start + chatHeight);

  for (let i = 0; i < chatHeight; i++) {
    buf += ansi.cursorTo(i + 1, 1);
    buf += ansi.clearLine;
    const lineIdx = start + i;
    if (lineIdx < end) {
      buf += state.lines[lineIdx];
    }
  }

  buf += ansi.cursorTo(rows - 1, 1);
  buf += ansi.clearLine;
  const session = `session:${state.sessionId}`;
  const ghostTag = state.ghostMode ? ` ${dim("|")} ${yellow("ghost")}` : "";
  const status = state.toolStatus || (state.streaming ? "streaming..." : "ready");
  const statusLine = ` ${dim(session)}${ghostTag} ${dim("|")} ${dim(status)}`;
  buf += statusLine.slice(0, cols);

  buf += ansi.cursorTo(rows, 1);
  buf += ansi.clearLine;
  const prompt = state.streaming ? dim("  ...  ") : green("  > ");
  buf += renderInputLine(inputState, prompt, cols);

  const promptLen = state.streaming ? 7 : 4;
  buf += ansi.cursorTo(rows, promptLen + inputState.cursor + 1);
  buf += ansi.showCursor;

  process.stdout.write(buf);
}

export async function runTui(
  ctx: RuntimeContext,
  agent: Agent,
  registry: CommandRegistry,
): Promise<void> {
  const { db } = ctx;
  const sessions = listSessions(db);
  let session =
    sessions.length > 0
      ? getSession(db, sessions[0].id)!
      : createSession(db, ctx.config.model, renderSoul(ctx.soulsDb, ctx.soulIds.ghostpaw), {
          soulId: ctx.soulIds.ghostpaw,
        });

  const state: TuiState = {
    sessionId: session.id,
    lines: [],
    scrollOffset: 0,
    streaming: false,
    streamAbort: null,
    toolStatus: "",
    ghostMode: false,
  };

  const inputState = createInputState();
  const { cols } = getSize();

  pushLines(state, `${bold(cyan("Ghostpaw"))} ${dim(`v${VERSION}`)}`, cols);
  pushLines(state, `${dim(`Session ${session.id} | ${session.model}`)}`, cols);
  pushLines(state, "", cols);

  process.stdout.write(ansi.enterAltScreen + ansi.hideCursor);
  process.stdin.setRawMode(true);
  readline.emitKeypressEvents(process.stdin);

  paint(state, inputState);

  function cleanup(): void {
    process.stdin.setRawMode(false);
    process.stdout.write(ansi.showCursor + ansi.resetScrollRegion + ansi.exitAltScreen);
  }

  async function handleSubmit(text: string): Promise<void> {
    const { cols: c } = getSize();

    const parsed = registry.parseSlash(text);
    if (parsed) {
      const cmdCtx = { ...ctx, sessionId: state.sessionId };
      const result = await registry.execute(parsed.name, parsed.args, cmdCtx);

      pushLines(state, dim(`/${parsed.name}: ${result.text}`), c);
      pushLines(state, "", c);

      if (result.action) {
        if (result.action.type === "new_session" || result.action.type === "switch_session") {
          state.sessionId = result.action.sessionId;
          session = getSession(db, state.sessionId)!;
          state.lines = [];
          pushLines(state, bold(`Session ${session.id} | ${session.model}`), c);
          pushLines(state, "", c);
        }
        if (result.action.type === "ghost_toggle") {
          state.ghostMode = !state.ghostMode;
          pushLines(
            state,
            dim(
              `Ghost mode ${state.ghostMode ? "on" : "off"} — subsystem interceptors ${state.ghostMode ? "bypassed" : "active"}`,
            ),
            c,
          );
          pushLines(state, "", c);
        }
        if (result.action.type === "quit") {
          cleanup();
          process.exit(0);
        }
      }

      state.scrollOffset = 0;
      paint(state, inputState);
      return;
    }

    pushLines(state, `${bold(cyan("you"))} ${text}`, c);
    pushLines(state, "", c);
    state.streaming = true;
    state.toolStatus = "";
    state.scrollOffset = 0;

    const streamAbort = new AbortController();
    state.streamAbort = streamAbort;
    paint(state, inputState);

    let streamedContent = "";
    try {
      const stream = agent.streamTurn(state.sessionId, text, {
        ghost: state.ghostMode,
        onToolCallStart: (calls) => {
          state.toolStatus = calls.map((c) => `${c.name}...`).join(", ");
          paint(state, inputState);
        },
        onToolCallComplete: () => {
          state.toolStatus = "";
          paint(state, inputState);
        },
      });

      let result = await stream.next();
      while (!result.done) {
        if (streamAbort.signal.aborted) break;
        streamedContent += result.value;
        while (state.lines.length > 0 && state.lines[state.lines.length - 1] !== "") {
          if (state.lines[state.lines.length - 1] === "") break;
          state.lines.pop();
        }
        pushLines(state, `${dim("ghostpaw")} ${streamedContent}`, c);
        state.scrollOffset = 0;
        paint(state, inputState);
        result = await stream.next();
      }

      if (result.done) {
        const turnResult: TurnResult = result.value;
        while (state.lines.length > 0 && state.lines[state.lines.length - 1] !== "") {
          state.lines.pop();
        }
        pushLines(state, `${bold(yellow("ghostpaw"))} ${turnResult.content}`, c);
        if (turnResult.succeeded) {
          const u = turnResult.usage;
          pushLines(
            state,
            gray(
              `  [${turnResult.model} | ${u.inputTokens}+${u.outputTokens} tokens | $${turnResult.cost.estimatedUsd.toFixed(4)}]`,
            ),
            c,
          );
        }
        pushLines(state, "", c);
      }
    } catch (err) {
      if (!streamAbort.signal.aborted) {
        const msg = err instanceof Error ? err.message : String(err);
        pushLines(state, `${bold("\x1b[31merror\x1b[39m")} ${msg}`, c);
        pushLines(state, "", c);
      }
    }

    state.streaming = false;
    state.streamAbort = null;
    state.toolStatus = "";
    state.scrollOffset = 0;
    paint(state, inputState);
  }

  process.stdin.on("keypress", (ch: string | undefined, key: KeyInfo | undefined) => {
    if (state.streaming && key?.ctrl && key.name === "c") {
      state.streamAbort?.abort();
      state.streaming = false;
      state.streamAbort = null;
      state.toolStatus = "";
      const { cols: c } = getSize();
      pushLines(state, dim("  (interrupted)"), c);
      pushLines(state, "", c);
      state.scrollOffset = 0;
      paint(state, inputState);
      return;
    }

    if (!state.streaming && key?.ctrl && key.name === "c") {
      cleanup();
      process.exit(0);
    }

    if (state.streaming) return;

    const event = handleKeypress(inputState, ch, key);
    if (!event) return;

    switch (event.type) {
      case "submit":
        handleSubmit(event.text);
        break;
      case "cancel":
        cleanup();
        process.exit(0);
        break;
      case "clear":
        state.lines = [];
        state.scrollOffset = 0;
        paint(state, inputState);
        break;
      case "scroll":
        state.scrollOffset = Math.max(
          0,
          Math.min(state.lines.length - 1, state.scrollOffset - event.delta),
        );
        paint(state, inputState);
        break;
      case "redraw":
        paint(state, inputState);
        break;
    }
  });

  process.stdout.on("resize", () => {
    paint(state, inputState);
  });
}
