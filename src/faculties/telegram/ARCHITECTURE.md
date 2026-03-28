# Telegram — Code Architecture

This document defines the final code structure for the `@ghostpaw/telegram`
package. The normative spec lives in `CONCEPT.md` (currently `README.md` in
this faculty folder). This document maps that spec to files and folders.

The structure follows the exact patterns established by `@ghostpaw/grimoire`,
`@ghostpaw/codex`, `@ghostpaw/souls`, `@ghostpaw/affinity`, and
`@ghostpaw/questlog`. The only material difference is two runtime dependencies
(`grammy`, `marked`) and five public surfaces instead of two or three.

## Package Root

```
@ghostpaw/telegram/
  CONCEPT.md                  # normative spec (the current README.md)
  README.md                   # short package overview and quick start
  package.json                # @ghostpaw/telegram, tsup build, node:test
  biome.json                  # shared lint config (2-space, double quotes, etc.)
  tsconfig.json               # strict TS, ESM, verbatimModuleSyntax
  tsconfig.demo.json          # demo-only overrides (JSX, browser target)
  .github/workflows/
    ci.yml                    # lint + typecheck + test
    pages.yml                 # deploy demo to GitHub Pages
    publish.yml               # publish to npm on tag
  docs/                       # operator and implementer manual
  scripts/                    # build_demo.mjs, serve_demo.mjs
  src/                        # all source code
```

## Docs

```
docs/
  README.md                   # doc index, core separations, storage topology
  HUMAN.md                    # direct-code usage: init, read, write, network, render
  LLM.md                      # soul + tools + skills for agent harness builders
  PAGES.md                    # demo app documentation
  entities/
    USERS.md                  # user atom, identity resolution, upsert semantics
    CHATS.md                  # chat atom, types, migration, linked channels
    MEMBERS.md                # member states, permissions, admin rights
    MESSAGES.md               # message atom, service kinds, edit tracking, FTS
    FILES.md                  # file storage model, download/upload, photo sizes
    REACTIONS.md              # three representations, event log, aggregate counts
    CALLBACKS.md              # callback routing, persistence, expiry
    TRANSPORT.md              # polling, webhook, connection states, update offset
    STREAMING.md              # progressive edit, throttle, chain overflow
    COMMANDS.md               # registry, parsing, middleware, menu sync
```

Each entity doc follows the established pattern:

- What It Is
- Why It Exists
- How To Use It
- Good Uses / Do Not Use It For
- Field table
- Public API at the bottom

`HUMAN.md` covers the direct package surface (`initTelegramTables`, `read`,
`write`, `network`, `render`, `types`, `errors`, `createBot`).

`LLM.md` covers the additive agent runtime (`soul`, `tools`, `skills`).

## Source Layout

```
src/
  index.ts                    # barrel: namespaced re-exports
  index.test.ts               # integration: surfaces exist, types resolve
  database.ts                 # TelegramDb type (injected, never constructed)
  types.ts                    # re-exports all public types from entity modules
  errors.ts                   # TelegramError hierarchy + isTelegramError guard
  errors.test.ts
  defaults.ts                 # DEFAULTS constant (all config knobs from spec)
  init_telegram_tables.ts     # one-shot DDL for all tables
  init_telegram_tables.test.ts
  read.ts                     # query surface: re-exports from entity modules
  read.test.ts
  write.ts                    # mutation surface: re-exports from executor/streaming
  write.test.ts
  network.ts                  # transport lifecycle + file transfer
  network.test.ts
  render.ts                   # pure transformation: markdown, splitting, escaping
  render.test.ts
  bot.ts                      # porcelain: createBot, TelegramBot composition
  bot.test.ts
  soul.ts                     # Herald soul: essence + traits + render
  soul.test.ts
  with_transaction.ts         # transaction helper
  resolve_now.ts              # time resolution helper
```

### Entity Modules

Each entity module owns its SQLite tables, row mappers, and typed queries.

