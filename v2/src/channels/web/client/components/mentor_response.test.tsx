import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { MentorResponse } from "./mentor_response.tsx";

describe("MentorResponse", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders content text", () => {
    render(
      <MentorResponse
        content="The soul is performing well."
        succeeded={true}
        cost={{ totalUsd: 0.03 }}
        onClose={() => {}}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("performing well"));
  });

  it("shows cost formatted to cents", () => {
    render(
      <MentorResponse
        content="Report"
        succeeded={true}
        cost={{ totalUsd: 0.03 }}
        onClose={() => {}}
      />,
      dom.container,
    );
    assert.ok(dom.container.textContent?.includes("$0.03"));
  });

  it("shows success badge when succeeded", () => {
    render(
      <MentorResponse content="Good" succeeded={true} cost={{ totalUsd: 0 }} onClose={() => {}} />,
      dom.container,
    );
    const badge = dom.container.querySelector(".badge.bg-success");
    assert.ok(badge);
    assert.ok(badge!.textContent?.includes("Success"));
  });

  it("shows failure badge when not succeeded", () => {
    render(
      <MentorResponse
        content="Error"
        succeeded={false}
        cost={{ totalUsd: 0 }}
        onClose={() => {}}
      />,
      dom.container,
    );
    const badge = dom.container.querySelector(".badge.bg-danger");
    assert.ok(badge);
    assert.ok(badge!.textContent?.includes("Failed"));
  });

  it("fires onClose when close button is clicked", () => {
    const fn = mock.fn();
    render(
      <MentorResponse content="Text" succeeded={true} cost={{ totalUsd: 0 }} onClose={fn} />,
      dom.container,
    );
    const btn = Array.from(dom.container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Close"),
    );
    btn!.click();
    assert.strictEqual(fn.mock.callCount(), 1);
  });
});
