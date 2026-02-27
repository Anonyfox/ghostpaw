import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { render } from "preact";
import { createTestDOM } from "../create_test_dom.ts";
import { FeedbackAlert } from "./feedback_alert.tsx";

describe("FeedbackAlert", () => {
  let dom: ReturnType<typeof createTestDOM>;

  beforeEach(() => {
    dom = createTestDOM();
  });

  afterEach(() => {
    render(null, dom.container);
    dom.cleanup();
  });

  it("renders nothing when feedback is null", () => {
    render(<FeedbackAlert feedback={null} />, dom.container);
    assert.equal(dom.container.querySelector(".alert"), null);
  });

  it("renders success alert", () => {
    render(<FeedbackAlert feedback={{ type: "success", message: "OK" }} />, dom.container);
    const alert = dom.container.querySelector(".alert-success");
    assert.ok(alert);
    assert.equal(alert!.textContent, "OK");
  });

  it("renders danger alert", () => {
    render(<FeedbackAlert feedback={{ type: "danger", message: "Err" }} />, dom.container);
    const alert = dom.container.querySelector(".alert-danger");
    assert.ok(alert);
  });
});