```
  users/
    index.ts
    types.ts
    init_user_tables.ts
    upsert_user.ts            + upsert_user.test.ts
    get_user.ts               + get_user.test.ts
    list_users.ts             + list_users.test.ts
    user_chats.ts             + user_chats.test.ts
    user_messages.ts          + user_messages.test.ts
    map_user_row.ts           + map_user_row.test.ts

  chats/
    index.ts
    types.ts
    init_chat_tables.ts
    upsert_chat.ts            + upsert_chat.test.ts
    get_chat.ts               + get_chat.test.ts
    list_chats.ts             + list_chats.test.ts
    handle_migration.ts       + handle_migration.test.ts
    map_chat_row.ts           + map_chat_row.test.ts

  members/
    index.ts
    types.ts
    init_member_tables.ts
    upsert_member.ts          + upsert_member.test.ts
    get_member.ts             + get_member.test.ts
    list_members.ts           + list_members.test.ts
    map_member_row.ts         + map_member_row.test.ts

  messages/
    index.ts
    types.ts
    init_message_tables.ts    # messages + messages_fts + message_edits + triggers
    insert_message.ts         + insert_message.test.ts
    update_message.ts         + update_message.test.ts
    apply_edit.ts             + apply_edit.test.ts
    soft_delete.ts            + soft_delete.test.ts
    get_message.ts            + get_message.test.ts
    list_messages.ts          + list_messages.test.ts
    reply_chain.ts            + reply_chain.test.ts
    album.ts                  + album.test.ts
    thread_summary.ts         + thread_summary.test.ts
    search_messages.ts        + search_messages.test.ts
    map_message_row.ts        + map_message_row.test.ts

  files/
    index.ts
    types.ts
    init_file_tables.ts
    upsert_file.ts            + upsert_file.test.ts
    get_file.ts               + get_file.test.ts
    list_files.ts             + list_files.test.ts
    update_storage_status.ts  + update_storage_status.test.ts
    download_file.ts          + download_file.test.ts
    upload_file.ts            + upload_file.test.ts
    map_file_row.ts           + map_file_row.test.ts

  reactions/
    index.ts
    types.ts
    init_reaction_tables.ts   # reactions + reaction_counts + reaction_events
    apply_reaction_update.ts  + apply_reaction_update.test.ts
    apply_reaction_counts.ts  + apply_reaction_counts.test.ts
    get_reactions.ts          + get_reactions.test.ts
    get_reaction_counts.ts    + get_reaction_counts.test.ts
    user_reactions.ts         + user_reactions.test.ts
    map_reaction_row.ts       + map_reaction_row.test.ts

  callbacks/
    index.ts
    types.ts
    init_callback_tables.ts
    insert_callback.ts        + insert_callback.test.ts
    mark_answered.ts          + mark_answered.test.ts
    get_callbacks.ts          + get_callbacks.test.ts
    map_callback_row.ts       + map_callback_row.test.ts

  bot_state/
    index.ts
    types.ts
    init_bot_state_tables.ts
    get_state.ts              + get_state.test.ts
    set_state.ts              + set_state.test.ts
    get_stats.ts              + get_stats.test.ts
```

### Behavioral Modules

No tables of their own. Each owns one runtime concern.

