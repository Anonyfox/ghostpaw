import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { TrainingGroundsPage } from "./training_grounds.tsx";

describe("TrainingGroundsPage", () => {
  it("exports a component function", () => {
    ok(typeof TrainingGroundsPage === "function");
  });

  it("has the expected name", () => {
    ok(TrainingGroundsPage.name === "TrainingGroundsPage");
  });
});
