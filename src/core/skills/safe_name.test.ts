import { strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { assertSafeSkillName, isSafeSkillName } from "./safe_name.ts";

describe("isSafeSkillName", () => {
  it("accepts normal lowercase-hyphen names", () => {
    strictEqual(isSafeSkillName("deploy"), true);
    strictEqual(isSafeSkillName("skill-craft"), true);
    strictEqual(isSafeSkillName("my-great-skill"), true);
  });

  it("accepts names with uppercase (validation is separate from safety)", () => {
    strictEqual(isSafeSkillName("Deploy"), true);
  });

  it("rejects empty string", () => {
    strictEqual(isSafeSkillName(""), false);
  });

  it("rejects names starting with -", () => {
    strictEqual(isSafeSkillName("--force"), false);
    strictEqual(isSafeSkillName("-rf"), false);
  });

  it("rejects names containing ..", () => {
    strictEqual(isSafeSkillName("../../../etc"), false);
    strictEqual(isSafeSkillName("foo..bar"), false);
  });

  it("rejects names containing /", () => {
    strictEqual(isSafeSkillName("foo/bar"), false);
  });

  it("rejects names containing backslash", () => {
    strictEqual(isSafeSkillName("foo\\bar"), false);
  });
});

describe("assertSafeSkillName", () => {
  it("does not throw for safe names", () => {
    assertSafeSkillName("deploy");
    assertSafeSkillName("skill-craft");
  });

  it("throws for unsafe names with actionable message", () => {
    throws(() => assertSafeSkillName("--force"), /Unsafe skill name/);
    throws(() => assertSafeSkillName("../etc"), /Unsafe skill name/);
    throws(() => assertSafeSkillName(""), /Unsafe skill name/);
  });
});
