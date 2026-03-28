# Telegram

Telegram is a standalone Node.js bot channel engine. It speaks the Telegram Bot
API through `grammy`, renders markdown into Telegram-safe output through
`marked`, maintains an optional local SQLite mirror with full-text search, and
provides a complete direct-code surface for receiving updates, sending and
editing messages, handling reactions, routing callbacks, moderating chats,
managing forum topics, downloading files, and streaming progressive output.

This is not a chatbot framework and not an application UI. It is the protocol,
storage, rendering, and lifecycle substrate that lets any Node.js app operate a
Telegram bot presence correctly.

## Purpose

The package exists to make a Telegram bot presence programmable, searchable, and
reliable:

- receive every in-scope Telegram update type
- normalize those updates into a small canonical local model
- expose deterministic local reads from a SQLite mirror
- expose privileged outbound and moderation writes
- handle transport lifecycle for long polling, webhooks, and one-shot sends
- render markdown into Telegram-safe output with correct splitting
- stream long responses progressively without forcing every consumer to solve
  edit throttling and chaining

## Scope

### In Scope

- Telegram Bot API integration for bot accounts
- Long polling and webhook transport
- Local SQLite mirror of chats, users, members, messages, files, reactions,
  callbacks, and bot state
- Full message lifecycle: send, reply, edit, delete, forward, copy, pin,
  unpin, react, stream, broadcast
- Group, supergroup, channel, and forum-topic behavior
- Command parsing, callback routing, keyboards, deep links, menu button control
- File metadata capture, optional local download cache, upload support
- Markdown rendering to Telegram HTML and MarkdownV2 with safe splitting
- Transport error handling, rate limiting, and degraded stateless operation

### Non-Goals

- User-account Telegram access (`MTProto`, user sessions, personal client sync)
- Dialog trees, workflow builders, or opinionated conversation state machines
- LLM calls, agent reasoning, or policy about when the bot should answer
- Mini App hosting or front-end frameworks beyond surfacing the relevant Bot API
- Payments business logic beyond relaying the relevant Bot API affordances
- Inline query / inline result serving in this package version
- Content moderation, spam detection, or application-specific access policy

## Core Invariants

The implementation must preserve these invariants.

### 1. Telegram Is the Live Delivery Authority

Telegram is authoritative for:

- which updates exist
- whether a send/edit/delete/react succeeded
- current chat permissions and membership state
- webhook delivery retries

The package must not treat local rows as permission to assume a Bot API action
will still succeed.

### 2. The Local Mirror Is the Query Authority

When SQLite is enabled, the local mirror is authoritative for:

- deterministic local reads
- full-text search
- edit history
- reaction history
- reply-chain reconstruction
- album grouping
- callback correlation after restart

The package should answer reads from SQLite whenever the requested information
is already mirrored. Network round-trips are explicit, not implicit.

### 3. One Canonical Message Graph

Messages, edits, reactions, callbacks, files, reply edges, albums, and topics
all hang off the same chat/user/message graph. The package must not invent
separate competing models for "events", "timeline items", or "conversation
objects".

### 4. Stable Public Surfaces

The direct-code front door is intentionally small:

- `read` for deterministic local queries
- `write` for outbound sends and privileged mutations
- `network` for live transport and file transfer
- `runtime` for bootstrapping and schema initialization
- `render` for deterministic markdown and splitting behavior

Everything else in the package exists to support those surfaces.

### 5. Protocol-Broad, Ontology-Lean

Telegram exposes many methods and many update kinds. The package should still
feel like a small system centered on:

- users
- chats
- members
- messages
- files
- reactions
- callbacks
- transport state

The implementation must prefer one clear concept over a proliferating taxonomy
of special cases.

## Terminology

### Core Nouns

| Concept | Name | Meaning |
| --- | --- | --- |
| package | `Telegram` | the standalone bot channel engine |
| bot | `Bot` | one authenticated Telegram bot token |
| user | `User` | a Telegram account encountered by the bot |
| chat | `Chat` | a private chat, group, supergroup, or channel |
| member | `Member` | one user's current relationship to a chat |
| message | `Message` | one inbound or outbound Telegram message |
| file | `File` | one file reference plus optional local cached bytes |
| callback | `Callback` | one inline button press event and its persisted state |
| reaction state | `Reaction` | per-user and aggregate reaction state on a message |
| topic | `Topic` | one forum thread inside a supergroup |
| mirror | `Mirror` | the local SQLite representation of Telegram state |
| stream | `Stream` | a progressive outbound response updated by edits |

### Core Verbs

- `connect` — start polling or webhook handling
- `receive` — accept an update from Telegram
- `normalize` — convert raw Bot API payloads into the canonical local model
- `query` — read deterministic local state from the mirror
- `send` — create a new outbound message
- `reply` — send a message linked to an existing message
- `edit` — replace text, media, or reply markup on an existing message
- `delete` — remove one or more messages on Telegram and mark local state
- `react` — set the bot's reaction state on a message
- `moderate` — ban, unban, restrict, promote, approve, decline, leave
- `topic-manage` — create, edit, close, reopen, or delete a forum topic
- `download` — fetch file bytes into the local cache
- `upload` — send bytes to Telegram as media
- `stream` — progressively edit an outbound response as content arrives
- `broadcast` — send one payload to many chats with rate control

### Forbidden Nouns

These terms are explicitly outside the core ontology:

- `workflow`
- `dialog tree`
- `session graph`
- `chatbot framework`
- `user client`
- `agent`

Applications may build those on top. This package should not.

## Dependency and Compatibility Budget

### Runtime Dependencies

| Dependency | Role | Required |
| --- | --- | --- |
| `grammy` | Bot API transport, update types, method surface | yes |
| `marked` | markdown lexer for rendering | yes |
| `node:sqlite` | local persistence and FTS5 | built-in |
| `node:crypto` | webhook secret validation, cache hashes | built-in |
| `node:fs` | local file cache | built-in |
| `node:path` | file cache paths | built-in |
| `node:stream` | upload/download streams | built-in |
| `node:http` / `node:https` | webhook hosting integration | built-in |

### Compatibility Policy

- The package targets `grammy` 1.x.
- The package targets recent Telegram Bot API releases and must fail clearly
  when a feature is unavailable on the running Bot API version.
- Features introduced after the minimum supported Bot API version must degrade
  with a typed unsupported-feature error instead of silent omission.
- `statelessMode` must preserve transport and outbound behavior even when
  SQLite is unavailable or disabled.

## Architecture Overview

The package has five internal concerns:

1. **Transport** — polling, webhook intake, one-shot notify, lifecycle state
2. **Normalizer** — raw update to canonical model
3. **Mirror** — SQLite schema, indexes, FTS5, idempotent writes
4. **Renderer** — markdown conversion, escaping, splitting
5. **Executor** — outbound Bot API actions, queues, retries, streaming, files

### Authority Model

| Concern | Telegram | Local mirror |
| --- | --- | --- |
| update existence | authoritative | cached |
| outbound delivery success | authoritative | recorded after success |
| search | not suitable | authoritative |
| edit history | not retained | authoritative |
| file bytes | source | optional cache |
| reaction aggregate counts | authoritative | mirrored snapshot |
| command registry | local intent | authoritative locally, synced outward |

## Core Data Model

This section is the canonical ontology. Public API objects, normalization, and
SQLite rows must all map back to these concepts.

All local timestamps are Unix milliseconds stored as `INTEGER`. Raw Telegram
payloads may still carry Telegram's native second-resolution fields in `raw`.

### User

| Field | Type | Source | Persisted | Meaning |
| --- | --- | --- | --- | --- |
| `userId` | integer | Telegram | yes | globally unique user identifier |
| `isBot` | boolean | Telegram | yes | whether the user is a bot |
| `username` | text or null | Telegram | yes | current `@username` |
| `firstName` | text | Telegram | yes | current first name |
| `lastName` | text or null | Telegram | yes | current last name |
| `displayName` | text | derived | yes | first + last, fallback to username |
| `languageCode` | text or null | Telegram | yes | client-reported language |
| `isPremium` | boolean | Telegram | yes | premium account flag |
| `firstSeenAt` | integer | engine | yes | first encounter time |
| `lastSeenAt` | integer | engine | yes | most recent encounter time |

The latest observed username and display name overwrite prior values. Telegram
identities are mutable; the mirror stores the current best-known state.

### Chat

