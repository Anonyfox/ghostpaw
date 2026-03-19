import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import type { SkillFragmentInfo } from "../../shared/trainer_types.ts";
import { FragmentTile } from "./fragment_tile.tsx";

const pending: SkillFragmentInfo = {
  id: 1,
  source: "quest",
  sourceId: "q-1",
  observation: "Retry pattern worked after 3 attempts on deployment",
  domain: "deployment",
  status: "pending",
  consumedBy: null,
  createdAt: Math.floor(Date.now() / 1000) - 3600,
};

const absorbed: SkillFragmentInfo = {
  ...pending,
  id: 2,
  status: "absorbed",
  consumedBy: "deploy-vercel",
};

describe("FragmentTile", () => {
  it("renders pending fragment with source badge and observation", () => {
    const html = render(<FragmentTile fragment={pending} />);
    ok(html.includes("Quest"));
    ok(html.includes("Retry pattern"));
    ok(html.includes("deployment"));
    ok(html.includes("pending"));
  });

  it("renders absorbed fragment with consumed-by link", () => {
    const html = render(<FragmentTile fragment={absorbed} />);
    ok(html.includes("deploy-vercel"));
    ok(html.includes("absorbed") || html.includes("deploy-vercel"));
  });

  it("applies dimmed opacity for absorbed fragments", () => {
    const html = render(<FragmentTile fragment={absorbed} />);
    ok(html.includes("opacity: 0.6"));
  });

  it("shows relative age", () => {
    const html = render(<FragmentTile fragment={pending} />);
    ok(html.includes("1h"));
  });
});
