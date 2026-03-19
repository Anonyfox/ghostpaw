import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { activeSearchProvider } from "./active_search.ts";

const SEARCH_KEYS = ["BRAVE_API_KEY", "TAVILY_API_KEY", "SERPER_API_KEY"];
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const k of SEARCH_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of SEARCH_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("activeSearchProvider", () => {
  it("returns null when no search keys are set", () => {
    strictEqual(activeSearchProvider(), null);
  });

  it("returns Brave when BRAVE_API_KEY is set", () => {
    process.env.BRAVE_API_KEY = "BSAtest";
    const result = activeSearchProvider();
    strictEqual(result?.canonical, "BRAVE_API_KEY");
    strictEqual(result?.label, "Brave Search");
  });

  it("returns Tavily when TAVILY_API_KEY is set", () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    strictEqual(activeSearchProvider()?.canonical, "TAVILY_API_KEY");
  });

  it("returns Serper when SERPER_API_KEY is set", () => {
    process.env.SERPER_API_KEY = "serp-test";
    strictEqual(activeSearchProvider()?.canonical, "SERPER_API_KEY");
  });

  it("Brave takes priority over Tavily", () => {
    process.env.BRAVE_API_KEY = "BSAtest";
    process.env.TAVILY_API_KEY = "tvly-test";
    strictEqual(activeSearchProvider()?.canonical, "BRAVE_API_KEY");
  });

  it("Tavily takes priority over Serper", () => {
    process.env.TAVILY_API_KEY = "tvly-test";
    process.env.SERPER_API_KEY = "serp-test";
    strictEqual(activeSearchProvider()?.canonical, "TAVILY_API_KEY");
  });

  it("Brave takes priority over all others", () => {
    process.env.BRAVE_API_KEY = "BSAtest";
    process.env.TAVILY_API_KEY = "tvly-test";
    process.env.SERPER_API_KEY = "serp-test";
    strictEqual(activeSearchProvider()?.canonical, "BRAVE_API_KEY");
  });
});