| Field | Type | Source | Persisted | Meaning |
| --- | --- | --- | --- | --- |
| `chatId` | integer | Telegram | yes | globally unique chat identifier |
| `type` | enum | Telegram | yes | `private`, `group`, `supergroup`, `channel` |
| `title` | text or null | Telegram | yes | group/channel title |
| `username` | text or null | Telegram | yes | public chat username |
| `firstName` | text or null | Telegram | yes | private-chat first name |
| `lastName` | text or null | Telegram | yes | private-chat last name |
| `isForum` | boolean | Telegram | yes | whether forum topics are enabled |
| `memberCount` | integer or null | Telegram | yes | latest known member count |
| `photoFileId` | text or null | Telegram | yes | small photo file id |
| `isActive` | boolean | engine | yes | whether the bot can still interact |
| `permissions` | object or null | Telegram | yes | default member permissions |
| `availableReactions` | object or null | Telegram | yes | allowed reaction policy |
| `lastMessageAt` | integer or null | engine | yes | latest mirrored message time |
| `metadata` | object | derived | yes | slow mode, auto-delete, migrations, linked chat, boosts, other extras |
| `createdAt` | integer | engine | yes | when first seen |
| `updatedAt` | integer | engine | yes | latest local modification time |

`availableReactions` has one of these shapes:

```typescript
type AvailableReactions =
  | { mode: "all" }
  | { mode: "none" }
  | { mode: "subset"; reactions: ReactionInput[] };
```

### Member

| Field | Type | Source | Persisted | Meaning |
| --- | --- | --- | --- | --- |
| `chatId` | integer | Telegram | yes | owning chat |
| `userId` | integer | Telegram | yes | member user |
| `username` | text or null | Telegram | yes | current username |
| `displayName` | text | derived | yes | latest display name |
| `status` | enum | Telegram | yes | `creator`, `administrator`, `member`, `restricted`, `left`, `kicked` |
| `permissions` | object or null | Telegram | yes | admin or restriction rights |
| `customTitle` | text or null | Telegram | yes | admin custom title |
| `updatedAt` | integer | engine | yes | last member-state update |

### Message

`Message` is the canonical timeline object. Service events are still messages.

| Field | Type | Source | Persisted | Meaning |
| --- | --- | --- | --- | --- |
| `chatId` | integer | Telegram | yes | owning chat |
| `messageId` | integer | Telegram | yes | server-assigned chat-local id |
| `direction` | enum | engine | yes | `in` or `out` |
| `date` | integer | Telegram | yes | message timestamp |
| `fromUserId` | integer or null | Telegram | yes | sender user id when present |
| `fromUsername` | text or null | Telegram | yes | sender username |
| `fromDisplayName` | text | derived | yes | resolved display sender |
| `senderChatId` | integer or null | Telegram | yes | sender chat id for anonymous/channel senders |
| `isAnonymousAdmin` | boolean | derived | yes | group anonymous-admin sender |
| `viaBotId` | integer or null | Telegram | yes | inline-mode source bot |
| `type` | enum | derived | yes | `text`, `photo`, `document`, `voice`, `video`, `video_note`, `sticker`, `animation`, `audio`, `location`, `venue`, `contact`, `poll`, `dice`, `story`, `game`, `web_app_data`, `service`, `other` |
| `serviceKind` | text or null | derived | yes | exact service subtype when `type = "service"` |
| `text` | text or null | Telegram | yes | text or caption |
| `textPlain` | text or null | derived | yes | plain-text version for FTS |
| `entities` | entity[] | Telegram | yes | Telegram entities for text or caption |
| `mentions` | integer[] | derived | yes | resolved mentioned users |
| `mentionsBot` | boolean | derived | yes | whether the bot was mentioned |
| `isReplyToBot` | boolean | derived | yes | whether reply target is a bot-authored outbound message |
| `replyToMessageId` | integer or null | Telegram | yes | parent message id |
| `threadId` | integer or null | Telegram | yes | topic/message thread id |
| `mediaGroupId` | text or null | Telegram | yes | album id |
| `forwardOrigin` | object or null | Telegram | yes | forward provenance |
| `media` | object or null | derived | yes | normalized media metadata |
| `hasMedia` | boolean | derived | yes | whether message has downloadable content |
| `replyMarkup` | object or null | Telegram | yes | inline keyboard or reply markup |
| `webAppData` | object or null | Telegram | yes | mini-app data payload |
| `linkPreview` | object or null | Telegram | yes | link preview metadata |
| `effectId` | text or null | Telegram | yes | effect id |
| `serviceData` | object or null | derived | yes | parsed service payload |
| `editDate` | integer or null | Telegram | yes | latest edit timestamp |
| `isDeleted` | boolean | engine | yes | local soft-delete state |
| `isPinned` | boolean | engine | yes | local pinned-state flag |
| `raw` | object | Telegram | yes | raw normalized update payload |
| `firstSeenAt` | integer | engine | yes | when first received |
| `updatedAt` | integer | engine | yes | latest local modification time |

#### Service Message Kinds

`serviceKind` must cover at least:

- `new_chat_members`
- `left_chat_member`
- `new_chat_title`
- `new_chat_photo`
- `delete_chat_photo`
- `group_chat_created`
- `supergroup_chat_created`
- `migrate_to_chat_id`
- `migrate_from_chat_id`
- `pinned_message`
- `video_chat_started`
- `video_chat_ended`
- `video_chat_scheduled`
- `forum_topic_created`
- `forum_topic_edited`
- `forum_topic_closed`
- `forum_topic_reopened`
- `general_forum_topic_hidden`
- `general_forum_topic_unhidden`
- `boost_added`
- `write_access_allowed`
- `chat_background_set`
- `other`

This keeps the public `Message.type` lean while retaining full service fidelity.

### File

| Field | Type | Source | Persisted | Meaning |
| --- | --- | --- | --- | --- |
| `fileId` | text | Telegram | yes | reusable Telegram file reference |
| `fileUniqueId` | text | Telegram | yes | content identity |
| `chatId` | integer or null | engine | yes | source chat |
| `messageId` | integer or null | engine | yes | source message |
| `type` | enum | derived | yes | `photo`, `document`, `voice`, `video`, `audio`, `sticker`, `animation`, `video_note`, `thumbnail`, `other` |
| `mimeType` | text or null | Telegram | yes | MIME type if known |
| `fileName` | text or null | Telegram | yes | original filename |
| `fileSize` | integer or null | Telegram | yes | size in bytes |
| `width` | integer or null | Telegram | yes | width where applicable |
| `height` | integer or null | Telegram | yes | height where applicable |
| `duration` | integer or null | Telegram | yes | duration where applicable |
| `localPath` | text or null | engine | yes | cache path if downloaded |
| `localHash` | text or null | engine | yes | hash of cached bytes |
| `storageStatus` | enum | engine | yes | `remote_only`, `downloaded`, `failed` |
| `downloadedAt` | integer or null | engine | yes | latest successful download time |
| `createdAt` | integer | engine | yes | when first seen |
| `updatedAt` | integer | engine | yes | latest metadata update |

### Reaction State

Reactions have three distinct persisted representations:

1. **Per-user current state** — which reactions a specific user currently has on
   a message
2. **Aggregate counts** — anonymous totals from `message_reaction_count`
3. **Event log** — add/remove history for auditing and analytics

The public shapes are:

```typescript
type ReactionInput =
  | string
  | { type: "emoji"; emoji: string }
  | { type: "custom_emoji"; customEmojiId: string }
  | { type: "paid" };

type UserReaction = {
  userId: number;
  displayName: string;
  emoji: string;
  emojiType: "emoji" | "custom_emoji" | "paid";
  setAt: number;
};

type ReactionCount = {
  emoji: string;
  emojiType: "emoji" | "custom_emoji" | "paid";
  count: number;
  updatedAt: number;
};
```

### Callback

| Field | Type | Source | Persisted | Meaning |
| --- | --- | --- | --- | --- |
| `callbackId` | text | Telegram | yes | callback query id |
| `chatId` | integer | Telegram | yes | source chat |
| `messageId` | integer | Telegram | yes | source message |
| `userId` | integer | Telegram | yes | user who pressed the button |
| `data` | text or null | Telegram | yes | callback data |
| `handler` | text or null | engine | yes | matched handler key if known |
| `payload` | object or null | engine | yes | decoded handler payload |
| `answeredAt` | integer or null | engine | yes | when callback answer was sent |
| `expiresAt` | integer or null | engine | yes | optional local expiry |
| `createdAt` | integer | engine | yes | when callback was first seen |

