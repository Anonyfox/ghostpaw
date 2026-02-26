import { style } from "./style.ts";

export function label(tag: string, message: string, colorFn?: (s: string) => string): void {
  const padded = tag.padStart(10);
  const styled = colorFn ? colorFn(padded) : style.bold(padded);
  console.log(`${styled}  ${message}`);
}
