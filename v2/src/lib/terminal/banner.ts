import { style } from "./style.ts";

export function banner(name: string, version: string): void {
  console.log(`${style.bold(name)} ${style.dim(`v${version}`)}`);
}
