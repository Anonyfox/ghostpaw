import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "preact-render-to-string";
import { SkillDetailModal } from "./skill_detail_modal.tsx";

describe("SkillDetailModal", () => {
  it("renders offcanvas with skill name", () => {
    const html = render(
      <SkillDetailModal skillName="deploy" onClose={() => {}} onTrain={() => {}} />,
    );
    ok(html.includes("offcanvas"));
    ok(html.includes("deploy"));
  });

  it("shows loading state initially", () => {
    const html = render(
      <SkillDetailModal skillName="deploy" onClose={() => {}} onTrain={() => {}} />,
    );
    ok(html.includes("Loading skill details"));
  });

  it("renders close button", () => {
    const html = render(
      <SkillDetailModal skillName="deploy" onClose={() => {}} onTrain={() => {}} />,
    );
    ok(html.includes("btn-close"));
  });
});
