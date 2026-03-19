import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { DistillStatusResponse } from "../../shared/distill_types.ts";
import { DistillBanner } from "./distill_banner.tsx";

describe("DistillBanner", () => {
  const noop = () => {};

  it("renders nothing when status is null", () => {
    const html = render(<DistillBanner status={null} onComplete={noop} />);
    strictEqual(html, "");
  });

  it("renders nothing when undistilledCount is 0", () => {
    const status: DistillStatusResponse = { undistilledCount: 0 };
    const html = render(<DistillBanner status={status} onComplete={noop} />);
    strictEqual(html, "");
  });

  it("shows count and Distill Now button when sessions pending", () => {
    const status: DistillStatusResponse = { undistilledCount: 3 };
    const html = render(<DistillBanner status={status} onComplete={noop} />);
    ok(html.includes("3"));
    ok(html.includes("undistilled session"));
    ok(html.includes("Distill Now"));
    ok(html.includes("border-info"));
  });

  it("shows singular form for 1 session", () => {
    const status: DistillStatusResponse = { undistilledCount: 1 };
    const html = render(<DistillBanner status={status} onComplete={noop} />);
    ok(html.includes("1"));
    ok(html.includes("undistilled session"));
    ok(!html.includes("sessions"));
  });

  it("shows descriptive subtitle text", () => {
    const status: DistillStatusResponse = { undistilledCount: 5 };
    const html = render(<DistillBanner status={status} onComplete={noop} />);
    ok(html.includes("Recent conversations not yet processed into memories."));
  });
});
