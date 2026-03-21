# Quest Faculty Retired

The local standalone rewrite in this folder has been retired.

Quest work now lives in the dedicated external package and repository:

- repo: [GhostPawJS/questlog](https://github.com/GhostPawJS/questlog)
- package: `@ghostpaw/questlog`

That package supersedes this local faculty rewrite and already carries the standalone domain model, documentation, tools, skills, and soul surface.

## Reintegration Note

When Ghostpaw is ready to plug quests back in, it should wire them back from
`@ghostpaw/questlog` directly instead of recreating a second internal quest
engine here.

The intended return path is:

- use thin Ghostpaw-side wrappers over Questlog's exported `tools`, `skills`,
  and `soul` fragments
- use Questlog's direct `read` and `write` domain surface as the quest truth
- rely on Questlog's built-in derived state calculations and WoW-style marker
  formatting semantics such as `!` and `?`
- define concrete reward payloads there directly, including Ghostpaw-specific
  reward kinds like XP, skill shards, and similar outputs, since the package
  supports generic reward attachment and claiming at any time in the lifecycle

Questlog is also heavily tested and intended to be the airtight standalone
system of record for this domain.

Once the remaining faculties are extracted similarly, Ghostpaw should consume the external package instead of reviving a second local quest faculty copy here.