### Transport State

| Field | Type | Source | Persisted | Meaning |
| --- | --- | --- | --- | --- |
| `state` | enum | engine | yes | `disconnected`, `connecting`, `connected`, `disconnecting`, `error` |
| `mode` | enum | engine | yes | `polling`, `webhook`, `notify`, `none` |
| `lastUpdateId` | integer or null | Telegram | yes | last successfully processed update id |
| `lastError` | text or null | engine | yes | latest transport failure |
| `updatedAt` | integer | engine | yes | latest state transition |

### Sender Identity Resolution

Messages do not always have a simple user sender.

| Scenario | `fromUserId` | `senderChatId` | Display identity |
| --- | --- | --- | --- |
| normal user message | user id | null | user display name |
| anonymous group admin | null | group chat id | group title with anonymous-admin semantics |
| channel post | null | channel id | channel title |
| linked-channel auto-forward | user id or null | channel id | linked channel identity |
| inline mode message | user id | null | user display name with `viaBotId` |

The implementation must always resolve a stable `fromDisplayName` even when no
user id exists.

### Message Relationships

The mirror must preserve these relationships:

- **reply chain** — `replyToMessageId`
- **album** — `mediaGroupId`
- **topic** — `threadId`
- **edit lineage** — snapshots in `message_edits`
- **reaction lineage** — rows in `reaction_events`

## Chat Context Semantics

### Private Chats

- `chatId` equals the other party's Telegram user id
- all private-chat messages visible to the bot are in scope
- reply keyboards and force-reply are common and fully supported

### Groups and Supergroups

- privacy mode may limit which messages the bot receives
- `mentionsBot` must be computed from commands, `@mention`, and `text_mention`
- `isReplyToBot` must be computed against the local outbound message mirror
- anonymous admin posts must resolve through `senderChatId`
- group-to-supergroup migration must be mirrored explicitly

### Channels

- channel posts arrive as `channel_post` / `edited_channel_post`
- sender identity is the channel itself, not a human user
- the bot must be an admin to post or manage the channel

### Forums

- forum messages carry `threadId`
- topic lifecycle events are stored as service messages
- topic management methods are part of `write`

### Linked Channels

If a channel is linked to a discussion group:

- the linked relation belongs in `chat.metadata`
- auto-forwarded messages must preserve both `senderChatId` and
  `forwardOrigin`

### Migrations

When Telegram migrates a group to a supergroup:

- the old chat becomes inactive
- the new chat is inserted with the new id
- both migration directions are persisted in chat metadata
- the migration service messages are stored like any other service event

## Inbound Update Processing

### Supported Update Types

| Update | Normalization | Persistence | Hook surface |
| --- | --- | --- | --- |
| `message` | normalize to `Message` | insert/update message graph | `onMessage` |
| `edited_message` | snapshot previous version, then merge | update `messages`, insert `message_edits` | `onEditedMessage` |
| `channel_post` | normalize to `Message` | insert/update message graph | `onMessage` |
| `edited_channel_post` | snapshot previous version, then merge | update `messages`, insert `message_edits` | `onEditedMessage` |
| `callback_query` | normalize to `Callback` | insert/update `callbacks` | `onCallback` |
| `my_chat_member` | normalize bot membership change | update chat and member state | `onMemberUpdate` |
| `chat_member` | normalize member change | update `members` | `onMemberUpdate` |
| `message_reaction` | compute user diff | replace per-user reaction state and append events | `onReaction` |
| `message_reaction_count` | normalize aggregate counts | upsert `reaction_counts` | none required |
| `poll_answer` | normalize answer payload | upsert `poll_answers` | `onPollAnswer` |
| `chat_boost` | normalize boost event | append service event / metadata update | none required |
| `removed_chat_boost` | normalize boost removal | append service event / metadata update | none required |
| `chat_join_request` | normalize join request | append join-request record or callback-equivalent state | `onJoinRequest` |

### Intake Order

For each update, the implementation must:

1. persist `lastUpdateId` only after successful processing
2. upsert referenced users and chats before dependent rows
3. upsert member rows when the update contains member state
4. normalize messages or callbacks into canonical shapes
5. commit multi-row changes transactionally
6. fire application hooks only after persistence succeeds

### Idempotency

The intake path must be safe against duplicate delivery:

- long polling retries can replay updates around crashes
- webhook retries replay unacknowledged requests
- unique constraints on `(chat_id, message_id)` and other natural keys must make
  duplicates safe
- `lastUpdateId` prevents polling from reprocessing old updates on clean restart

### Edited Messages

On `edited_message` or `edited_channel_post`, the implementation must:

1. load the current mirrored row
2. snapshot the previous state into `message_edits`
3. update the current `messages` row in place
4. refresh `textPlain` and the FTS index
5. expose both new and previous content to `onEditedMessage`

The package must not overwrite edits in place without preserving history.

### Reactions

#### `message_reaction`

Telegram sends the full before/after reaction state for one user on one
message:

- `old_reaction[]`
- `new_reaction[]`

The implementation must:

1. delete current per-user reaction rows for `(chatId, messageId, userId)`
2. insert one row per entry in `new_reaction[]`
3. compute add/remove diff entries into `reaction_events`
4. fire `onReaction` with full old/new state

#### `message_reaction_count`

These updates provide anonymous aggregate totals in contexts where individual
user attribution is not available. The implementation must upsert
`reaction_counts` and keep them separate from per-user state.

### Join Requests, Poll Answers, and Boosts

These are first-class intake events even when the application chooses not to act
on them immediately. The mirror must preserve them if persistence is enabled.

## Outbound Behavior

### Message Actions

The package must support these outbound actions:

| Action | Semantics |
| --- | --- |
| `send` | create a new outbound message |
| `reply` | create an outbound message tied to an existing `messageId` |
| `edit` | replace text, media, or reply markup on an existing message |
| `delete` | remove one or more messages and mark local rows deleted |
| `forward` | forward without modification |
| `copy` | copy while creating a new sender identity |
| `sendAlbum` | send up to 10 grouped media items |
| `pin` / `unpin` | manage pin state |
| `typing` | send chat action heartbeat |
| `stream` | progressively edit an outbound response as content arrives |
| `broadcast` | send one payload to many chats with rate control |
| `notify` | fire-and-forget send without long-lived transport |

Successful outbound actions must update the local mirror when persistence is
enabled.

### Reaction Writes

Telegram's `setMessageReaction` replaces the bot's full reaction state on a
message. Therefore:

- `write.react(chatId, messageId, [])` removes all bot reactions
- `write.react(chatId, messageId, ["👍"])` sets exactly one reaction
- `write.react(chatId, messageId, ["👍", "🔥"])` sets multiple reactions

The package must not treat reaction writes as append-only.

### Moderation and Chat Management

The write surface must expose:

- `banMember`
- `unbanMember`
- `restrictMember`
- `promoteMember`
- `setChatTitle`
- `setChatDescription`
- `setChatPhoto`
- `deleteChatPhoto`
- `setChatPermissions`
- `createInviteLink`
- `editInviteLink`
- `revokeInviteLink`
- `approveJoinRequest`
- `declineJoinRequest`
- `leaveChat`
- `unpinAllMessages`

### Forum Topic Management

The write surface must expose:

- `createTopic`
- `editTopic`
- `closeTopic`
- `reopenTopic`
- `deleteTopic`
- `hideGeneralTopic`
- `unhideGeneralTopic`
- `closeGeneralTopic`
- `reopenGeneralTopic`
- `unpinAllTopicMessages`

### Broadcast

Broadcast is a first-class package feature, not just an application loop.

The broadcast executor must:

- obey global and per-chat rate limits
- detect blocks and mark chats inactive where appropriate
- surface per-chat errors
- follow chat migrations when Telegram indicates a replacement chat id
- support abort and progress callbacks

## Interactive Surfaces

### Inline Keyboards

The package must support callback buttons, URL buttons, switch-inline buttons,
web-app buttons, login buttons, and pay buttons.

The keyboard builder may be ergonomic, but the persisted canonical shape is just
the Telegram reply markup payload.

### Callback Routing

Callbacks are routed by `callback_data` pattern. The package must support:

- exact-match routes
- glob or regexp routes
- persisted callback correlation after restart
- explicit `answerCallback` to satisfy Telegram client UX

