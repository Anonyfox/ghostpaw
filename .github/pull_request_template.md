## What

<!-- One sentence: what does this PR do? -->

## Why

<!-- Why is this change needed? Link to issue if applicable. -->

## Checklist

- [ ] `npm run check` passes (biome lint + typecheck)
- [ ] `npm run build` produces a working artifact
- [ ] No new runtime npm dependencies added without justification
- [ ] `node:sqlite` is only imported dynamically (`await import('node:sqlite')`)
- [ ] Shellcheck passes on any modified `.sh` files
