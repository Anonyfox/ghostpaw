import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { MemoryAddForm } from "./memory_add_form.tsx";

describe("MemoryAddForm", () => {
  it("renders the form with source radio buttons", () => {
    const html = render(<MemoryAddForm onCreated={() => {}} onCancel={() => {}} />);
    ok(html.includes("Direct statement"));
    ok(html.includes("Observed behavior"));
    ok(html.includes("Picked up in conversation"));
    ok(html.includes("Inferred"));
  });

  it("renders category radio buttons", () => {
    const html = render(<MemoryAddForm onCreated={() => {}} onCancel={() => {}} />);
    ok(html.includes("Preference"));
    ok(html.includes("Fact"));
    ok(html.includes("Procedure"));
    ok(html.includes("Capability"));
    ok(html.includes("Custom"));
  });

  it("renders submit button", () => {
    const html = render(<MemoryAddForm onCreated={() => {}} onCancel={() => {}} />);
    ok(html.includes("Remember"));
  });

  it("renders cancel button", () => {
    const html = render(<MemoryAddForm onCreated={() => {}} onCancel={() => {}} />);
    ok(html.includes("Cancel"));
  });
});