```
  transport/
    index.ts
    types.ts
    start_polling.ts          + start_polling.test.ts
    start_webhook.ts          + start_webhook.test.ts
    stop.ts                   + stop.test.ts
    dispatch_update.ts        + dispatch_update.test.ts
    connection_state.ts       + connection_state.test.ts

  normalize/
    index.ts
    types.ts
    normalize_message.ts      + normalize_message.test.ts
    normalize_user.ts         + normalize_user.test.ts
    normalize_chat.ts         + normalize_chat.test.ts
    normalize_member.ts       + normalize_member.test.ts
    resolve_sender.ts         + resolve_sender.test.ts
    extract_media.ts          + extract_media.test.ts
    classify_message_type.ts  + classify_message_type.test.ts
    classify_service_kind.ts  + classify_service_kind.test.ts

  executor/
    index.ts
    types.ts
    send_message.ts           + send_message.test.ts
    edit_message.ts           + edit_message.test.ts
    delete_messages.ts        + delete_messages.test.ts
    forward_message.ts        + forward_message.test.ts
    copy_message.ts           + copy_message.test.ts
    set_reaction.ts           + set_reaction.test.ts
    send_album.ts             + send_album.test.ts
    moderate.ts               + moderate.test.ts
    manage_topic.ts           + manage_topic.test.ts
    broadcast.ts              + broadcast.test.ts
    answer_callback.ts        + answer_callback.test.ts
    rate_limiter.ts           + rate_limiter.test.ts
    outbound_queue.ts         + outbound_queue.test.ts

  streaming/
    index.ts
    types.ts
    create_stream.ts          + create_stream.test.ts
    stream_buffer.ts          + stream_buffer.test.ts
    adaptive_debounce.ts      + adaptive_debounce.test.ts
    chain_overflow.ts         + chain_overflow.test.ts

  commands/
    index.ts
    types.ts
    command_registry.ts       + command_registry.test.ts
    parse_command.ts          + parse_command.test.ts
    command_middleware.ts      + command_middleware.test.ts
    sync_menu.ts              + sync_menu.test.ts

  keyboards/
    index.ts
    types.ts
    inline_keyboard.ts        + inline_keyboard.test.ts
    reply_keyboard.ts         + reply_keyboard.test.ts

  render/
    index.ts
    types.ts
    markdown_to_html.ts       + markdown_to_html.test.ts
    markdown_to_markdown_v2.ts + markdown_to_markdown_v2.test.ts
    split_text.ts             + split_text.test.ts
    split_caption.ts          + split_caption.test.ts
    escape_html.ts            + escape_html.test.ts
    escape_markdown_v2.ts     + escape_markdown_v2.test.ts
```

### Tools, Skills, Soul

```
  tools/
    index.ts
    tool_metadata.ts          # defineTelegramTool, schema builders
    tool_types.ts             # ToolResult, ToolSuccess, ToolFailure hierarchy
    tool_names.ts             # tool name string constants
    tool_registry.ts          # telegramTools, getTelegramToolByName, listTelegramToolDefinitions
    tool_errors.ts            # translateToolError, withToolHandling
    tool_ref.ts               # entity reference builders
    tool_next.ts              # next-step hint builders
    tg_read_tool.ts           + tg_read_tool.test.ts
    tg_send_tool.ts           + tg_send_tool.test.ts
    tg_manage_tool.ts         + tg_manage_tool.test.ts
    tg_connect_tool.ts        + tg_connect_tool.test.ts

  skills/
    index.ts
    skill_types.ts            # TelegramSkill interface + defineTelegramSkill
    skill_registry.ts         # telegramSkills, getTelegramSkillByName, listTelegramSkills
    manage-telegram-conversations.ts   + .test.ts
    handle-group-administration.ts     + .test.ts
    stream-progressive-responses.ts    + .test.ts
    moderate-chat-effectively.ts       + .test.ts
    search-and-retrieve-messages.ts    + .test.ts
    broadcast-to-audience.ts           + .test.ts
```

### Library and Demo

```
  integration/                # cross-cutting tests (affinity pattern)
    architecture.test.ts      # enforce structural invariants (layer imports, surface wiring)
    intake_flow.test.ts       # full inbound update → normalize → persist → hook
    outbound_flow.test.ts     # full send → rate limit → grammy → persist

  lib/
    open-test-database.ts     # opens in-memory SQLite for tests
    test-db.ts                # shared test db factory
    mock_grammy.ts            # grammy Bot mock for tests (no real network)

  demo/
    app.tsx                   # Preact SPA root
    main.tsx                  # entry point
    sidebar.tsx
    router.ts
    context.ts
    browser_telegram_db.ts    # sql.js adapter for browser demo
    load_sqljs.ts
    sql_wasm_module.ts
    empty_module.ts
    demo_session.ts
    result_toast.tsx
    page_dashboard.tsx
    page_chats.tsx
    page_messages.tsx
    page_files.tsx
    page_search.tsx
    page_settings.tsx
    ui/
      index.ts
      badge.tsx
      panel.tsx
      message_card.tsx
      chat_card.tsx
      empty_state.tsx
```

## Barrel Export

`index.ts` follows the exact pattern from codex/grimoire/souls:

