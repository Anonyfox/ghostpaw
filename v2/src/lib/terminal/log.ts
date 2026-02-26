import { label } from "./label.ts";
import { style } from "./style.ts";

export const log = {
  created: (msg: string) => label("created", msg, style.boldGreen),
  exists: (msg: string) => label("exists", msg, style.dim),
  done: (msg: string) => label("done", msg, style.boldGreen),
  info: (msg: string) => label("info", msg, style.boldCyan),
  warn: (msg: string) => label("warning", msg, style.boldYellow),
  error: (msg: string) => label("error", msg, style.boldRed),
  step: (msg: string) => label("", msg),
};
