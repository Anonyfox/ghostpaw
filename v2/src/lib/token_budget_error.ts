export class TokenBudgetError extends Error {
  readonly scope: "session" | "day";
  readonly used: number;
  readonly limit: number;

  constructor(scope: "session" | "day", used: number, limit: number) {
    const usedStr = used.toLocaleString("en-US");
    const limitStr = limit.toLocaleString("en-US");
    const hint =
      scope === "session"
        ? "Start a new session or increase max_tokens_per_session in config."
        : "Wait for the 24h window to roll over or increase max_tokens_per_day in config.";
    super(
      `${scope === "session" ? "Session" : "Daily"} token limit reached (${usedStr} / ${limitStr}). ${hint}`,
    );
    this.name = "TokenBudgetError";
    this.scope = scope;
    this.used = used;
    this.limit = limit;
  }
}
