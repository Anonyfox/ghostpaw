import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToString } from "preact-render-to-string";
import { TrainerOptionsPicker } from "./trainer_options_picker.tsx";

const noop = () => {};

const sampleOptions = [
  { id: "1", title: "Add retry logic", description: "Handle transient failures gracefully" },
  { id: "2", title: "Expand edge cases", description: "Cover timeout and auth errors" },
];

describe("TrainerOptionsPicker", () => {
  it("renders all options as list items", () => {
    const html = renderToString(
      <TrainerOptionsPicker
        options={sampleOptions}
        onPick={noop}
        onCustom={noop}
        onCancel={noop}
      />,
    );
    ok(html.includes("Add retry logic"));
    ok(html.includes("Expand edge cases"));
    ok(html.includes("Handle transient failures"));
  });

  it("renders option badges with IDs", () => {
    const html = renderToString(
      <TrainerOptionsPicker
        options={sampleOptions}
        onPick={noop}
        onCustom={noop}
        onCancel={noop}
      />,
    );
    ok(html.includes(">1<"));
    ok(html.includes(">2<"));
  });

  it("renders custom guidance textarea", () => {
    const html = renderToString(
      <TrainerOptionsPicker
        options={sampleOptions}
        onPick={noop}
        onCustom={noop}
        onCancel={noop}
      />,
    );
    ok(html.includes("describe your own direction"));
  });

  it("renders cancel button", () => {
    const html = renderToString(
      <TrainerOptionsPicker
        options={sampleOptions}
        onPick={noop}
        onCustom={noop}
        onCancel={noop}
      />,
    );
    ok(html.includes("Cancel"));
  });

  it("renders with empty options", () => {
    const html = renderToString(
      <TrainerOptionsPicker options={[]} onPick={noop} onCustom={noop} onCancel={noop} />,
    );
    strictEqual(typeof html, "string");
    ok(html.includes("describe your own direction"));
  });
});