### Reply Keyboards and Force Reply

The package must support:

- persistent reply keyboards
- one-time reply keyboards
- keyboard removal
- selective keyboards in groups
- force reply
- input field placeholders

### Commands

The package command registry is local state with optional Telegram menu sync.

```typescript
type CommandRegistry = {
  register(command: CommandDef): void;
  registerMany(commands: CommandDef[]): void;
  unregister(name: string): void;
  list(): CommandDef[];
  has(name: string): boolean;
  syncMenu(scope?: CommandScope): Promise<void>;
  clearMenu(scope?: CommandScope): Promise<void>;
  use(middleware: CommandMiddleware): void;
};

type CommandDef = {
  name: string;
  description: string;
  args?: ArgDef[];
  scopes?: CommandScope[];
  hidden?: boolean;
  handler: (ctx: CommandContext) => Promise<CommandResult>;
};

type ArgDef = {
  name: string;
  type: "string" | "number" | "boolean" | "rest";
  required?: boolean;
  description?: string;
  default?: unknown;
};
```

Commands must support:

- `/command`
- `/command arg1 arg2`
- quoted arguments
- `/command@botusername` filtering in groups
- scope-specific menu sync
- middleware for auth, logging, or admin checks

### Command Context and Result

```typescript
type CommandContext = {
  chatId: number;
  messageId: number;
  userId: number;
  username: string | null;
  displayName: string;
  args: Record<string, unknown>;
  rawArgs: string;
  isGroupChat: boolean;
  isAdmin: boolean;
  threadId: number | null;
  reply(text: string): Promise<SentMessage>;
  replyMarkdown(markdown: string): Promise<SentMessage>;
};

type CommandResult = {
  text?: string;
  markdown?: string;
  content?: OutboundContent;
  action?: CommandAction;
} | void;

type CommandAction =
  | { type: "delete_trigger" }
  | { type: "custom"; data: unknown };

type CommandScope =
  | { type: "default" }
  | { type: "all_private_chats" }
  | { type: "all_group_chats" }
  | { type: "all_chat_administrators" }
  | { type: "chat"; chatId: number }
  | { type: "chat_member"; chatId: number; userId: number }
  | { type: "chat_administrators"; chatId: number };

type CommandMiddleware = (
  ctx: CommandContext,
  next: () => Promise<CommandResult>,
) => Promise<CommandResult>;
```

### Deep Links and Menu Button

The package must support:

- `https://t.me/<bot>?start=<payload>` deep links
- menu button configuration for command menu or web-app launch

## Protocol Constraints

These are hard Telegram-side limits the implementation must respect:

| Constraint | Limit |
| --- | --- |
| text message length | 4096 UTF-16 code units |
| caption length | 1024 UTF-16 code units |
| `callback_data` size | 64 bytes |
| inline keyboard buttons per message | 100 total |
| inline keyboard columns per row | 8 |
| media group size | 2–10 items |
| file download via Bot API | 20 MB |
| file upload via Bot API | 50 MB (multipart), 20 MB (URL send) |
| message deletion window | 48 hours (non-admin), unlimited (admin, own messages in private) |
| typing indicator lifetime | 5 seconds (must heartbeat) |
| `setMyCommands` per scope | 100 commands max |
| MarkdownV2 special chars | `_*[]()~\`>#+-=\|{}.!` must be escaped |
| poll question length | 300 characters |
| poll option length | 100 characters |
| poll option count | 2–10 options |
| bot username mention | must filter `/command@botusername` in groups |

All traffic goes through `https://api.telegram.org`. The package must not
hard-code alternative endpoints unless the consumer explicitly provides a custom
API root (e.g. for local Bot API server deployments).

## Rendering

Telegram output rendering is deterministic and belongs inside the package.

### Markdown to Telegram HTML

The primary path is standard markdown in, Telegram HTML out.

The renderer must correctly handle:

- bold, italic, underline, strikethrough, spoiler, inline code
- fenced code blocks with language hints
- blockquotes
- links
- headings as styled text
- lists rendered as text
- tables rendered into a Telegram-safe fallback form
- HTML escaping for `&`, `<`, `>`

### MarkdownV2

The package must also expose a MarkdownV2 renderer for consumers that need
native MarkdownV2 semantics.

### Splitting

Telegram hard limits:

| Content | Limit |
| --- | --- |
| text | 4096 characters |
| caption | 1024 characters |

The splitting engine must:

- prefer paragraph boundaries
- then prefer sentence/line boundaries
- then prefer word boundaries
- hard-cut only as a last resort
- never split inside an entity or HTML tag pair

## Streaming and Rate Control

Streaming is a first-class feature for LLM-backed or incremental-response bots.

### Streaming Flow

1. send the first meaningful chunk as a normal message
2. buffer subsequent chunks
3. edit the same message at debounced intervals
4. if content would exceed 4096 characters, finalize the current message and
   continue in a chained message
5. stop the typing heartbeat when complete or aborted

### Streaming Configuration

| Setting | Default | Meaning |
| --- | --- | --- |
| `minEditInterval` | 1000 ms | minimum time between edits to one message |
| `maxEditInterval` | 3000 ms | maximum delay before forcing a flush |
| `minEditDelta` | 20 chars | minimum content delta before editing |
| `chainOnOverflow` | true | continue in a new message after limit overflow |
| `typingInterval` | 4000 ms | typing heartbeat while a stream is active |

`minEditDelta` is the canonical setting name. No other alias should exist in
the public API or configuration docs.

### Rate Limiting

The executor must handle at least these classes of limits:

| Scope | Typical limit | Strategy |
| --- | --- | --- |
| per chat | ~1 message/sec | per-chat queue |
| groups | stricter burst limits | sliding-window queueing |
| global | ~30 messages/sec | global token bucket |
| edits | stricter than sends | adaptive debounce |

### Adaptive Throttle

When a `429 Too Many Requests` response arrives, the executor must:

1. respect the `retry_after` value for the failed request
2. widen the per-chat and/or global token bucket for subsequent work
3. increase streaming edit intervals temporarily
4. never retry faster than the server-mandated delay

### Backpressure

When the outbound queue reaches `maxQueueDepth`, new work must either block or
reject explicitly. The package must not allow unbounded memory growth.

## File Handling

### Storage Model

File handling is split deliberately:

- metadata lives in SQLite
- bytes live on the filesystem

Binary content is never stored as SQLite blobs in the core design.

### Download

Telegram limits Bot API file downloads to 20 MB. The package must surface a
clear error when the file exceeds this limit rather than silently failing.

The package must support:

- lazy download by `fileId`
- optional eager download by media type and size threshold
- deduplication by `fileUniqueId`
- cache retention by age and/or total size
- graceful retry after download failure

### Upload

Telegram limits multipart uploads to 50 MB and URL-based sends to 20 MB. The
package must validate size before attempting the upload and surface a clear
error on violation.

The package must support sending files by:

- Telegram `file_id`
- public URL
- local filesystem path
- `Buffer`
- readable stream

### Photo Sizes

For photos, Telegram provides multiple resolutions. The package must:

- persist all sizes in normalized metadata
- choose the largest by default for download and primary file mirroring
- allow consumers to request a specific size when needed

### Caption Normalization

Text entities and caption entities must normalize into the same `text` and
`entities` fields. `Message.type` tells the consumer whether that text belongs
to a pure text message or a media caption.

## Persistence

SQLite is optional but normative for the full package behavior.

### Persistence Rules

- schema initialization is pure DDL
- all multi-row inbound update application is transactional
- edit history and reaction history are append-only
- FTS indexes are maintained automatically
- stateless mode bypasses persistence but preserves network and write behavior

### Schema

