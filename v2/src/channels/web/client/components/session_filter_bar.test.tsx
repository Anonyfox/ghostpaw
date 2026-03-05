import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { SessionFilterBar } from "./session_filter_bar.tsx";

describe("SessionFilterBar", () => {
  it("exports a function component", () => {
    ok(typeof SessionFilterBar === "function");
  });

  it("renders with default props", () => {
    const noop = () => {};
    const el = SessionFilterBar({
      stats: null,
      channel: "",
      status: "",
      purpose: "",
      sort: "recent",
      search: "",
      onChannelChange: noop,
      onStatusChange: noop,
      onPurposeChange: noop,
      onSortChange: noop,
      onSearchChange: noop,
      onPrune: noop,
    });
    ok(el);
  });
});
