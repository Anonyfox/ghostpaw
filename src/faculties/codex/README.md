# Codex Faculty Retired

The local standalone rewrite for this faculty has been retired.

Codex work now lives in the dedicated external package and repository:

- repo: [GhostPawJS/codex](https://github.com/GhostPawJS/codex)
- package: `@ghostpaw/codex`

That package supersedes the local rewrite and already carries the standalone
domain model, documentation, direct `read` / `write` API, and additive
`tools` / `skills` / `soul` runtime.

## Reintegration Note

When Ghostpaw is ready to plug beliefs back in, it should wire them back from
`@ghostpaw/codex` directly instead of recreating a second internal memory
engine here.

The intended return path is:

- use Codex's direct `read` and `write` surface as the source of truth for
  beliefs, certainty, evidence, provenance, decay, revision lineage, proximity,
  dismissals, flags, and portfolio health
- use thin Ghostpaw-side wrappers over Codex's exported `tools`, `skills`, and
  `soul` fragments instead of reauthoring parallel local surfaces
- rely on Codex's built-in derived mechanics for freshness, strength tiers,
  review priority, integrity, hybrid recall (FTS5 + trigram cosine), automatic
  proximity detection on write, and flag computation at read time
- keep the same runtime assumptions: Node 24+, built-in `node:sqlite`, and zero
  runtime dependencies

Codex is also heavily tested and intended to be the airtight standalone system
of record for this domain.

Once the remaining faculties are extracted similarly, Ghostpaw should consume
the external package instead of reviving a second local codex faculty copy here.