```sql
CREATE TABLE users (
  user_id         INTEGER PRIMARY KEY,
  is_bot          INTEGER NOT NULL DEFAULT 0,
  username        TEXT,
  first_name      TEXT NOT NULL,
  last_name       TEXT,
  display_name    TEXT NOT NULL,
  language_code   TEXT,
  is_premium      INTEGER NOT NULL DEFAULT 0,
  first_seen_at   INTEGER NOT NULL,
  last_seen_at    INTEGER NOT NULL
);

CREATE TABLE chats (
  chat_id              INTEGER PRIMARY KEY,
  type                 TEXT NOT NULL,
  title                TEXT,
  username             TEXT,
  first_name           TEXT,
  last_name            TEXT,
  is_forum             INTEGER NOT NULL DEFAULT 0,
  member_count         INTEGER,
  photo_file_id        TEXT,
  is_active            INTEGER NOT NULL DEFAULT 1,
  permissions          TEXT,
  available_reactions  TEXT,
  last_message_at      INTEGER,
  metadata             TEXT NOT NULL DEFAULT '{}',
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);

CREATE TABLE members (
  chat_id         INTEGER NOT NULL REFERENCES chats(chat_id),
  user_id         INTEGER NOT NULL REFERENCES users(user_id),
  username        TEXT,
  display_name    TEXT NOT NULL,
  status          TEXT NOT NULL,
  custom_title    TEXT,
  permissions     TEXT,
  updated_at      INTEGER NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE messages (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id             INTEGER NOT NULL REFERENCES chats(chat_id),
  message_id          INTEGER NOT NULL,
  direction           TEXT NOT NULL,
  date                INTEGER NOT NULL,
  from_user_id        INTEGER REFERENCES users(user_id),
  from_username       TEXT,
  from_display        TEXT NOT NULL,
  sender_chat_id      INTEGER,
  is_anonymous_admin  INTEGER NOT NULL DEFAULT 0,
  via_bot_id          INTEGER,
  type                TEXT NOT NULL,
  service_kind        TEXT,
  text                TEXT,
  text_plain          TEXT,
  entities            TEXT NOT NULL DEFAULT '[]',
  mentions            TEXT NOT NULL DEFAULT '[]',
  mentions_bot        INTEGER NOT NULL DEFAULT 0,
  is_reply_to_bot     INTEGER NOT NULL DEFAULT 0,
  reply_to_msg_id     INTEGER,
  thread_id           INTEGER,
  media_group_id      TEXT,
  forward_origin      TEXT,
  media               TEXT,
  has_media           INTEGER NOT NULL DEFAULT 0,
  reply_markup        TEXT,
  web_app_data        TEXT,
  link_preview        TEXT,
  effect_id           TEXT,
  service_data        TEXT,
  edit_date           INTEGER,
  is_deleted          INTEGER NOT NULL DEFAULT 0,
  is_pinned           INTEGER NOT NULL DEFAULT 0,
  raw                 TEXT NOT NULL,
  first_seen_at       INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  UNIQUE (chat_id, message_id)
);

CREATE INDEX idx_messages_chat_date ON messages(chat_id, date DESC);
CREATE INDEX idx_messages_from_user ON messages(from_user_id) WHERE from_user_id IS NOT NULL;
CREATE INDEX idx_messages_thread ON messages(chat_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_messages_reply ON messages(chat_id, reply_to_msg_id) WHERE reply_to_msg_id IS NOT NULL;
CREATE INDEX idx_messages_media_group ON messages(chat_id, media_group_id) WHERE media_group_id IS NOT NULL;
CREATE INDEX idx_messages_service_kind ON messages(service_kind) WHERE service_kind IS NOT NULL;

CREATE VIRTUAL TABLE messages_fts USING fts5(
  text_plain,
  content = 'messages',
  content_rowid = 'id'
);

CREATE TRIGGER messages_ai AFTER INSERT ON messages
WHEN NEW.text_plain IS NOT NULL
BEGIN
  INSERT INTO messages_fts(rowid, text_plain) VALUES (NEW.id, NEW.text_plain);
END;

CREATE TRIGGER messages_ad AFTER DELETE ON messages
WHEN OLD.text_plain IS NOT NULL
BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, text_plain)
  VALUES ('delete', OLD.id, OLD.text_plain);
END;

CREATE TRIGGER messages_au AFTER UPDATE OF text_plain ON messages
WHEN OLD.text_plain IS NOT NULL OR NEW.text_plain IS NOT NULL
BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, text_plain)
  VALUES ('delete', OLD.id, COALESCE(OLD.text_plain, ''));
  INSERT INTO messages_fts(rowid, text_plain)
  VALUES (NEW.id, COALESCE(NEW.text_plain, ''));
END;

CREATE TABLE message_edits (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id           INTEGER NOT NULL,
  message_id        INTEGER NOT NULL,
  previous_text     TEXT,
  previous_entities TEXT,
  previous_media    TEXT,
  previous_markup   TEXT,
  previous_raw      TEXT,
  edited_at         INTEGER NOT NULL,
  FOREIGN KEY (chat_id, message_id) REFERENCES messages(chat_id, message_id)
);

CREATE INDEX idx_message_edits_msg ON message_edits(chat_id, message_id);

CREATE TABLE files (
  file_id         TEXT PRIMARY KEY,
  file_unique_id  TEXT NOT NULL,
  chat_id         INTEGER,
  message_id      INTEGER,
  type            TEXT NOT NULL,
  mime_type       TEXT,
  file_name       TEXT,
  file_size       INTEGER,
  width           INTEGER,
  height          INTEGER,
  duration        INTEGER,
  local_path      TEXT,
  local_hash      TEXT,
  storage_status  TEXT NOT NULL DEFAULT 'remote_only',
  downloaded_at   INTEGER,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX idx_files_unique ON files(file_unique_id);
CREATE INDEX idx_files_message ON files(chat_id, message_id);

CREATE TABLE callbacks (
  callback_id    TEXT PRIMARY KEY,
  chat_id        INTEGER NOT NULL,
  message_id     INTEGER NOT NULL,
  user_id        INTEGER NOT NULL REFERENCES users(user_id),
  data           TEXT,
  handler        TEXT,
  payload        TEXT,
  answered_at    INTEGER,
  expires_at     INTEGER,
  created_at     INTEGER NOT NULL
);

CREATE INDEX idx_callbacks_message ON callbacks(chat_id, message_id);

CREATE TABLE reactions (
  chat_id      INTEGER NOT NULL,
  message_id   INTEGER NOT NULL,
  user_id      INTEGER NOT NULL REFERENCES users(user_id),
  emoji        TEXT NOT NULL,
  emoji_type   TEXT NOT NULL,
  set_at       INTEGER NOT NULL,
  PRIMARY KEY (chat_id, message_id, user_id, emoji, emoji_type)
);

CREATE INDEX idx_reactions_message ON reactions(chat_id, message_id);
CREATE INDEX idx_reactions_user ON reactions(user_id);

CREATE TABLE reaction_counts (
  chat_id      INTEGER NOT NULL,
  message_id   INTEGER NOT NULL,
  emoji        TEXT NOT NULL,
  emoji_type   TEXT NOT NULL,
  count        INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (chat_id, message_id, emoji, emoji_type)
);

CREATE TABLE reaction_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id      INTEGER NOT NULL,
  message_id   INTEGER NOT NULL,
  user_id      INTEGER,
  emoji        TEXT NOT NULL,
  emoji_type   TEXT NOT NULL,
  action       TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE INDEX idx_reaction_events_message ON reaction_events(chat_id, message_id);

CREATE TABLE poll_answers (
  poll_id      TEXT NOT NULL,
  user_id      INTEGER NOT NULL REFERENCES users(user_id),
  option_ids   TEXT NOT NULL,
  answered_at  INTEGER NOT NULL,
  PRIMARY KEY (poll_id, user_id)
);

CREATE TABLE bot_state (
  key          TEXT PRIMARY KEY,
  value        TEXT NOT NULL,
  updated_at   INTEGER NOT NULL
);
```

### Required Derived Queries

The read surface must support at least:

- all messages from a user across chats
- all chats a user participates in
- reply-chain reconstruction
- album reconstruction
- topic summary with participant counts
- current reaction state and aggregate counts
- edit history for a message
- FTS-backed message search

## Public API

The API is defined by surface, not by raw Bot API method names.

### Package Shape

```typescript
type TelegramPackage = {
  read: TelegramReadSurface;
  write: TelegramWriteSurface;
  network: TelegramNetworkSurface;
  runtime: TelegramRuntimeSurface;
  render: TelegramRenderSurface;
  bot: TelegramBot;
};
```

### Read Surface

