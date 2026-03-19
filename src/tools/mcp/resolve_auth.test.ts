import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { resolveHttpAuth, resolveStdioEnv } from "./resolve_auth.ts";

const secrets: Record<string, string> = {
  MY_TOKEN: "tok-abc123",
  API_KEY: "key-xyz",
};

function resolveSecret(name: string): string | null {
  return secrets[name] ?? null;
}

describe("resolveHttpAuth", () => {
  it("returns Bearer header when secret is found", () => {
    deepStrictEqual(resolveHttpAuth("MY_TOKEN", resolveSecret), {
      Authorization: "Bearer tok-abc123",
    });
  });

  it("returns undefined when secret is not found", () => {
    strictEqual(resolveHttpAuth("MISSING", resolveSecret), undefined);
  });

  it("returns undefined when authName is undefined", () => {
    strictEqual(resolveHttpAuth(undefined, resolveSecret), undefined);
  });

  it("returns undefined when authName is empty string", () => {
    strictEqual(resolveHttpAuth("", resolveSecret), undefined);
  });

  it("trims whitespace from authName", () => {
    deepStrictEqual(resolveHttpAuth("  MY_TOKEN  ", resolveSecret), {
      Authorization: "Bearer tok-abc123",
    });
  });
});

describe("resolveStdioEnv", () => {
  it("resolves a single secret as env var", () => {
    deepStrictEqual(resolveStdioEnv("MY_TOKEN", resolveSecret), {
      MY_TOKEN: "tok-abc123",
    });
  });

  it("resolves multiple comma-separated secrets", () => {
    deepStrictEqual(resolveStdioEnv("MY_TOKEN,API_KEY", resolveSecret), {
      MY_TOKEN: "tok-abc123",
      API_KEY: "key-xyz",
    });
  });

  it("skips missing secrets but includes found ones", () => {
    deepStrictEqual(resolveStdioEnv("MY_TOKEN,MISSING", resolveSecret), {
      MY_TOKEN: "tok-abc123",
    });
  });

  it("returns undefined when all secrets are missing", () => {
    strictEqual(resolveStdioEnv("MISSING,ALSO_MISSING", resolveSecret), undefined);
  });

  it("returns undefined when authNames is undefined", () => {
    strictEqual(resolveStdioEnv(undefined, resolveSecret), undefined);
  });

  it("skips empty segments in comma list", () => {
    deepStrictEqual(resolveStdioEnv("MY_TOKEN,,API_KEY,", resolveSecret), {
      MY_TOKEN: "tok-abc123",
      API_KEY: "key-xyz",
    });
  });

  it("trims whitespace from each name", () => {
    deepStrictEqual(resolveStdioEnv("  MY_TOKEN , API_KEY  ", resolveSecret), {
      MY_TOKEN: "tok-abc123",
      API_KEY: "key-xyz",
    });
  });
});
