import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { StreamFormatter } from "./stream_format.js";

describe("StreamFormatter - plain text passthrough", () => {
  it("passes through text without tags", () => {
    const fmt = new StreamFormatter();
    strictEqual(fmt.push("Hello world"), "Hello world");
  });

  it("handles multiple pushes", () => {
    const fmt = new StreamFormatter();
    strictEqual(fmt.push("Hello "), "Hello ");
    strictEqual(fmt.push("world"), "world");
  });

  it("handles empty input", () => {
    const fmt = new StreamFormatter();
    strictEqual(fmt.push(""), "");
  });
});

describe("StreamFormatter - tool_call filtering", () => {
  it("replaces tool_call block with tool name indicator", () => {
    const fmt = new StreamFormatter();
    const input =
      'Let me check.<tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>Done.';
    const output = fmt.push(input);
    strictEqual(output, "Let me check.\n  [bash] Done.");
  });

  it("handles tool_call split across chunks", () => {
    const fmt = new StreamFormatter();
    let out = fmt.push("text<tool_");
    out += fmt.push('call>{"name":"read","argu');
    out += fmt.push('ments":{}}</tool_call>after');
    strictEqual(out, "text\n  [read] after");
  });

  it("handles unknown JSON in tool_call gracefully", () => {
    const fmt = new StreamFormatter();
    const out = fmt.push("<tool_call>not json</tool_call>ok");
    strictEqual(out, "  [not json] ok");
  });

  it("extracts name from tool key in JSON", () => {
    const fmt = new StreamFormatter();
    const out = fmt.push('<tool_call>{"tool":"memory","input":{}}</tool_call>ok');
    strictEqual(out, "  [memory] ok");
  });

  it("extracts name from first line when not JSON", () => {
    const fmt = new StreamFormatter();
    const out = fmt.push('<tool_call>\nbash\n{"command":"ls"}\n</tool_call>ok');
    strictEqual(out, "  [bash] ok");
  });
});

describe("StreamFormatter - tool_use tags", () => {
  it("handles tool_use open/close tags", () => {
    const fmt = new StreamFormatter();
    const input = 'text<tool_use>{"name":"read"}</tool_use>after';
    strictEqual(fmt.push(input), "text\n  [read] after");
  });
});

describe("StreamFormatter - tool_result filtering", () => {
  it("replaces tool_result block with done indicator", () => {
    const fmt = new StreamFormatter();
    const input = "<tool_result>some output here</tool_result>After.";
    const output = fmt.push(input);
    strictEqual(output, "done\nAfter.");
  });

  it("handles tool_result split across chunks", () => {
    const fmt = new StreamFormatter();
    let out = fmt.push("before<tool_res");
    out += fmt.push("ult>output</tool_result>");
    out += fmt.flush();
    strictEqual(out, "beforedone\n");
  });
});

describe("StreamFormatter - tool_response filtering", () => {
  it("replaces tool_response block with done indicator", () => {
    const fmt = new StreamFormatter();
    const input = "<tool_response>some output here</tool_response>After.";
    strictEqual(fmt.push(input), "done\nAfter.");
  });

  it("handles tool_response split across chunks", () => {
    const fmt = new StreamFormatter();
    let out = fmt.push("before<tool_resp");
    out += fmt.push("onse>long result text</tool_response>after");
    strictEqual(out, "beforedone\nafter");
  });
});

describe("StreamFormatter - combined tool_call + tool_response", () => {
  it("handles full tool cycle inline", () => {
    const fmt = new StreamFormatter();
    const input =
      "Let me check." +
      '<tool_call>{"name":"bash","arguments":{"command":"ls"}}</tool_call>' +
      "<tool_response>file1.txt\nfile2.txt</tool_response>" +
      "Found 2 files.";
    const output = fmt.push(input);
    strictEqual(output, "Let me check.\n  [bash] done\nFound 2 files.");
  });

  it("handles multiple tool cycles", () => {
    const fmt = new StreamFormatter();
    let out = fmt.push('<tool_call>{"name":"read"}</tool_call>');
    out += fmt.push("<tool_response>content</tool_response>");
    out += fmt.push('B<tool_call>{"name":"write"}</tool_call>');
    out += fmt.push("<tool_response>ok</tool_response>C");
    strictEqual(out, "  [read] done\nB\n  [write] done\nC");
  });

  it("handles mixed tag types (tool_call + tool_result)", () => {
    const fmt = new StreamFormatter();
    const input =
      '<tool_call>{"name":"bash"}</tool_call>' + "<tool_result>result</tool_result>done.";
    strictEqual(fmt.push(input), "  [bash] done\ndone.");
  });
});

describe("StreamFormatter - partial tag buffering", () => {
  it("holds back potential partial tag at end of chunk", () => {
    const fmt = new StreamFormatter();
    const out1 = fmt.push("hello<tool");
    strictEqual(out1, "hello");

    const out2 = fmt.push('_call>{"name":"test"}</tool_call>bye');
    strictEqual(out2, "\n  [test] bye");
  });

  it("releases non-tag angle bracket", () => {
    const fmt = new StreamFormatter();
    const out1 = fmt.push("a < b");
    const out2 = fmt.push(" and c > d");
    const flushed = fmt.flush();
    strictEqual(out1 + out2 + flushed, "a < b and c > d");
  });
});

describe("StreamFormatter - flush", () => {
  it("flushes held-back partial tag prefix", () => {
    const fmt = new StreamFormatter();
    const out = fmt.push("trailing<tool");
    strictEqual(out, "trailing");
    strictEqual(fmt.flush(), "<tool");
  });

  it("returns empty when nothing buffered", () => {
    const fmt = new StreamFormatter();
    fmt.push("all drained");
    strictEqual(fmt.flush(), "");
  });

  it("discards incomplete tag body on flush", () => {
    const fmt = new StreamFormatter();
    fmt.push("text<tool_call>incomplete body");
    strictEqual(fmt.flush(), "");
  });
});
