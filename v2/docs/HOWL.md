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
4. The user replies whenever, from any channel
5. The reply triggers a mini-conversation that processes the answer and stores memories
6. The howl is marked resolved

## Channel Routing

Channels register with a lightweight in-process registry on startup. The `howl` tool picks the best connected channel:

- If Telegram is connected and the user has been active there → Telegram
- Otherwise → stored for the Web UI (always shows pending howls)
- If no channels are connected → howl is stored but not delivered

The Web UI always displays all pending howls regardless of which channel delivered them. This ensures nothing gets lost.

## Cross-Channel Reconciliation

One howl, one session. Replies from any channel merge into it.

1. Each howl targets ONE delivery channel (the best available)
2. Web always shows all pending howls
3. User reply from ANY channel routes to the howl session
4. Multiple replies (e.g., web then Telegram) go sequentially to the same session
5. On channels where the howl wasn't delivered, a context note is prepended

Example: ghost howls on Telegram. User sees it on Web too and replies there. The reply routes to the howl session with a note: "Delivered via Telegram. Reply received on Web."

## Reply Processing

When a user replies to a howl:

1. Reply is added to the howl session
2. A mini `executeTurn` runs with memory tools — the ghost processes the answer
3. Howl status updates to "responded"
4. Memories created are attributed to the howl session
5. On other channels, the howl is marked resolved

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

```
howls table:
  id            INTEGER PRIMARY KEY
  session_id    INTEGER → sessions.id
  message       TEXT
  urgency       TEXT ("low" | "high")
  channel       TEXT (where delivered, or null)
  status        TEXT ("pending" | "responded" | "dismissed")
  created_at    INTEGER (epoch ms)
  responded_at  INTEGER (epoch ms, nullable)
```

## Integration with Haunting

- The `howl` tool is available during haunt sessions
- Consolidation can emit howls: if a highlight is found, `runHaunt` creates one
- The haunt framing mentions: "If you have a genuine question for the user, you can reach out — but they won't reply before this session ends."

## Architecture

```
Origin (haunt/consolidation/quest/other)
  → howl() tool
    → creates howl record + howl session
    → channel registry picks best channel
    → delivers message (or stores for later)

User reply (from any channel)
  → channel adapter checks for pending howls
  → routes reply to howl session
  → executeTurn with memory tools
  → marks howl responded
```
