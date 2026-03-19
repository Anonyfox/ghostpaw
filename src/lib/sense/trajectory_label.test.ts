import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { trajectoryLabel } from "./trajectory_label.ts";

describe("trajectoryLabel", () => {
  it("returns STATIONARY for speed < 0.05", () => {
    strictEqual(trajectoryLabel(0), "STATIONARY");
    strictEqual(trajectoryLabel(0.04), "STATIONARY");
  });

  it("returns DRIFTING for speed in [0.05, 0.15)", () => {
    strictEqual(trajectoryLabel(0.05), "DRIFTING");
    strictEqual(trajectoryLabel(0.14), "DRIFTING");
  });

  it("returns MOVING for speed in [0.15, 0.35)", () => {
    strictEqual(trajectoryLabel(0.15), "MOVING");
    strictEqual(trajectoryLabel(0.34), "MOVING");
  });

  it("returns RAPID for speed >= 0.35", () => {
    strictEqual(trajectoryLabel(0.35), "RAPID");
    strictEqual(trajectoryLabel(1.0), "RAPID");
  });
});
