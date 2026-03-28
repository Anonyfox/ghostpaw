import { cyan, dim, red, yellow } from "./style.ts";

export function info(label: string, message: string): void {
  console.error(`${cyan(label)} ${message}`);
}

export function warn(label: string, message: string): void {
  console.error(`${yellow(label)} ${message}`);
}

export function error(label: string, message: string): void {
  console.error(`${red(label)} ${message}`);
}

export function debug(label: string, message: string): void {
  console.error(`${dim(label)} ${dim(message)}`);
}
