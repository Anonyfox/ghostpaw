import { strictEqual } from "node:assert";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import { readSecretFromStream } from "./read_secret_from_stream.ts";

describe("readSecretFromStream", () => {
  it("reads a line from a readable stream and trims it", async () => {
    const input = Readable.from(["  sk-ant-abc123  \n"]);
    const result = await readSecretFromStream(input);
    strictEqual(result, "sk-ant-abc123");
  });

  it("returns empty string for empty input", async () => {
    const input = Readable.from([""]);
    const result = await readSecretFromStream(input);
    strictEqual(result, "");
  });

  it("handles multiline input by taking the full content trimmed", async () => {
    const input = Readable.from(["line1\nline2\n"]);
    const result = await readSecretFromStream(input);
    strictEqual(result, "line1\nline2");
  });

  it("handles chunked input", async () => {
    const input = Readable.from(["sk-ant-", "abc", "123\n"]);
    const result = await readSecretFromStream(input);
    strictEqual(result, "sk-ant-abc123");
  });

  it("trims trailing newlines from piped input", async () => {
    const input = Readable.from(["tvly-key\n\n"]);
    const result = await readSecretFromStream(input);
    strictEqual(result, "tvly-key");
  });
});