```typescript
export type { TelegramDb } from "./database.ts";
export * from "./errors.ts";
export * as errors from "./errors.ts";
export { initTelegramTables } from "./init_telegram_tables.ts";
export { createBot } from "./bot.ts";
export { DEFAULTS } from "./defaults.ts";
export * as read from "./read.ts";
export * as write from "./write.ts";
export * as network from "./network.ts";
export * as render from "./render.ts";
export type * from "./skills/index.ts";
export * as skills from "./skills/index.ts";
export type * from "./soul.ts";
export * as soul from "./soul.ts";
export type * from "./tools/index.ts";
export * as tools from "./tools/index.ts";
export type * from "./types.ts";
export * as types from "./types.ts";
```

Consumer usage:

```typescript
import {
  createBot,
  initTelegramTables,
  read,
  write,
  network,
  render,
  types,
  errors,
  skills,
  soul,
  tools,
} from "@ghostpaw/telegram";
```

## Surface Wiring

### `read.ts`

Pure SQLite queries. No network, no grammy. First argument is always `db`.

```typescript
export { getUser, listUsers, userChats, userMessages } from "./users/index.ts";
export { getChat, listChats } from "./chats/index.ts";
export { getMember, listMembers } from "./members/index.ts";
export {
  getMessage,
  listMessages,
  replyChain,
  album,
  threadSummary,
  searchMessages,
  editHistory,
} from "./messages/index.ts";
export { getFile, listFiles } from "./files/index.ts";
export { getReactions, getReactionCounts, userReactions } from "./reactions/index.ts";
export { getCallbacks } from "./callbacks/index.ts";
export { getStats } from "./bot_state/index.ts";
```

### `write.ts`

Outbound actions. Each function calls grammy, then persists the result to
the mirror. Requires both `db` and `bot` (grammy Bot instance).

```typescript
export {
  sendMessage,
  replyMessage,
  editMessage,
  deleteMessages,
  forwardMessage,
  copyMessage,
  setReaction,
  sendAlbum,
  pinMessage,
  unpinMessage,
  unpinAllMessages,
  answerCallback,
  setChatTitle,
  setChatDescription,
  setChatPhoto,
  deleteChatPhoto,
  setChatPermissions,
  banMember,
  unbanMember,
  restrictMember,
  promoteMember,
  createInviteLink,
  editInviteLink,
  revokeInviteLink,
  approveJoinRequest,
  declineJoinRequest,
  leaveChat,
  createTopic,
  editTopic,
  closeTopic,
  reopenTopic,
  deleteTopic,
  hideGeneralTopic,
  unhideGeneralTopic,
  closeGeneralTopic,
  reopenGeneralTopic,
  unpinAllTopicMessages,
  typing,
} from "./executor/index.ts";
export { createStream } from "./streaming/index.ts";
export { broadcast } from "./executor/index.ts";
```

### `network.ts`

Transport lifecycle and file I/O. Requires grammy Bot instance.

```typescript
export { startPolling, startWebhook, stop, isConnected } from "./transport/index.ts";
export { downloadFile, getFileUrl, uploadFile } from "./files/index.ts";
export { notify } from "./executor/index.ts";
```

### `render.ts`

Pure transformation. No I/O, no db, no grammy. Stateless functions.

```typescript
export { markdownToHtml, markdownToMarkdownV2 } from "./render/index.ts";
export { splitText, splitCaption } from "./render/index.ts";
export { escapeHtml, escapeMarkdownV2 } from "./render/index.ts";
```

## Key Files

### `database.ts`

Dependency-injected. The package never constructs a database.

```typescript
interface TelegramRunResult {
  lastInsertRowid: number | bigint;
  changes?: number | bigint | undefined;
}

interface TelegramStatement {
  run(...params: unknown[]): TelegramRunResult;
  get<TRecord = Record<string, unknown>>(...params: unknown[]): TRecord | undefined;
  all<TRecord = Record<string, unknown>>(...params: unknown[]): TRecord[];
}

type TelegramDb = {
  exec(sql: string): void;
  prepare(sql: string): TelegramStatement;
  close(): void;
};
```

### `errors.ts`

