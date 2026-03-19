import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { SessionDetail } from "./session_detail.tsx";

describe("SessionDetail", () => {
  it("exports a function component", () => {
    ok(typeof SessionDetail === "function");
  });
});
