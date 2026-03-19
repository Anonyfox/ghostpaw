import { ok, strictEqual } from "node:assert";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import { readSecretInteractive } from "./read_secret_interactive.ts";

describe("readSecretInteractive", () => {
  it("reads input and trims the result", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const promise = readSecretInteractive("Enter: ", { input, output });
    input.end("  my-secret  \n");
    strictEqual(await promise, "my-secret");
  });

  it("writes the prompt to the output stream", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: string[] = [];
    output.on("data", (chunk: Buffer) => chunks.push(chunk.toString()));
    const promise = readSecretInteractive("Password: ", { input, output });
    input.end("val\n");
    await promise;
    ok(chunks.some((c) => c.includes("Password: ")));
  });

  it("appends a newline to output after reading", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: string[] = [];
    output.on("data", (chunk: Buffer) => chunks.push(chunk.toString()));
    const promise = readSecretInteractive("? ", { input, output });
    input.end("val\n");
    await promise;
    ok(chunks.some((c) => c === "\n"));
  });

  it("returns empty string for empty input line", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const promise = readSecretInteractive("? ", { input, output });
    input.end("\n");
    strictEqual(await promise, "");
  });
});
