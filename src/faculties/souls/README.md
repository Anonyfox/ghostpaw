# Souls Faculty Retired

The local standalone rewrite for this faculty has been retired.

Souls work now lives in the dedicated external package and repository:

- repo: [GhostPawJS/souls](https://github.com/GhostPawJS/souls)
- package: `@ghostpaw/souls`

That package supersedes the local rewrite and already carries the standalone
domain model, documentation, direct `read` / `write` API, ether template
catalog, and additive `tools` / `skills` / `soul` runtime.

## Reintegration Note

When Ghostpaw is ready to plug cognitive identity back in, it should wire it
back from `@ghostpaw/souls` directly instead of recreating a second internal
souls engine here.

The intended return path is:

- use Souls' direct `read` and `write` surface as the source of truth for
  cognitive identity, traits, shards, evidence reports, crystallization
  readiness, level-up history, and rendered identity blocks
- use thin Ghostpaw-side wrappers over Souls' exported `tools`, `skills`, and
  `soul` fragments instead of reauthoring parallel local surfaces
- rely on Souls' built-in derived mechanics for crystallization gating,
  cluster-based evidence reports, shard-trait alignment, trait signals (tenure,
  staleness, citation density, essence redundancy, survival count), tension
  detection, consolidation/promotion suggestions, tag-based filtering, FTS5
  shard search, and citation-density trait ordering in rendered output
- use the ether catalog to discover and manifest souls from ~2,800 open-source
  system prompts with lazy fetch and ETag caching
- keep the same runtime assumptions: Node 24+, built-in `node:sqlite`, and zero
  runtime dependencies

Souls is also heavily tested and intended to be the airtight standalone system
of record for this domain.

Once the remaining faculties are extracted similarly, Ghostpaw should consume
the external package instead of reviving a second local souls faculty copy here.
