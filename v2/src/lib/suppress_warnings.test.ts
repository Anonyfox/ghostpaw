import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { suppressWarnings } from "./suppress_warnings.ts";

describe("suppressWarnings", () => {
  it("suppresses ExperimentalWarning events", () => {
    suppressWarnings();
    let received = false;
    const listener = () => {
      received = true;
    };
    process.on("warning", listener);
    try {
      process.emit("warning", Object.assign(new Error("test"), { name: "ExperimentalWarning" }));
      strictEqual(received, false);
    } finally {
      process.removeListener("warning", listener);
    }
  });

  it("suppresses punycode DeprecationWarning events", () => {
    suppressWarnings();
    let received = false;
    const listener = () => {
      received = true;
    };
    process.on("warning", listener);
    try {
      process.emit(
        "warning",
        Object.assign(new Error("The punycode module is deprecated"), {
          name: "DeprecationWarning",
        }),
      );
      strictEqual(received, false);
    } finally {
      process.removeListener("warning", listener);
    }
  });

  it("passes through non-suppressed warning events", () => {
    suppressWarnings();
    let received = false;
    const listener = () => {
      received = true;
    };
    process.on("warning", listener);
    try {
      process.emit("warning", Object.assign(new Error("something else"), { name: "SomeWarning" }));
      strictEqual(received, true);
    } finally {
      process.removeListener("warning", listener);
    }
  });

  it("passes through non-warning events", () => {
    suppressWarnings();
    let received = false;
    const listener = () => {
      received = true;
    };
    process.on("exit", listener);
    try {
      process.emit("exit", 0);
      strictEqual(received, true);
    } finally {
      process.removeListener("exit", listener);
    }
  });
});
