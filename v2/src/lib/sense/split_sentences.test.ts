import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { splitSentences } from "./split_sentences.ts";

describe("splitSentences", () => {
  it("splits on sentence-terminal punctuation", () => {
    const sents = splitSentences("First sentence. Second sentence! Third?");
    strictEqual(sents.length, 3);
  });

  it("filters out short fragments", () => {
    const sents = splitSentences("Yes. No. This is a proper sentence.");
    strictEqual(sents.length, 1);
  });

  it("preserves sentence content", () => {
    const sents = splitSentences("The cat sat. The dog ran.");
    strictEqual(sents[0], "The cat sat.");
    strictEqual(sents[1], "The dog ran.");
  });

  it("handles empty input", () => {
    deepStrictEqual(splitSentences(""), []);
  });

  it("respects custom minLength", () => {
    const sents = splitSentences("Hi. Hello. How are you doing today?", 3);
    strictEqual(sents.length, 3);
  });
});