```typescript
type TelegramErrorCode =
  | "TELEGRAM_NOT_FOUND"
  | "TELEGRAM_TRANSPORT"
  | "TELEGRAM_RATE_LIMIT"
  | "TELEGRAM_API"
  | "TELEGRAM_VALIDATION"
  | "TELEGRAM_STATE"
  | "TELEGRAM_FILE";

class TelegramError extends Error { ... }
class TelegramNotFoundError extends TelegramError { ... }
class TelegramTransportError extends TelegramError { ... }
class TelegramRateLimitError extends TelegramError { ... }
class TelegramApiError extends TelegramError { ... }
class TelegramValidationError extends TelegramError { ... }
class TelegramStateError extends TelegramError { ... }
class TelegramFileError extends TelegramError { ... }

function isTelegramError(value: unknown): value is TelegramError;
```

### `defaults.ts`

```typescript
const DEFAULTS = {
  apiRoot: "https://api.telegram.org",
  parseMode: "HTML",
  pollingTimeout: 30_000,
  connectionTimeout: 10_000,
  conflictRetries: 3,
  conflictRetryDelay: 5_000,
  typingInterval: 4_000,
  minEditInterval: 1_000,
  maxEditInterval: 3_000,
  minEditDelta: 20,
  chainOnOverflow: true,
  maxQueueDepth: 100,
  autoDownload: false,
  autoDownloadTypes: [],
  autoDownloadMaxSize: 10_485_760,
  fileRetentionMs: 2_592_000_000,
  maxFileCacheBytes: 524_288_000,
  statelessMode: false,
  allowedChatIds: [],
  allowedUpdates: [],
} as const;
```

### `bot.ts`

The porcelain. Composes all surfaces, event hooks, and the command registry
into one object. Analogous to grimoire's `init.ts`.

```typescript
function createBot(config: BotConfig): TelegramBot;
```

`createBot` wires:
- grammy `Bot` instance from `config.token`
- all entity modules bound to `config.db`
- transport (polling or webhook) from `config`
- normalizer pipeline for inbound updates
- executor with rate limiter for outbound actions
- command registry
- event hook registration (`onMessage`, `onEditedMessage`, etc.)
- exposes `read`, `write`, `network`, `render`, `commands` as readonly properties

### `soul.ts`

```typescript
interface TelegramSoulTrait {
  principle: string;
  provenance: string;
}

interface TelegramSoul {
  slug: string;
  name: string;
  description: string;
  essence: string;
  traits: readonly TelegramSoulTrait[];
}

const telegramSoulEssence: string;
const telegramSoulTraits: readonly TelegramSoulTrait[];
const telegramSoul: TelegramSoul;
function renderTelegramSoulPromptFoundation(soul?: TelegramSoul): string;
```

## Type Re-Export Strategy

Root `types.ts` re-exports all public types from entity modules, following the
codex/affinity pattern. Entity-specific enums and row types live in each
module's `types.ts`. Cross-cutting types (shared across multiple modules) live
in the entity module that owns the concept.

```typescript
// types.ts (root)
export type { User, UserFilter } from "./users/types.ts";
export type { Chat, ChatFilter, AvailableReactions } from "./chats/types.ts";
export type { Member } from "./members/types.ts";
export type {
  StoredMessage, MessageQuery, MessageEdit, SearchResult, SearchOpts, ThreadSummary,
} from "./messages/types.ts";
export type { FileEntry, FileQuery } from "./files/types.ts";
export type {
  ReactionInput, UserReaction, ReactionCount, UserReactionSummary,
} from "./reactions/types.ts";
export type { CallbackEntry } from "./callbacks/types.ts";
export type { BotStats } from "./bot_state/types.ts";
export type {
  OutboundContent, EditContent, SendOpts, SentMessage, BroadcastOpts,
  BroadcastHandle, BroadcastResult, ChatAction, BanOpts, InviteLinkOpts,
  TopicOpts, AnswerCallbackOpts,
} from "./executor/types.ts";
export type { StreamHandle, StreamOpts } from "./streaming/types.ts";
export type {
  PollingOpts, WebhookOpts, StartOpts, BotInfo,
} from "./transport/types.ts";
export type { NotifyOpts, UploadOpts } from "./files/types.ts";
export type { BotConfig } from "./bot.ts";
export type {
  CommandRegistry, CommandDef, ArgDef, CommandContext, CommandResult,
  CommandScope, CommandMiddleware, CommandAction,
} from "./commands/types.ts";
export type {
  ReplyMarkup, InlineButton, KeyboardButton, InputMedia, MediaType,
  InputFile, ParseMode, ChatPermissions, AdminRights,
} from "./keyboards/types.ts";
export type {
  IncomingMessage, MessageHandler, EditedMessageHandler, CallbackHandler,
  MemberUpdateHandler, ReactionHandler, PollAnswerHandler, JoinRequestHandler,
  DeepLinkHandler, CallbackEvent, MemberUpdateEvent, ReactionUpdateEvent,
  PollAnswerEvent, JoinRequestEvent,
} from "./normalize/types.ts";
export type { TelegramSoul, TelegramSoulTrait } from "./soul.ts";
```

