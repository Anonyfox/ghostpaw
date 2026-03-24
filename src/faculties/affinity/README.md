# Affinity Faculty Retired

The local standalone rewrite for this faculty has been retired.

Affinity work now lives in the dedicated external package and repository:

- repo: [GhostPawJS/affinity](https://github.com/GhostPawJS/affinity)
- package: `@ghostpaw/affinity`

That package supersedes the local rewrite and already carries the standalone
domain model, documentation, direct `read` / `write` API, and additive
`tools` / `skills` / `soul` runtime.

## Reintegration Note

When Ghostpaw is ready to plug social CRM back in, it should wire it back from
`@ghostpaw/affinity` directly instead of recreating a second internal affinity
engine here.

The intended return path is:

- use Affinity's direct `read` and `write` surface as the source of truth for
  contacts, identities, links, events, dates, attributes, commitments, and
  merge lineage
- use thin Ghostpaw-side wrappers over Affinity's exported `tools`, `skills`,
  and `soul` fragments instead of reauthoring parallel local surfaces
- rely on Affinity's built-in derived mechanics and read models for rank,
  hidden affinity, trust, cadence, moments, radar, graph review, and duplicate
  reconciliation
- keep the same runtime assumptions: Node 24+, built-in `node:sqlite`, and zero
  runtime dependencies

Affinity is also heavily tested and intended to be the airtight standalone
system of record for this domain.

Once the remaining faculties are extracted similarly, Ghostpaw should consume
the external package instead of reviving a second local affinity faculty copy
here.
