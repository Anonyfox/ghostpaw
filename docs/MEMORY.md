# Memory

Ghostpaw remembers things. Not in the vague sense of "context window" — actually remembers, across sessions, across restarts, across months. When you correct a preference on Monday, it sticks on Friday. When you tell it your stack once, it doesn't ask again.

This isn't a novelty feature. It's the difference between an agent that knows you and one that meets you fresh every time.

## What It Feels Like

You open a conversation. You ask about concert tickets. Ghostpaw already knows your favorite bands, your city, the year — because you mentioned them weeks ago and it absorbed those facts. No preamble. No "could you remind me of your preferences?" Just the answer, informed by everything it's learned.

Behind that: a `memory recall` call happened before the agent even started drafting its response. It searched your memories by meaning, found the relevant ones, and folded them into its thinking. Automatic. Transparent. You didn't ask for it — it just knows.

## How Memories Get In

Three paths, all converging to the same local database:

**Explicit.** You say "remember that I prefer tabs." The agent calls `memory remember` and stores it.

**Agent-initiated.** During a conversation, the agent notices something worth keeping — a correction, a preference, a working approach — and stores it on its own. The system prompt encourages this: capture non-obvious learnings proactively.

**Training absorption.** `ghostpaw train` processes past conversations in bulk. An LLM extracts key learnings from each session — corrections, discoveries, preferences — and stores them as memories. This catches things the agent missed live.

## How Recall Works

When you ask a question, the agent automatically searches memory for relevant context. No explicit trigger needed. The system prompt tells it: before answering questions or making decisions where past context could matter, recall first.

The search isn't keyword matching. It's similarity-based — your query and each memory are projected into the same vector space, and the closest matches surface. Ask about "pizza toppings" and a memory about "prefers hollandaise over tomato sauce" comes back, even though the words barely overlap.

Results are ranked by a blend of **relevance** and **recency**. A correction from yesterday outranks a vaguely similar memory from three months ago. The math is simple: 85% similarity score, 15% recency decay over 30 days. Recent and relevant wins. Old but highly relevant still surfaces. Old and vaguely relevant drops off.

Only the best matches come back — typically 5–10 results above a quality threshold. The agent never bulk-loads your entire memory. It's a focused retrieval, proportional to what's actually useful.

## Where It Lives

Everything is in `ghostpaw.db` — a single SQLite file in your workspace. Your memories never leave your machine. No cloud sync, no vector database service, no API calls for storage or retrieval.

SQLite ships with Node.js (since v22) as `node:sqlite`. No native addons, no build step, no Docker layer for a database driver. It's just there. WAL mode gives concurrent reads during writes. ACID transactions guarantee that a crash mid-training doesn't leave half-written memories and orphaned sessions. The entire persistence layer is ~200 lines.

This matters more than it sounds. Heavyweight vector databases (Pinecone, Weaviate, Qdrant) solve a real problem — but for a personal agent with hundreds to low thousands of memories, they're infrastructure overkill. SQLite with in-process vector math handles this workload in single-digit milliseconds with zero operational burden.

## The Embedding

Memories are embedded using character trigram hashing — a deterministic, local function that projects text into a 256-dimensional vector. No neural network. No API call. No model download. Pure math: hash overlapping three-character slices with FNV-1a, accumulate signed contributions, L2-normalize.

This is deliberately less powerful than a transformer embedding. It captures word-level and short-phrase similarity, not deep semantic relationships. "User prefers JavaScript" will match a query about "JS preference" but probably won't match "what programming language does the user like."

The tradeoff is worth it. Neural embeddings require either an API call (latency, cost, privacy) or a local model (hundreds of MB, startup time). Trigram hashing runs in microseconds, works offline, produces stable vectors that never change with model updates, and is plenty accurate for the recall patterns an agent actually needs — matching corrections, preferences, facts, and procedures against natural-language queries.

If your memory corpus grows to tens of thousands and you need deeper semantic matching, swapping in a neural embedding provider is a one-function change (`createEmbeddingProvider` in `src/lib/embedding.ts`). The rest of the pipeline — storage, search, ranking — doesn't care where the vectors came from.

## The Lifecycle

```
conversation → agent notices something → memory remember → stored
                                                             │
ghostpaw train → absorb unprocessed sessions ────────────────┘
                                                             │
conversation → agent auto-recalls ← memory recall ← search ─┘
```

Memories accumulate through use and training. They inform every conversation through automatic recall. Training crystallizes them into skills (procedural knowledge). The cycle compounds: more use → more memories → better recall → better responses → the agent captures more nuance → more memories.

## For Contributors

The implementation spans three files:

- **`src/core/memory.ts`** — `MemoryStore` interface and SQLite implementation. Store, search, count, delete. Search does two-phase retrieval: score all embeddings first (lightweight BLOB scan), then hydrate only the winners with full content.
- **`src/lib/embedding.ts`** — The trigram hash embedding. `createEmbeddingProvider()` returns `{ embed, embedMany }`. Swap this to change the embedding strategy.
- **`src/lib/vectors.ts`** — Vector math utilities: cosine similarity, buffer serialization, top-K selection.
- **`src/tools/memory.ts`** — The agent-facing tool. Four actions: remember, recall, forget, history. Recall uses `k: 10, minScore: 0.3` with recency weighting.

Search parameters: top 10 results, minimum blended score 0.3 (filters noise), 15% recency weight (30-day decay). These defaults balance precision against coverage for automatic recall — tight enough that the agent doesn't pollute its context with tangential matches, loose enough that relevant history surfaces reliably.

Memory storage is transactional during training: all memories extracted from a session plus the session's "absorbed" flag are committed in a single SQLite transaction. A crash mid-absorption rolls back cleanly — no duplicates, no orphans.

Tests cover similarity scoring, recency blending, transaction atomicity, the full recall pipeline, and edge cases (empty memory, no matches, exact duplicates). Run `npm test` — the memory suite is comprehensive.