```typescript
type TelegramReadSurface = {
  user(userId: number): User | null;
  users(filter?: UserFilter): User[];
  userChats(userId: number): Chat[];
  userMessages(userId: number, opts?: MessageQuery): StoredMessage[];

  chat(chatId: number): Chat | null;
  chats(filter?: ChatFilter): Chat[];

  message(chatId: number, messageId: number): StoredMessage | null;
  messages(chatId: number, opts?: MessageQuery): StoredMessage[];
  thread(chatId: number, threadId: number, opts?: MessageQuery): StoredMessage[];
  threadSummary(chatId: number, threadId: number): ThreadSummary;
  replyChain(chatId: number, messageId: number): StoredMessage[];
  album(chatId: number, mediaGroupId: string): StoredMessage[];

  search(query: string, opts?: SearchOpts): SearchResult[];

  member(chatId: number, userId: number): Member | null;
  members(chatId: number): Member[];

  file(fileId: string): FileEntry | null;
  files(chatId: number, opts?: FileQuery): FileEntry[];

  editHistory(chatId: number, messageId: number): MessageEdit[];
  reactions(chatId: number, messageId: number): UserReaction[];
  reactionCounts(chatId: number, messageId: number): ReactionCount[];
  userReactions(userId: number, opts?: { chatId?: number; limit?: number }): UserReactionSummary[];

  callbacks(chatId: number): CallbackEntry[];
  stats(): BotStats;
};
```

### Write Surface

```typescript
type TelegramWriteSurface = {
  send(chatId: number, content: OutboundContent, opts?: SendOpts): Promise<SentMessage>;
  reply(chatId: number, messageId: number, content: OutboundContent, opts?: SendOpts): Promise<SentMessage>;
  edit(chatId: number, messageId: number, content: EditContent): Promise<void>;
  delete(chatId: number, messageIds: number[]): Promise<void>;
  forward(chatId: number, fromChatId: number, messageId: number, opts?: SendOpts): Promise<SentMessage>;
  copy(chatId: number, fromChatId: number, messageId: number, opts?: SendOpts): Promise<SentMessage>;
  react(chatId: number, messageId: number, reactions: ReactionInput[]): Promise<void>;
  pin(chatId: number, messageId: number): Promise<void>;
  unpin(chatId: number, messageId?: number): Promise<void>;
  typing(chatId: number, action?: ChatAction): Promise<void>;
  stream(chatId: number, generator: AsyncGenerator<string>, opts?: StreamOpts): StreamHandle;
  sendAlbum(chatId: number, media: InputMedia[], opts?: SendOpts): Promise<SentMessage[]>;
  broadcast(chatIds: number[], content: OutboundContent, opts?: BroadcastOpts): BroadcastHandle;
  answerCallback(callbackQueryId: string, opts?: AnswerCallbackOpts): Promise<void>;

  setChatTitle(chatId: number, title: string): Promise<void>;
  setChatDescription(chatId: number, description: string): Promise<void>;
  setChatPhoto(chatId: number, photo: InputFile): Promise<void>;
  deleteChatPhoto(chatId: number): Promise<void>;
  setChatPermissions(chatId: number, permissions: ChatPermissions): Promise<void>;
  banMember(chatId: number, userId: number, opts?: BanOpts): Promise<void>;
  unbanMember(chatId: number, userId: number): Promise<void>;
  restrictMember(chatId: number, userId: number, permissions: ChatPermissions, until?: Date): Promise<void>;
  promoteMember(chatId: number, userId: number, rights: AdminRights): Promise<void>;
  createInviteLink(chatId: number, opts?: InviteLinkOpts): Promise<string>;
  editInviteLink(chatId: number, link: string, opts?: InviteLinkOpts): Promise<string>;
  revokeInviteLink(chatId: number, link: string): Promise<void>;
  approveJoinRequest(chatId: number, userId: number): Promise<void>;
  declineJoinRequest(chatId: number, userId: number): Promise<void>;
  leaveChat(chatId: number): Promise<void>;
  unpinAllMessages(chatId: number): Promise<void>;

  createTopic(chatId: number, name: string, opts?: TopicOpts): Promise<number>;
  editTopic(chatId: number, topicId: number, opts: TopicOpts): Promise<void>;
  closeTopic(chatId: number, topicId: number): Promise<void>;
  reopenTopic(chatId: number, topicId: number): Promise<void>;
  deleteTopic(chatId: number, topicId: number): Promise<void>;
  hideGeneralTopic(chatId: number): Promise<void>;
  unhideGeneralTopic(chatId: number): Promise<void>;
  closeGeneralTopic(chatId: number): Promise<void>;
  reopenGeneralTopic(chatId: number): Promise<void>;
  unpinAllTopicMessages(chatId: number, topicId: number): Promise<void>;
};
```

### Network Surface

```typescript
type TelegramNetworkSurface = {
  startPolling(opts?: PollingOpts): Promise<BotInfo>;
  startWebhook(opts: WebhookOpts): WebhookHandler;
  stop(): Promise<void>;
  isConnected(): boolean;
  downloadFile(fileId: string, destPath?: string): Promise<string>;
  getFileUrl(fileId: string): Promise<string>;
  uploadFile(chatId: number, type: MediaType, file: InputFile, opts?: UploadOpts): Promise<SentMessage>;
  notify(chatId: number, text: string, opts?: NotifyOpts): Promise<void>;
};
```

### Runtime and Render Surfaces

```typescript
type TelegramRuntimeSurface = {
  createBot(config: BotConfig): TelegramBot;
  migrate(db: DatabaseHandle): void;
  version(): string;
};

type TelegramRenderSurface = {
  markdownToHtml(markdown: string): string;
  markdownToMarkdownV2(markdown: string): string;
  splitText(text: string, limit?: number): string[];
  splitCaption(text: string): string[];
  escapeHtml(text: string): string;
  escapeMarkdownV2(text: string): string;
};
```

### Porcelain Bot

```typescript
type TelegramBot = {
  readonly commands: CommandRegistry;
  readonly read: TelegramReadSurface;
  readonly write: TelegramWriteSurface;
  readonly network: TelegramNetworkSurface;
  readonly render: TelegramRenderSurface;

  start(opts?: StartOpts): Promise<BotInfo>;
  stop(): Promise<void>;
  isConnected(): boolean;

  onMessage(handler: MessageHandler): void;
  onEditedMessage(handler: EditedMessageHandler): void;
  onCallback(pattern: string | RegExp, handler: CallbackHandler): void;
  onMemberUpdate(handler: MemberUpdateHandler): void;
  onReaction(handler: ReactionHandler): void;
  onPollAnswer(handler: PollAnswerHandler): void;
  onJoinRequest(handler: JoinRequestHandler): void;
  onDeepLink(handler: DeepLinkHandler): void;
};
```

### Supporting Types

