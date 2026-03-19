# Features — Core Subsystems

Ghostpaw's features are engineered subsystems — not plugins, not extensions, not skills thrown together ad-hoc. Each is a distinct module that uniquely improves what the LLM can do, how well it does it, and how fast it learns. Together they form a harness that compounds: ghostpaw on day 100 is qualitatively different from day 1, independent of underlying model improvements.

Every subsystem in this folder exists because it passed the same bar. If it can't clearly demonstrate value across all four dimensions below AND meet all six quality criteria, it doesn't belong here.

## The Four Value Dimensions

Every subsystem must deliver value across all four. A module that only serves one dimension is incomplete. A module that serves none in a dimension should be absorbed into another or doesn't justify its existence.

### Direct — The User Gets Obvious Value

The user interacts with the subsystem through all channels — chat first, but also web UI, TUI, CLI, notifications, whatever channels exist. The value is obvious. The user understands what it does and why it's useful without explanation. The UI/UX is optimized for each channel: fast, clear, zero friction.

A subsystem that only benefits ghostpaw internally but gives the user nothing visible is infrastructure, not a feature. Infrastructure belongs in the kernel. Features live here because users want them.

### Active — Ghostpaw Has Explicit Reasons to Delegate

The main soul has clear, unambiguous reasons to delegate to this subsystem's managing soul. It is obvious *when* to call, *what* to ask for, and *why* the answer matters. The subsystem provides real value to ghostpaw itself — information, capabilities, or judgments the main soul cannot produce alone.

If the main soul never has a reason to ask the subsystem anything, the subsystem is either not useful or its value is delivered through other channels only. Both are warning signs.

### Passive — Transparent Ongoing Improvement

Ongoing usage of the subsystem builds up capabilities that transparently improve the way ghostpaw works — shaping, tuning, and enhancing main chat sessions permanently without explicit delegation. This includes:

- Prompt tuning (preambles, calibration coefficients, operational principles)
- Tool calling optimizations (routing tables, confidence thresholds)
- Interactive content pools to draw from intelligently (codex entries, patterns)
- Behavioral shaping through accumulated evidence

The user never triggers these improvements. They happen as a side effect of the subsystem doing its job. Ghostpaw gets better because the subsystem exists, even when nobody asks it anything.

### Synergies — Mechanical Cross-System Integration

Every subsystem's core module exposes direct function interfaces that other subsystems may call as hardcoded wiring — pure code, no LLM calls in between. These integrations enhance other modules mechanically:

- Graceful fallbacks when the code API returns empty, useless, or wrong results
- Pure code checks, no LLM token spend for cross-system queries
- Typed interfaces with clear contracts
- Fail-open by default: if a synergy call fails, the calling subsystem continues degraded but functional

The synergy layer is what makes the whole greater than the sum of parts. But it must be mechanical, not orchestrated — no coordinator or LLM sits between subsystem function calls.

## Quality Criteria

Every subsystem must meet all six at all times. These are not aspirational. They are mandatory.

### 1. Scientifically Grounded

Every important design decision must trace to published research, validated mechanisms, or empirically measured outcomes. Not hunches. Not "seems like a good idea." Many well-intentioned systems make the overall harness actively *worse* — slower, bloated, misleading, or creating overhead that exceeds the value they produce.

The respective feature document must cite the specific research backing each major mechanism. If a mechanism cannot be grounded, it is flagged as experimental with explicit evaluation criteria for whether it earns its place.

### 2. Fast, Efficient, Minimal

The code must minimize RAM and CPU demands. LLM token needs in context windows must be managed intelligently — less context that's better selected beats more context every time. Specific requirements:

- Pure code paths wherever possible (calibration tables, routing decisions, synergy calls)
- LLM calls only when genuine reasoning is required
- Deliberate unit tests for each sub-capability ensuring correctness including graceful fallbacks
- Context window budgets explicitly defined per artifact type
- No unbounded growth — every data structure has compression, decay, or pruning

### 3. Self-Healing

