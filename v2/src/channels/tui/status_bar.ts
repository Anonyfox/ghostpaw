import { style } from "../../lib/terminal/index.ts";
import { stripAnsi } from "./wrap_text.ts";

export interface TopBarState {
  version: string;
  model: string;
  width: number;
}

export function renderTopBar(state: TopBarState): string {
  const left = ` ${style.boldCyan("ghostpaw")} ${style.dim(`v${state.version}`)}`;
  const right = `${style.dim(state.model)} `;
  const padding = Math.max(0, state.width - stripAnsi(left).length - stripAnsi(right).length);
  return left + " ".repeat(padding) + right;
}

export interface BottomBarState {
  tokens: number;
  width: number;
  scrolled?: boolean;
}

export function renderBottomBar(state: BottomBarState): string {
  const left = state.tokens > 0 ? ` ${style.dim(formatTokens(state.tokens))}` : "";
  const scrollHint = state.scrolled ? `${style.dim("[scrolled]")}  ` : "";
  const right = `${scrollHint}${style.dim("ctrl+c exit")} `;
  const padding = Math.max(0, state.width - stripAnsi(left).length - stripAnsi(right).length);
  return left + " ".repeat(padding) + right;
}

function formatTokens(n: number): string {
  if (n >= 1000) return `~${(n / 1000).toFixed(1)}k tokens`;
  return `~${n} tokens`;
}