```typescript
type OutboundContent =
  | { type: "text"; text: string; parseMode?: ParseMode; replyMarkup?: ReplyMarkup }
  | { type: "markdown"; markdown: string; replyMarkup?: ReplyMarkup }
  | { type: "photo"; photo: InputFile; caption?: string; parseMode?: ParseMode; replyMarkup?: ReplyMarkup }
  | { type: "document"; document: InputFile; caption?: string; filename?: string; replyMarkup?: ReplyMarkup }
  | { type: "voice"; voice: InputFile; caption?: string; duration?: number; replyMarkup?: ReplyMarkup }
  | { type: "video"; video: InputFile; caption?: string; duration?: number; width?: number; height?: number; replyMarkup?: ReplyMarkup }
  | { type: "audio"; audio: InputFile; caption?: string; duration?: number; title?: string; performer?: string; replyMarkup?: ReplyMarkup }
  | { type: "animation"; animation: InputFile; caption?: string; replyMarkup?: ReplyMarkup }
  | { type: "video_note"; videoNote: InputFile; duration?: number; length?: number; replyMarkup?: ReplyMarkup }
  | { type: "sticker"; sticker: InputFile; replyMarkup?: ReplyMarkup }
  | { type: "location"; latitude: number; longitude: number; replyMarkup?: ReplyMarkup }
  | { type: "venue"; latitude: number; longitude: number; title: string; address: string; replyMarkup?: ReplyMarkup }
  | { type: "contact"; phoneNumber: string; firstName: string; lastName?: string; replyMarkup?: ReplyMarkup }
  | { type: "poll"; question: string; options: string[]; isAnonymous?: boolean; type?: "regular" | "quiz"; replyMarkup?: ReplyMarkup }
  | { type: "dice"; emoji?: string };

type EditContent =
  | { type: "text"; text: string; parseMode?: ParseMode; replyMarkup?: ReplyMarkup }
  | { type: "markdown"; markdown: string; replyMarkup?: ReplyMarkup }
  | { type: "media"; media: InputMedia; caption?: string }
  | { type: "replyMarkup"; replyMarkup: ReplyMarkup };

type StreamHandle = {
  push(chunk: string): void;
  finalize(): Promise<SentMessage>;
  abort(error?: string): Promise<void>;
  readonly done: Promise<SentMessage>;
};

type SendOpts = {
  threadId?: number;
  disableNotification?: boolean;
  protectContent?: boolean;
};

type InputFile = string | Buffer | ReadableStream | { url: string } | { fileId: string };
type ParseMode = "HTML" | "MarkdownV2";

type SentMessage = {
  chatId: number;
  messageId: number;
  date: number;
  text: string | null;
  raw: object;
};

type ChatAction =
  | "typing"
  | "upload_photo"
  | "record_video"
  | "upload_video"
  | "record_voice"
  | "upload_voice"
  | "upload_document"
  | "choose_sticker"
  | "find_location"
  | "record_video_note"
  | "upload_video_note";

type ThreadSummary = {
  chatId: number;
  threadId: number;
  topicName: string | null;
  messageCount: number;
  participantCount: number;
  firstMessageAt: number | null;
  lastMessageAt: number | null;
};

type BroadcastOpts = {
  rateLimit?: number;
  onProgress?: (done: number, total: number) => void;
  onError?: (chatId: number, error: Error) => void;
  followMigrations?: boolean;
  signal?: AbortSignal;
};

type BroadcastHandle = {
  readonly done: Promise<BroadcastResult>;
  abort(): void;
};

type BroadcastResult = {
  sent: number;
  failed: number;
  blocked: number;
  migrated: number;
  errors: Array<{ chatId: number; error: string }>;
};

type SearchOpts = {
  chatId?: number;
  limit?: number;
  offset?: number;
  fromUserId?: number;
  dateFrom?: number;
  dateTo?: number;
};

type SearchResult = {
  message: StoredMessage;
  rank: number;
  snippet: string;
};

type MessageQuery = {
  limit?: number;
  offset?: number;
  before?: number;
  after?: number;
  direction?: "in" | "out";
  type?: string;
  hasMedia?: boolean;
};

type UserFilter = {
  isBot?: boolean;
  search?: string;
  limit?: number;
};

type ChatFilter = {
  type?: "private" | "group" | "supergroup" | "channel";
  isActive?: boolean;
  isForum?: boolean;
  search?: string;
  limit?: number;
};

type FileQuery = {
  type?: string;
  limit?: number;
  storageStatus?: "remote_only" | "downloaded" | "failed";
};

type BanOpts = {
  untilDate?: Date;
  revokeMessages?: boolean;
};

type InviteLinkOpts = {
  name?: string;
  expireDate?: Date;
  memberLimit?: number;
  createsJoinRequest?: boolean;
};

type TopicOpts = {
  name?: string;
  iconColor?: number;
  iconCustomEmojiId?: string;
};

type StreamOpts = {
  parseMode?: ParseMode;
  replyToMessageId?: number;
  threadId?: number;
  replyMarkup?: ReplyMarkup;
  minEditInterval?: number;
  maxEditInterval?: number;
  minEditDelta?: number;
};

type AnswerCallbackOpts = {
  text?: string;
  showAlert?: boolean;
  url?: string;
  cacheTime?: number;
};

type NotifyOpts = {
  parseMode?: ParseMode;
  disableNotification?: boolean;
  replyMarkup?: ReplyMarkup;
};

type UploadOpts = {
  caption?: string;
  parseMode?: ParseMode;
  replyToMessageId?: number;
  replyMarkup?: ReplyMarkup;
};

type PollingOpts = {
  timeout?: number;
  allowedUpdates?: string[];
  dropPendingUpdates?: boolean;
};

type WebhookOpts = {
  url: string;
  path?: string;
  secretToken?: string;
  certificate?: InputFile;
  ipAddress?: string;
  maxConnections?: number;
  allowedUpdates?: string[];
  dropPendingUpdates?: boolean;
};

type WebhookHandler = (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void;

type BotConfig = {
  token: string;
  apiRoot?: string;
  db?: DatabaseHandle;
  fileDir?: string;
  parseMode?: ParseMode;
  pollingTimeout?: number;
  connectionTimeout?: number;
  conflictRetries?: number;
  conflictRetryDelay?: number;
  typingInterval?: number;
  minEditInterval?: number;
  maxEditInterval?: number;
  minEditDelta?: number;
  chainOnOverflow?: boolean;
  maxQueueDepth?: number;
  autoDownload?: boolean;
  autoDownloadTypes?: string[];
  autoDownloadMaxSize?: number;
  fileRetentionMs?: number;
  maxFileCacheBytes?: number;
  statelessMode?: boolean;
  allowedChatIds?: number[];
  allowedUpdates?: string[];
};

type BotInfo = {
  id: number;
  isBot: boolean;
  firstName: string;
  username: string;
  canJoinGroups: boolean;
  canReadAllGroupMessages: boolean;
  supportsInlineQueries: boolean;
};

type StartOpts = {
  mode: "polling" | "webhook";
  polling?: PollingOpts;
  webhook?: WebhookOpts;
};
```

### Handler Types