Bad situations must be fixable without human intervention. Corrupted data, overfitting to early observations, stale calibrations, drifting baselines, accumulating attribution bias — all must have automated correction mechanisms:

- Periodic re-derivation from raw evidence (annealing)
- Anomaly detection on own outputs
- Confidence decay on unvalidated entries
- Rollback capability for recent changes
- The subsystem must detect when it is making things *worse* and back off

Self-healing is not optional robustness. It is a core design requirement. A subsystem that can silently degrade ghostpaw without detection is a liability.

### 4. Unique and Distinct

Each subsystem must be unique with essentially zero overlap in what it stores, what it produces, and what questions it answers. The product and feature architecture stays clean and explainable because every module has a one-sentence answer to "what does this do that nothing else does?"

If two subsystems store similar data or answer similar questions, one absorbs the other or they are redesigned until the boundary is sharp. Ambiguous boundaries create routing confusion for both the LLM and the user.

### 5. Data Sovereignty

All data modifications — create, update, delete — must be routed through the managing soul of that subsystem. No side-channels. No direct SQL from other modules. No "just this once" shortcuts. The managing soul is the single authority ensuring data consistency, validation, and integrity for its domain.

Other subsystems may *read* through the synergy layer's code APIs (pure function calls, no LLM). But writes always go through the owner. This is what keeps data clean at scale — one authority per domain, no shared mutable state, no conflicting writers.

### 6. Graceful Cold Start

The subsystem must provide value from day 1, even if its full power takes weeks or months to develop. Empty tables, zero entries, no accumulated data — the system works, just less well. No subsystem gets a 30-day grace period where it's dead weight.

Specifically:
- Code APIs return sensible defaults when data is absent
- UX communicates what the subsystem will become, not just what it is now
- Early interactions seed the subsystem with high-value initial data
- Capabilities unlock naturally as data accumulates — not artificial gates, but genuine data requirements

## The Subsystems

Each document in this folder defines one feature subsystem specification: what it does, how it works,
the four value dimensions, quality criteria compliance, data contract, interfaces, and the research
grounding every major design decision.

These documents are feature contracts, not a guaranteed 1:1 mirror of `src/core/` folder names.
Most map directly to a core namespace. The exception is `SETTINGS.md`, the product umbrella over
`src/core/config`, `src/core/secrets`, and `src/core/schedule`.

| Subsystem | One-Line | Managing Soul |
|-----------|----------|---------------|
| [CHAT](./CHAT.md) | Omnichannel live execution, tool use, and the compounding session substrate | Ghostpaw |
| [SOULS](./SOULS.md) | Identity, personality, and behavioral evolution of each specialist | Mentor |
| [SKILLS](./SKILLS.md) | Reusable procedural knowledge as executable markdown | Trainer |
| [TRAIL](./TRAIL.md) | Longitudinal interpretation, calibration, and compounding intelligence | Historian |
| [MEMORY](./MEMORY.md) | Beliefs, facts, and semantic knowledge about the world | Warden |
| [QUESTS](./QUESTS.md) | Temporal commitment tracking, quest board, and structured temporal awareness | Warden |
| [PACK](./PACK.md) | Relationships, bonds, and multi-entity social memory | Warden |
| [SETTINGS](./SETTINGS.md) | Configuration, secrets, and scheduled operations | Chamberlain |

A single soul may manage multiple subsystems when their domains are conceptually linked and the combined cognitive load fits within what an LLM can handle reliably. This is a deliberate quality and performance optimization — fewer delegation calls at runtime, cleaner "what goes where" routing, and the managing soul builds richer cross-domain context within its specialization. Ghostpaw itself owns `CHAT` because live execution is the center the rest of the system orbits. Warden owns the data-and-productivity cluster (memory, quests, pack). Chamberlain owns the operational plumbing (settings, secrets, schedules). Mentor, Trainer, and Historian each manage a single high-complexity domain that demands full specialized attention.

Each subsystem must stand on its own AND multiply the others through the synergy layer.
