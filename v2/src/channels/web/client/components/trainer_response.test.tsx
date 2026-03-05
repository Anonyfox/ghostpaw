import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { TrainerResponse } from "./trainer_response.tsx";

describe("TrainerResponse", () => {
  it("renders success badge and content", () => {
    const html = render(
      <TrainerResponse
        content="Trained 3 skills"
        succeeded={true}
        cost={{ totalUsd: 0.05 }}
        onClose={() => {}}
      />,
    );
    ok(html.includes("Success"));
    ok(html.includes("bg-success"));
    ok(html.includes("Trained 3 skills"));
    ok(html.includes("$0.05"));
  });

  it("renders failure badge when not succeeded", () => {
    const html = render(
      <TrainerResponse
        content="Error occurred"
        succeeded={false}
        cost={{ totalUsd: 0.01 }}
        onClose={() => {}}
      />,
    );
    ok(html.includes("Failed"));
    ok(html.includes("bg-danger"));
  });

  it("renders close button", () => {
    const html = render(
      <TrainerResponse
        content="done"
        succeeded={true}
        cost={{ totalUsd: 0 }}
        onClose={() => {}}
      />,
    );
    ok(html.includes("Close"));
  });
});