```typescript
type IncomingMessage = StoredMessage & {
  chat: Chat;
  from: User | null;
  isCommand: boolean;
  commandName: string | null;
  commandArgs: string | null;
};

type MessageHandler = (msg: IncomingMessage) => Promise<void> | void;
type EditedMessageHandler = (msg: IncomingMessage, previous: MessageEdit) => Promise<void> | void;
type CallbackHandler = (cb: CallbackEvent) => Promise<void> | void;
type MemberUpdateHandler = (update: MemberUpdateEvent) => Promise<void> | void;
type ReactionHandler = (update: ReactionUpdateEvent) => Promise<void> | void;
type PollAnswerHandler = (answer: PollAnswerEvent) => Promise<void> | void;
type JoinRequestHandler = (request: JoinRequestEvent) => Promise<void> | void;
type DeepLinkHandler = (msg: IncomingMessage, payload: string) => Promise<void> | void;

type CallbackEvent = {
  callbackQueryId: string;
  chatId: number;
  messageId: number;
  userId: number;
  displayName: string;
  data: string | null;
  handler: string | null;
  payload: unknown;
};

type MemberUpdateEvent = {
  chatId: number;
  userId: number;
  displayName: string;
  oldStatus: string;
  newStatus: string;
  isBotUpdate: boolean;
};

type ReactionUpdateEvent = {
  chatId: number;
  messageId: number;
  userId: number | null;
  displayName: string | null;
  oldReactions: ReactionInput[];
  newReactions: ReactionInput[];
};

type PollAnswerEvent = {
  pollId: string;
  userId: number;
  optionIds: number[];
};

type JoinRequestEvent = {
  chatId: number;
  userId: number;
  displayName: string;
  bio: string | null;
  inviteLink: string | null;
  date: number;
};

type MessageEdit = {
  previousText: string | null;
  previousEntities: object[] | null;
  previousMedia: object | null;
  previousMarkup: object | null;
  editedAt: number;
};

type StoredMessage = {
  id: number;
  chatId: number;
  messageId: number;
  direction: "in" | "out";
  date: number;
  fromUserId: number | null;
  fromUsername: string | null;
  fromDisplayName: string;
  senderChatId: number | null;
  isAnonymousAdmin: boolean;
  viaBotId: number | null;
  type: string;
  serviceKind: string | null;
  text: string | null;
  textPlain: string | null;
  entities: object[];
  mentions: number[];
  mentionsBot: boolean;
  isReplyToBot: boolean;
  replyToMessageId: number | null;
  threadId: number | null;
  mediaGroupId: string | null;
  forwardOrigin: object | null;
  media: object | null;
  hasMedia: boolean;
  replyMarkup: object | null;
  webAppData: object | null;
  linkPreview: object | null;
  effectId: string | null;
  serviceData: object | null;
  editDate: number | null;
  isDeleted: boolean;
  isPinned: boolean;
  raw: object;
  firstSeenAt: number;
  updatedAt: number;
};

type CallbackEntry = {
  callbackId: string;
  chatId: number;
  messageId: number;
  userId: number;
  data: string | null;
  handler: string | null;
  payload: unknown;
  answeredAt: number | null;
  expiresAt: number | null;
  createdAt: number;
};

type FileEntry = {
  fileId: string;
  fileUniqueId: string;
  chatId: number | null;
  messageId: number | null;
  type: string;
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  localPath: string | null;
  localHash: string | null;
  storageStatus: "remote_only" | "downloaded" | "failed";
  downloadedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

type UserReactionSummary = {
  chatId: number;
  messageId: number;
  emoji: string;
  emojiType: "emoji" | "custom_emoji" | "paid";
  setAt: number;
};

type User = {
  userId: number;
  isBot: boolean;
  username: string | null;
  firstName: string;
  lastName: string | null;
  displayName: string;
  languageCode: string | null;
  isPremium: boolean;
  firstSeenAt: number;
  lastSeenAt: number;
};

type Chat = {
  chatId: number;
  type: "private" | "group" | "supergroup" | "channel";
  title: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isForum: boolean;
  memberCount: number | null;
  photoFileId: string | null;
  isActive: boolean;
  permissions: ChatPermissions | null;
  availableReactions: AvailableReactions | null;
  lastMessageAt: number | null;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

type Member = {
  chatId: number;
  userId: number;
  username: string | null;
  displayName: string;
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
  customTitle: string | null;
  permissions: ChatPermissions | AdminRights | null;
  updatedAt: number;
};

type BotStats = {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
  totalFiles: number;
  oldestMessageAt: number | null;
  newestMessageAt: number | null;
};

type ReplyMarkup =
  | { type: "inline_keyboard"; rows: InlineButton[][] }
  | { type: "reply_keyboard"; rows: KeyboardButton[][]; resizeKeyboard?: boolean; oneTimeKeyboard?: boolean; selective?: boolean; inputFieldPlaceholder?: string; isPersistent?: boolean }
  | { type: "reply_keyboard_remove"; selective?: boolean }
  | { type: "force_reply"; selective?: boolean; inputFieldPlaceholder?: string };

type InlineButton =
  | { text: string; callbackData: string }
  | { text: string; url: string }
  | { text: string; switchInlineQuery: string }
  | { text: string; switchInlineQueryCurrentChat: string }
  | { text: string; webApp: { url: string } }
  | { text: string; loginUrl: { url: string; forwardText?: string; botUsername?: string } }
  | { text: string; pay: true };

type KeyboardButton =
  | string
  | { text: string; requestContact?: boolean; requestLocation?: boolean; requestPoll?: { type?: "quiz" | "regular" } };

type InputMedia =
  | { type: "photo"; media: InputFile; caption?: string; parseMode?: ParseMode }
  | { type: "video"; media: InputFile; caption?: string; duration?: number; width?: number; height?: number }
  | { type: "document"; media: InputFile; caption?: string }
  | { type: "audio"; media: InputFile; caption?: string; duration?: number; title?: string; performer?: string }
  | { type: "animation"; media: InputFile; caption?: string };

type MediaType = "photo" | "document" | "voice" | "video" | "audio" | "animation" | "sticker" | "video_note";

type ChatPermissions = {
  canSendMessages?: boolean;
  canSendAudios?: boolean;
  canSendDocuments?: boolean;
  canSendPhotos?: boolean;
  canSendVideos?: boolean;
  canSendVideoNotes?: boolean;
  canSendVoiceNotes?: boolean;
  canSendPolls?: boolean;
  canSendOtherMessages?: boolean;
  canAddWebPagePreviews?: boolean;
  canChangeInfo?: boolean;
  canInviteUsers?: boolean;
  canPinMessages?: boolean;
  canManageTopics?: boolean;
};

type AdminRights = {
  isAnonymous?: boolean;
  canManageChat?: boolean;
  canDeleteMessages?: boolean;
  canManageVideoChats?: boolean;
  canRestrictMembers?: boolean;
  canPromoteMembers?: boolean;
  canChangeInfo?: boolean;
  canInviteUsers?: boolean;
  canPostMessages?: boolean;
  canEditMessages?: boolean;
  canPinMessages?: boolean;
  canPostStories?: boolean;
  canEditStories?: boolean;
  canDeleteStories?: boolean;
  canManageTopics?: boolean;
};

type DatabaseHandle = { exec(sql: string): void; prepare(sql: string): unknown };
```

## Configuration

### Defaults and Knobs

| Setting | Default | Meaning |
| --- | --- | --- |
| `apiRoot` | `"https://api.telegram.org"` | Bot API base URL (override for local API server) |
| `parseMode` | `"HTML"` | default text formatting mode |
| `pollingTimeout` | `30000` | long-poll request timeout in ms |
| `connectionTimeout` | `10000` | initial connect timeout in ms |
| `conflictRetries` | `3` | max retries on polling 409 conflict |
| `conflictRetryDelay` | `5000` | delay between conflict retries |
| `typingInterval` | `4000` | typing heartbeat during streaming |
| `minEditInterval` | `1000` | minimum edit spacing |
| `maxEditInterval` | `3000` | forced flush interval |
| `minEditDelta` | `20` | minimum edit-worthy content delta |
| `chainOnOverflow` | `true` | chain streamed messages after 4096 chars |
| `maxQueueDepth` | `100` | outbound queue cap before backpressure |
| `autoDownload` | `false` | whether to cache files eagerly |
| `autoDownloadTypes` | `all` | media types eligible for eager download |
| `autoDownloadMaxSize` | `10485760` | eager-download size limit in bytes |
| `fileRetentionMs` | `2592000000` | default 30-day cache retention |
| `maxFileCacheBytes` | `524288000` | default 500 MB cache cap |
| `statelessMode` | `false` | disable SQLite mirror entirely |
| `allowedChatIds` | `[]` | optional allowlist of chat ids |
| `allowedUpdates` | `all` | update types requested from Telegram |

## Security Requirements

The package must satisfy these requirements:

- Bot tokens are never written into the SQLite mirror.
- Webhook handlers must support secret-token verification.
- Optional IP allowlisting must be available for webhook deployments.
- File downloads must sanitize destination paths and forbid directory traversal.
- Local file cache cleanup must never delete outside the configured cache root.
- `allowedChatIds` must be enforced before application hooks fire.
- Errors must not log tokens, webhook secrets, or raw Authorization headers.

## Error Model and Degraded Modes

### Transport and API Errors

| Error case | Required behavior |
| --- | --- |
| 409 conflict on polling | retry with backoff up to configured limit |
| 429 too many requests | respect `retry_after`, widen local throttles |
| 400 bad request | return typed request error with Telegram message |
| 401 unauthorized | fatal transport error until credentials change |
| 403 forbidden / blocked | mark chat inactive when appropriate |
| network failure | retry with capped exponential backoff |
| entity parse error | retry plain-text fallback where safe |
| message too long | auto-split or chain based on content type |
| file too large | reject with clear size error |

### Degraded Modes

- If SQLite is disabled or unavailable, the package runs in stateless mode.
- In stateless mode, `read` must return empty or transient-only results rather
  than pretending persistence exists.
- If file download fails, metadata rows remain and `storageStatus` becomes
  `failed`.
- If an edit fails because the message is gone or too old, the package surfaces
  the error and must not spin in an unbounded retry loop.

## Conformance Checklist

An implementation is not complete until it demonstrably satisfies these checks:

- every in-scope update type is normalized and either persisted or explicitly
  routed
- edited messages preserve prior state in `message_edits`
- reactions preserve per-user state, aggregate counts, and event history
- command parsing handles bot username suffixes and quoted args
- markdown rendering and splitting are Telegram-safe for long messages
- streaming respects edit throttles and chains on overflow
- files support metadata-only mirror plus optional cached bytes
- file size limits (20 MB down, 50 MB up) are validated before network calls
- group migrations, linked channels, anonymous admins, and forums are mirrored
- General topic operations (hide/unhide/close/reopen) are supported
- invite links support create, edit, and revoke
- polling restart resumes from `lastUpdateId`
- webhook mode validates secret token when configured
- 429 responses widen local throttles and respect `retry_after`
- callback_data does not exceed 64 bytes; inline keyboards stay within 100
  buttons total
- media groups send 2–10 items and reject sizes outside that range
- stateless mode remains operational for send/receive work
- all handler types receive the payloads documented in this spec
- public surface names, config keys, and type names match this spec exactly

## Optional Agent Integration (Non-Normative)

Applications may wrap the direct-code surfaces as broader agent tools. If they
do, the recommended grouping is still:

- local inspection over `read`
- privileged actions over `write`
- transport/file operations over `network`

This package does not require or define any persona, soul, demo app, or
framework-specific overlay.
