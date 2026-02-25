# Costs

Ghostpaw tracks every dollar it spends, shows you where it goes, and lets you set a hard limit that cannot be exceeded. Set a daily budget, see a live breakdown by model and day, and know that the agent will stop itself before it overspends. No surprises. No $200 mornings.

## The Fear

AI agents have a reputation for burning money. OpenClaw users report $200 days from runaway loops, $3,600 months from context accumulation, and the occasional $6,000 overnight session that ran while they slept. The pattern is always the same: the tool has an API key, the key has a credit card, and nothing in between says "stop."

Most agent tools treat cost as your problem. Check your provider dashboard. Set a soft limit on the billing page. Hope nothing spirals between checks. The dashboard updates hourly. The spiral takes minutes.

Ghostpaw doesn't leave this to hope.

## What You Get

**A spend limit.** Set `maxCostPerDay` in `config.json` or adjust it live from the web UI's Costs page. When the rolling 24-hour spend reaches that number, every new LLM call is blocked — chat, delegation, scouting, all of it. The agent tells you plainly: "Spend limit reached. Adjust in Settings > Costs." Raise the limit or wait for old costs to age out of the window.

**A rolling window.** The limit runs against the last 24 hours, not since midnight. This matters. A midnight-reset design lets you spend $4.90 at 11:58 PM and $5.00 at 12:01 AM — $9.90 in three minutes with no alarm. A rolling window makes that impossible.

**Real numbers.** Every LLM call records the provider-reported token count and cost. Not a character-length estimate. Not a guess. The actual usage data from the API response, priced with up-to-date per-model rates. When the Costs page says you spent $2.47 today, that's what you spent.

**A live dashboard.** The Costs page shows total spend, spend per model, spend per day, percentage of your limit consumed, and a color-coded gauge. Green under 50%. Yellow to 80%. Red above. If you're blocked, a banner says so.

## How Enforcement Works

The guard checks *before* the LLM call, not after. If you're over the limit, the request never reaches the provider. Three layers:

- **Chat** — every `run()` and `stream()` call checks the guard before preparing the prompt.
- **Delegation** — the delegate tool checks before spawning a sub-agent. A parent can't bypass the limit by farming work to children.
- **Error surface** — when blocked, a clear `SpendLimitError` propagates through the conversation. No silent failures, no cryptic stack traces.

In-flight operations aren't interrupted. If a streaming response or background delegation is already running, it completes. Killing it mid-stream wastes the tokens already spent and leaves the conversation broken. The guard prevents new calls, not existing ones.

## Setting the Limit

**From the web UI:** Open the Costs page. Enter a dollar amount. Save. Immediate.

**From config:**

```json
{
  "costControls": {
    "maxTokensPerSession": 200000,
    "maxTokensPerDay": 1000000,
    "warnAtPercentage": 80,
    "maxCostPerDay": 5.00
  }
}
```

`0` means unlimited. The guard is disabled entirely — zero overhead.

**How much is enough?** Start at $2–5/day for moderate interactive use. Heavy delegation or premium models (Claude Opus, GPT-4.5) can burn $10–20/day. The Costs page shows your actual pattern — set the limit based on what you observe, then leave headroom.

The token-based limits (`maxTokensPerSession`, `maxTokensPerDay`) still work independently. They prevent context blowup within a single session. The dollar limit catches aggregate cost across everything — chat, delegation, system operations, all of it.

## What Gets Tracked

Every LLM interaction in Ghostpaw creates a run record with provider-reported tokens, model name, and estimated cost. This covers:

- Chat turns (user conversations)
- Delegated tasks (sub-agent work)
- Soul refinement (discover + apply phases)
- Scout friction mining
- Session absorption during training

Nothing is invisible. The Costs page reflects all of it. When you see "$1.20 on claude-sonnet-4-20250514, 3 runs" — that's three actual API calls to that model, costed at Anthropic's real rates.

## For Contributors

The implementation lives in `src/core/cost-guard.ts` — a standalone module with no side effects. All functions take a raw SQLite handle for easy testing with `:memory:` databases.

- **`isSpendBlocked(sqlite, limitUsd, windowMs?)`** — the gate. Returns `false` when limit is 0.
- **`getSpendStatus(sqlite, limitUsd, windowMs?)`** — spent, limit, remaining, percentage, isBlocked. Drives the UI.
- **`getSpendBreakdown(sqlite, limitUsd, windowMs?)`** — full breakdown by model and day. Powers the Costs page.
- **`createCostGuard(sqlite, limitUsd)`** — injectable interface with `isBlocked()` and `status()`, passed to the agent loop and delegate tool at construction time.

`SpendLimitError` in `src/lib/errors.ts` carries `spent` and `limit` fields so channels can render a useful message.

Tests cover empty databases, sliding window behavior, at-limit blocking, disabled-guard pass-through, model grouping, and day grouping. 18 tests, all against in-memory SQLite.
