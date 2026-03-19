import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { invokeTrainer, invokeTrainerExecute, invokeTrainerPropose } from "./invoke_trainer.ts";

describe("invoke_trainer exports", () => {
  it("exports invokeTrainer as a function", () => {
    strictEqual(typeof invokeTrainer, "function");
  });

  it("exports invokeTrainerPropose as a function", () => {
    strictEqual(typeof invokeTrainerPropose, "function");
  });

  it("exports invokeTrainerExecute as a function", () => {
    strictEqual(typeof invokeTrainerExecute, "function");
  });

  it("invokeTrainerPropose has 3 required parameters", () => {
    strictEqual(invokeTrainerPropose.length >= 3, true);
  });

  it("invokeTrainerExecute has 4 required parameters", () => {
    strictEqual(invokeTrainerExecute.length >= 4, true);
  });
});
