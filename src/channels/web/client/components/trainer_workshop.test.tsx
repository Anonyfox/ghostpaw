import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { TrainerWorkshop } from "./trainer_workshop.tsx";

describe("TrainerWorkshop", () => {
  const base = {
    trainerAvailable: true,
    pendingChanges: 0,
    skills: [],
    onSkillsChanged: () => {},
  };

  it("renders workshop title", () => {
    const html = render(<TrainerWorkshop {...base} />);
    ok(html.includes("Workshop"));
  });

  it("renders two action cards (Create and Train)", () => {
    const html = render(<TrainerWorkshop {...base} />);
    ok(html.includes("Create"));
    ok(html.includes("Train"));
  });

  it("uses warning border when pending changes exist", () => {
    const html = render(<TrainerWorkshop {...base} pendingChanges={3} />);
    ok(html.includes("border-warning"));
  });

  it("uses info border when no pending changes", () => {
    const html = render(<TrainerWorkshop {...base} />);
    ok(html.includes("border-info"));
  });

  it("shows pending count on train card", () => {
    const html = render(<TrainerWorkshop {...base} pendingChanges={2} />);
    ok(html.includes("2 pending"));
  });

  it("shows settings link when trainer unavailable", () => {
    const html = render(<TrainerWorkshop {...base} trainerAvailable={false} />);
    ok(html.includes("Configure in Settings"));
  });
});
