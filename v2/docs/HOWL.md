# Howl — Agent-Initiated Targeted Messaging

## What It Is

A **howl** is the ghost reaching out because it genuinely needs to talk. Not to report. Not to summarize. To ask something it cannot answer alone, share curiosity about something fundamental, or raise an alarm about real danger.

The howl should feel like a companion tapping your shoulder with something worth discussing — playful, in-theme, and impossible to ignore. It invites true dialogue. If it doesn't make the user want to reply, it shouldn't have been sent.

## What It Isn't

- **Not spam.** Rate-limited: 3/day default, 60-minute cooldown between messages.
- **Not status updates.** "I merged your memories" is not a howl. "I found five memories saying different things about your backend stack — which version of you is the real one?" is.
- **Not summaries.** Never a recap of what happened during a haunt or any other session.
- **Not blocking.** The ghost sends and continues working. The user replies whenever. Could be minutes, could be days.
- **Always in voice.** Written playfully, as the companion — not as an assistant filing a report. The user should feel like their ghost has something genuinely interesting to discuss.

## Origins

Howls can originate from any context, but only for three reasons:

1. **Genuine question** — the ghost hit something it truly cannot resolve alone (not laziness, not convenience — actually stuck or facing a real ambiguity only the user can clarify)
2. **Fundamental curiosity** — something deeply interesting surfaced that the ghost wants to explore *with* the user, not *report to* them
3. **Critical alert** — real danger or a breaking change affecting Ghostpaw itself

## The Async Contract

1. Ghost creates a howl with a message and urgency level
2. The howl is delivered to the best available channel (Telegram, Web)
3. The ghost does **not** wait for a reply — it continues its current work
4. The user replies whenever (from any channel) or dismisses
5. The reply is injected into the origin session, then the warden consolidates the interaction (beliefs, pack bond, engagement pattern)
6. The howl is marked responded (or dismissed)

## Channel Routing

Channels register with a lightweight in-process registry on startup. The `howl` tool picks the best connected channel:

- If Telegram is connected and the user has been active there → Telegram
- Otherwise → stored for the Web UI (always shows pending howls)
- If no channels are connected → howl is stored but not delivered

The Web UI always displays all pending howls regardless of which channel delivered them. This ensures nothing gets lost.

## Cross-Channel Reconciliation

One howl, one origin session. Replies from any channel route to the same howl record.

1. Each howl targets ONE delivery channel (the best available)
2. Web always shows all pending howls
3. User reply from ANY channel resolves the howl
4. The reply is injected into the origin session as a user message (preserving the session record)
5. A warden consolidation system session processes the Q&A

Example: ghost howls on Telegram. User sees it on Web too and replies there. The reply is injected into the origin session with a channel annotation, and the warden extracts beliefs from it.

## Reply Processing

When a user replies to a howl (`processHowlReply` in `harness/howl/`):

1. The Q&A is injected into the origin session as a user message (after the howl's origin message)
2. A system session is created for warden consolidation (`system:howl-reply:{id}`)
3. The warden extracts beliefs, updates pack bond, and notes engagement patterns
4. Howl status updates to "responded"
5. The warden's brief summary is returned as the acknowledgment shown to the user

## Dismiss Processing

When a user dismisses a howl (`processHowlDismiss` in `harness/howl/`):

1. Howl status updates to "dismissed"
2. A system session is created for warden consolidation (`system:howl-dismiss:{id}`)
3. The warden notes the dismissal pattern — three dismissals on the same topic is stronger signal than one answer
4. Consolidation is best-effort — the status update persists even if warden invocation fails

## Urgency

Two levels:

- **low** (default): stored, mentioned on next interaction. Respects cooldown.
- **high**: delivered immediately to connected channels. Bypasses cooldown but not daily cap.

## Rate Limiting

- `max_howls_per_day` (config, default 3): hard daily cap
- `howl_cooldown_minutes` (config, default 60): minimum time between howls
- High-urgency howls bypass cooldown but not the daily cap
- The howl tool returns an error if limits are exceeded

## Data Model

```sql
howls (
  id                 INTEGER PRIMARY KEY,
  origin_session_id  INTEGER NOT NULL REFERENCES sessions(id),
  origin_message_id  INTEGER REFERENCES messages(id),   -- nullable for programmatic howls
  message            TEXT    NOT NULL,                   -- delivery payload (~1 sentence)
  urgency            TEXT    NOT NULL DEFAULT 'low',     -- low | high
  channel            TEXT,                               -- delivery channel used, or null
  status             TEXT    NOT NULL DEFAULT 'pending', -- pending | responded | dismissed
  created_at         INTEGER NOT NULL,
  responded_at       INTEGER
);
```

No dedicated howl session. The howl table is routing metadata with a delivery payload. Origin tracking (`origin_session_id`, `origin_message_id`) links back to where the howl was born. The `message` column is the delivery text — channels need it to send, the UI needs it to display, the CLI needs it to list.

## Integration with Haunting

- The `howl` tool is available during haunt sessions (coordinator-only — it's in `baseTools`, not `sharedTools`)
- Consolidation can emit howls: if a highlight is found, `runHaunt` creates one with `originSessionId` pointing to the haunt session
- The haunt framing mentions: "If you have a genuine question for the user, you can reach out — but they won't reply before this session ends."

## Architecture

```
Origin session (chat/haunt)
  → howl() tool call
    → captures origin coordinates (session ID, head message ID)
    → creates howl record (routing metadata + delivery text)
    → channel registry picks best channel
    → delivers message (high urgency) or stores for later (low urgency)

User reply (from any channel)
  → channel adapter checks for pending howls
  → processHowlReply (harness/howl/)
    → injects Q&A into origin session
    → warden consolidation in system session
    → marks howl responded

User dismissal (from web/CLI)
  → processHowlDismiss (harness/howl/)
    → marks howl dismissed
    → warden notes dismissal pattern in system session
```

## Tool Placement

The howl tool is coordinator-only (`baseTools`). Specialist souls (mentor, trainer, warden, chamberlain) do not have access to it. The tool factory takes `getCurrentSessionId` and `getHeadMessageId` callbacks to capture origin coordinates at execution time.