## Dependency and Call Graph

Strict layering. Higher layers depend on lower. Never reversed.

```
5. bot.ts           — porcelain composition, event dispatch
4. write.ts         — outbound actions (executor + streaming)
   network.ts       — transport lifecycle + file I/O
3. normalize/       — raw grammy updates to canonical shapes
   executor/        — outbound grammy calls + rate limiting + queue
   streaming/       — progressive edit
   transport/       — polling, webhook, connection state
   commands/        — registry, parsing, middleware
   keyboards/       — builder utilities
2. users/ chats/ members/ messages/ files/ reactions/ callbacks/ bot_state/
   render/          — pure markdown transformation
1. database.ts      — injected db type
   errors.ts        — error hierarchy
   defaults.ts      — config constants
   lib/             — pure utilities, test helpers
```

Entity modules at layer 2 do not import from each other. Cross-entity joins
happen in `read.ts` functions or in `normalize/` during intake.

`render/` sits at layer 2 because it is pure transformation with no
dependencies on entity modules, transport, or grammy. It depends only on
`marked` and the `types` at layer 1.

## Tool Surface

Four consolidated tools following the codex pattern of lean, action-oriented
grouping:

| Tool | Surface | Covers |
| --- | --- | --- |
| `tg_read` | `read` | search messages, list chats, get user, get message, thread summary, edit history, reactions, stats |
| `tg_send` | `write` | send, reply, edit, delete, forward, copy, react, pin, stream, album, broadcast |
| `tg_manage` | `write` | ban, restrict, promote, permissions, topics, invite links, chat settings |
| `tg_connect` | `network` | start/stop transport, download/upload files, connection status |

Each tool file exports:
- a tool definition (JSON Schema metadata via `defineTelegramTool`)
- a handler function (`(db, bot, input) => ToolResult`)
- input/result types

Tools call through the `read`/`write`/`network` surfaces. They never reach
into entity modules or grammy directly.

## Skill Surface

Six procedural skills as TypeScript constants:

| Skill | Tools Used | When To Use |
| --- | --- | --- |
| `manage-telegram-conversations` | `tg_read`, `tg_send` | monitor and respond to chat activity |
| `handle-group-administration` | `tg_read`, `tg_manage` | member moderation and chat settings |
| `stream-progressive-responses` | `tg_send` | LLM-backed incremental responses |
| `moderate-chat-effectively` | `tg_read`, `tg_manage` | proactive moderation workflows |
| `search-and-retrieve-messages` | `tg_read` | finding messages, threads, history |
| `broadcast-to-audience` | `tg_read`, `tg_send` | sending to many chats safely |

## Testing Conventions

- `node:test` + `node:assert` exclusively
- In-memory SQLite for all persistence tests (via `lib/open-test-database.ts`)
- grammy mocked via `lib/mock_grammy.ts` — no real Telegram traffic in tests
- Every non-type `.ts` file has a colocated `.test.ts`
- Integration tests at surface level (`read.test.ts`, `write.test.ts`, etc.)

## Build

- `tsup` for dual CJS/ESM output
- `esbuild` for the demo SPA
- `biome` for lint and format
- `tsc --noEmit` for type checking
- Single entry: `src/index.ts`
- Output: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts`

## Dependencies

```
runtime:
  grammy           — Bot API transport, update types, method surface
  marked           — markdown lexer for rendering

dev only:
  @biomejs/biome   — lint and format
  @types/node      — Node.js type declarations
  esbuild          — demo SPA bundler
  preact           — demo SPA framework
  sql.js-fts5      — browser-side SQLite for demo
  tsup             — library bundler
  typescript       — type checking
```
