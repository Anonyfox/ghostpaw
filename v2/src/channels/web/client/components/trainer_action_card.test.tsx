import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { TrainerActionCard } from "./trainer_action_card.tsx";

describe("TrainerActionCard", () => {
  const base = {
    title: "Train",
    description: "Review skills",
    buttonLabel: "Begin Training",
    disabled: false,
    active: false,
    onClick: () => {},
  };

  it("renders title and description", () => {
    const html = render(<TrainerActionCard {...base} />);
    ok(html.includes("Train"));
    ok(html.includes("Review skills"));
    ok(html.includes("Begin Training"));
  });

  it("active state shows info border", () => {
    const html = render(<TrainerActionCard {...base} active={true} />);
    ok(html.includes("border-info"));
  });

  it("ready variant shows warning border and button", () => {
    const html = render(<TrainerActionCard {...base} variant="ready" />);
    ok(html.includes("border-warning"));
    ok(html.includes("btn-warning"));
  });

  it("disabled state applies opacity", () => {
    const html = render(<TrainerActionCard {...base} disabled={true} />);
    ok(html.includes("opacity: 0.5"));
  });

  it("shows status text when provided", () => {
    const html = render(<TrainerActionCard {...base} statusText="3 pending" />);
    ok(html.includes("3 pending"));
  });
});
