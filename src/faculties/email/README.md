# Email

Email is a standalone mailbox management engine. It speaks IMAP and SMTP to
any standard provider, parses and composes MIME messages, and maintains a
local SQLite mirror with full-text search. Not an email client UI. Not a
notification service. A protocol-complete substrate that lets any app — or
any LLM agent — read, search, compose, reply, forward, and organize a real
human's email on their behalf.

`questlog` is about commitments in time. `affinity` is about people and
relationships. `codex` is about belief. `souls` is about cognitive identity.
`grimoire` is about procedural competence. `email` is about communication
channels — the messages that arrive and depart, the conversations they form,
the attachments they carry, and the organizational structure that keeps them
navigable.

The point is not to poll more. The point is to make the mailbox a
programmable, searchable, agent-accessible surface.

## The Message Atom

A message is one email plus the minimum metadata needed to discover, thread,
search, and act on it.

| Field | Type | Source | Meaning |
| --------------- | ------------- | --------------- | ---------------------------------------------------- |
| `uid` | integer | IMAP server | server-assigned unique ID within a mailbox |
| `messageId` | text | RFC 5322 header | globally unique `Message-ID` |
| `inReplyTo` | text or null | RFC 5322 header | parent message in the conversation |
| `references` | text[] | RFC 5322 header | full ancestor chain for threading |
| `threadId` | text | derived | computed thread root `Message-ID` |
| `from` | address | RFC 5322 header | sender |
| `to` | address[] | RFC 5322 header | primary recipients |
| `cc` | address[] | RFC 5322 header | carbon copy recipients |
| `bcc` | address[] | local composition / sent archive | blind carbon copy recipients when locally authored; usually unavailable on received mail |
| `replyTo` | address | RFC 5322 header | explicit reply address if different from sender |
| `subject` | text | RFC 5322 header | decoded subject line |
| `date` | timestamp | RFC 5322 header | message date |
| `receivedAt` | timestamp | sync engine | when the message was first synced locally |
| `envelopeFrom` | address or null | SMTP / local compose | SMTP return path used for transport; may differ from `from` |
| `envelopeTo` | address[] or null | SMTP / local compose | SMTP recipients including Bcc; transport envelope, not display headers |
| `flags` | text[] | IMAP server | `\Seen`, `\Flagged`, `\Answered`, `\Draft`, etc. |
| `labels` | text[] | provider ext | Gmail labels and similar provider-specific tags |
| `size` | integer | IMAP FETCH | RFC822.SIZE in bytes |
| `bodyStructure` | object | IMAP FETCH | recursive MIME part tree |
| `hasAttachments` | boolean | derived | whether any non-inline parts exist |

A message is strictly a received or sent email — not a draft in progress
(that is a composition), not a contact (that is affinity), not a task (that
is questlog). The message atom captures everything needed to display a
message in a listing, thread it into conversations, search it, and act on it
without re-fetching from the server.

An address is a `{ name?: string, address: string }` pair. The `name` is
the decoded display name from RFC 2047 encoded words. The `address` is the
bare `local@domain` form.

### Header vs Envelope Semantics

Email has two recipient planes and they are never conflated:

- **RFC 5322 headers** (`From`, `To`, `Cc`, `Bcc`, `Reply-To`) define what is
  written into the message body seen by recipients.
- **SMTP envelope** (`MAIL FROM`, `RCPT TO`) defines transport routing and may
  include recipients not visible in headers.

Rules:

- `Bcc` recipients are included in SMTP `RCPT TO` but omitted from the final
  message copy delivered to other recipients.
- For locally authored drafts and sent messages, the store preserves `bcc`,
  `envelopeFrom`, and `envelopeTo` because the client created them.
- For received messages, `bcc` is usually absent and should be treated as
  unknown rather than empty.
- `from` is what the human sees. `envelopeFrom` is the bounce/return path and
  may differ on mailing lists, forwarding setups, and provider-managed sends.
- Reply logic uses headers (`Reply-To`, `From`, `To`, `Cc`), never the SMTP
  envelope.

## Grammar

| Concept | Name | Notes |
| --------------------- | --------------- | ---------------------------------------------------- |
| system | `Email` | protocol-complete mailbox management |
| account | `Account` | one IMAP+SMTP credential set |
| folder | `Folder` | IMAP mailbox with optional SPECIAL-USE role |
| message | `Message` | one email with envelope, structure, flags |
| conversation | `Thread` | messages linked by References/In-Reply-To |
| file attachment | `Attachment` | decoded binary with filename and MIME type |
| composed outgoing | `Composition` | message under construction before send |
| local mirror | `Store` | SQLite-backed sync state |
| real-time stream | `Watch` | IDLE-based push notification |
| protocol session | `Session` | one authenticated IMAP connection |
| send session | `Relay` | one authenticated SMTP connection |

### Verbs

- `Connect` — establish an authenticated IMAP session
- `Disconnect` — graceful LOGOUT and socket teardown
- `Sync` — synchronize remote state to local store (incremental or full)
- `Fetch` — retrieve message content (body, attachments) on demand
- `Search Local` — query the local FTS5 mirror
- `Search Remote` — query the provider with IMAP SEARCH / ESEARCH criteria
- `List` — enumerate folders with roles and counts
- `Select` — open a folder for operations
- `Watch` — enter IDLE for real-time push notifications
- `Mark` — set or remove flags (read, flagged, answered, deleted)
- `Copy` — duplicate messages into another folder without removing the source
- `Move` — relocate messages between folders
- `Archive` — move messages into Archive or provider-equivalent all-mail storage
- `Junk` — move messages into Junk / Spam and optionally add junk flags
- `Not Junk` — restore messages from Junk and remove junk flags when supported
- `Trash` — move to Trash (SPECIAL-USE aware, provider-adaptive)
- `Delete` — permanently expunge messages
- `Reply` — compose and send a reply, set \Answered, append to Sent
- `Forward` — compose and send a forward with original content/attachments
- `Send` — compose and transmit a new message, append to Sent
- `Draft` — save a composition to the Drafts folder via APPEND
- `Export` — serialize a message as RFC 5322 `.eml`
- `Import` — APPEND an RFC 5322 `.eml` into a folder
- `Create Folder` — create a new IMAP mailbox
- `Rename Folder` — rename an existing mailbox
- `Delete Folder` — remove an empty mailbox
- `Subscribe Folder` — add a folder to the subscribed set
- `Unsubscribe Folder` — remove a folder from the subscribed set

Forbidden system nouns: Inbox, Notification, Alert, Template, Campaign,
Newsletter. Each implies a specific use case — email is the general
substrate.

## Protocol Layer

### Connection

Two connection modes. Both use `node:tls` and `node:net` from the standard
library.

**Direct TLS** (port 993, standard): Establish a TLS socket immediately.
The first server response is the IMAP greeting (`* OK` or `* PREAUTH`).

**STARTTLS** (port 143, legacy): Establish a plaintext socket. Read the
greeting. Send `CAPABILITY` to confirm `STARTTLS` is advertised. Send
`STARTTLS`, receive `OK`, upgrade the socket via `tls.connect()` wrapping
the existing socket. Re-issue `CAPABILITY` after upgrade — the server may
advertise different capabilities over TLS.

**Keepalive.** IMAP servers drop idle connections (typically 30 minutes).
The engine sends `NOOP` at a configurable interval (default: 5 minutes)
when not in IDLE mode. During IDLE, the server keeps the connection alive
via the IDLE mechanism itself.

**Reconnect.** On unexpected socket close or timeout, the engine
re-establishes the connection, re-authenticates, and re-SELECTs the
previously selected folder. Pending commands that were in flight at
disconnect are rejected with a retriable error. The consumer can retry
them. Reconnect uses exponential backoff: 1s, 2s, 4s, 8s, capped at 60s.

**Socket events.** The connection emits typed events: `connected`,
`disconnected`, `error`, `timeout`, `greeting`. The consumer can subscribe
for monitoring.

### Parser

The IMAP response parser is the single most complex component. IMAP
responses follow a formally specified grammar (RFC 9051 §9, ABNF notation)
but real-world servers deviate in documented ways.

#### Tokenizer

The tokenizer converts a byte stream into a sequence of typed tokens:

| Token type | Pattern | Example |
| ---------- | -------------------------------- | -------------------------------- |
| ATOM | unquoted non-special chars | `INBOX`, `FLAGS`, `\\Seen` |
| QUOTED | `"` delimited, `\` escapes | `"John \"Doc\" Smith"` |
| LITERAL | `{N}\r\n` + N bytes | `{42}\r\n<42 bytes of data>` |
| NUMBER | digit sequence | `4521` |
| NIL | case-insensitive `NIL` | `NIL` |
| LPAREN | `(` | |
| RPAREN | `)` | |
| LBRACKET | `[` | |
| RBRACKET | `]` | |
| CRLF | `\r\n` | |
| PLUS | `+` (continuation) | |
| STAR | `*` (untagged prefix) | |

**Literal handling.** Synchronizing literals (`{N}\r\n`) require the client
to pause sending and wait for a `+ ` continuation response from the server
before transmitting the literal data. Non-synchronizing literals
(`{N+}\r\n` from LITERAL+ extension, RFC 7888) skip the wait. The
tokenizer must handle both: when receiving, it reads exactly N bytes after
the count line; when sending, it either waits for continuation or streams
immediately based on server capability.

**Stream assembly.** TCP delivers data in arbitrary chunks. The tokenizer
maintains a buffer and a state machine. Partial tokens are buffered until
complete. A literal in the middle of a response spans multiple TCP reads —
the state machine tracks "waiting for N more literal bytes" across chunk
boundaries.

#### Response Parser

Responses are one of three kinds:

| Kind | Format | Meaning |
| ------------ | ---------------------------------------- | ---------------------------------------- |
| Tagged | `A001 OK [CAPABILITY ...] Logged in` | Response to a specific command |
| Untagged | `* 42 FETCH (FLAGS (\\Seen))` | Server-initiated data or command results |
| Continuation | `+ Ready for literal data` | Server requesting more input |

**Tagged responses** carry `OK`, `NO`, or `BAD` status. The tag matches the
command that triggered them. A tagged `OK` completes the command. `NO` means
the command failed. `BAD` means the command was malformed.

**Untagged responses** carry data. During a FETCH command, the server sends
zero or more `* N FETCH (...)` untagged responses followed by a tagged `OK`.
During IDLE, the server sends `* N EXISTS`, `* N EXPUNGE`, and flag change
notifications as untagged responses indefinitely.

**Response codes** appear in brackets after the status: `[UIDVALIDITY 1]`,
`[UIDNEXT 4522]`, `[HIGHESTMODSEQ 73582]`, `[PERMANENTFLAGS (\\Seen
\\Flagged \\Deleted)]`. The parser extracts these as structured data.

#### FETCH Response Decoder

FETCH responses are the most complex structure in IMAP. A single FETCH
response contains multiple data items in a parenthesized list:

```text
* 42 FETCH (
  UID 1234
  FLAGS (\Seen \Flagged)
  INTERNALDATE "27-Mar-2026 10:30:00 +0000"
  RFC822.SIZE 15432
  ENVELOPE ("Thu, 27 Mar 2026 10:30:00 +0000" "Subject here"
    ((NIL NIL "alice" "example.com")) ... )
  BODYSTRUCTURE (("TEXT" "PLAIN" ("CHARSET" "UTF-8") NIL NIL "7BIT" 1234 42)
    ("TEXT" "HTML" ("CHARSET" "UTF-8") NIL NIL "QUOTED-PRINTABLE" 5678 89)
    "ALTERNATIVE")
  BODY[HEADER.FIELDS (FROM TO SUBJECT DATE)] {245}
  <245 bytes of header data>
)
```

The decoder must parse:

- **ENVELOPE** — nested parenthesized structure with address lists. Each
  address is `(name adl mailbox host)` where any field can be NIL. Group
  syntax uses NIL sentinel addresses.
- **BODYSTRUCTURE** — recursive MIME tree. Each leaf is a body type with
  parameters, encoding, size. Multipart nodes wrap children with a subtype.
  Extended data (disposition, language, location) follows the basic fields.
- **BODY[section]** — literal content for a specific MIME part. The section
  spec (`HEADER`, `TEXT`, `1`, `1.2`, `HEADER.FIELDS (...)`) identifies
  which part. The content is a literal (byte count + raw data).
- **FLAGS** — parenthesized list of flag atoms.
- **MODSEQ** — when CONDSTORE is active, a parenthesized `(MODSEQ (N))`
  data item.

#### ENVELOPE Decoder

The ENVELOPE structure is formally defined in RFC 3501 §7.4.2:

```text
envelope = "(" env-date SP env-subject SP env-from SP
           env-sender SP env-reply-to SP env-to SP
           env-cc SP env-bcc SP env-in-reply-to SP
           env-message-id ")"
```

Each `env-*` address field is either NIL or a parenthesized list of address
structures: `((name adl mailbox host)(name adl mailbox host))`. The parser
converts these to typed `Address[]` arrays. NIL in any position is valid —
some servers omit optional fields.

#### BODYSTRUCTURE Decoder

The BODYSTRUCTURE is a recursive representation of the MIME tree:

**Leaf node** (non-multipart):
```text
("TEXT" "PLAIN" ("CHARSET" "UTF-8") NIL NIL "7BIT" 1234 42
  NIL ("INLINE" NIL) NIL NIL)
```
Fields: type, subtype, parameters (key-value pairs), content-id,
description, encoding, size-in-bytes, lines (for text/*), md5, disposition,
language, location.

**Multipart node:**
```text
((leaf1)(leaf2)(leaf3) "MIXED" ("BOUNDARY" "----=_Part_123") NIL NIL NIL)
```
Fields: child parts (recursive), subtype, parameters, disposition,
language, location.

The decoder produces a typed tree:

```typescript
type BodyPart = {
  type: string;
  subtype: string;
  params: Record<string, string>;
  id: string | null;
  description: string | null;
  encoding: string;
  size: number;
  lines?: number;
  disposition?: { type: string; params: Record<string, string> };
  children?: BodyPart[];
  partPath: string;  // derived: "1", "1.2", "2.1.3"
};
```

The `partPath` is derived during tree traversal and maps directly to the
IMAP BODY[partPath] fetch command. This is the bridge between structure
discovery and content retrieval.

#### Modified UTF-7

IMAP4rev1 (RFC 3501) encodes non-ASCII mailbox names in Modified UTF-7 — a
variant of UTF-7 where `&` is the shift character and `/` is replaced by
`,` in the base64 alphabet. Examples:

| Decoded | Encoded |
| ------------- | --------------------------------- |
| Entwürfe | Entw&APw-rfe |
| 日本語 | &ZeVnLIqe- |
| Sent & Trash | Sent &- &- Trash |

The codec is a pair of pure functions: `encodeMailboxName(utf8) → mutf7`
and `decodeMailboxName(mutf7) → utf8`. IMAP4rev2 (RFC 9051) uses UTF-8
directly when the server advertises `UTF8=ACCEPT` — the engine checks
capability and skips encoding when the server supports it.

#### Known Provider Quirks

These are the documented deviations that the parser handles:

| Provider | Quirk | Fix |
| --------------- | -------------------------------------------------------- | ------------------------------------------- |
| Gmail | Extra `X-GM-MSGID`, `X-GM-THRID`, `X-GM-LABELS` in FETCH | Parse as extension data items, expose typed |
| Gmail | `X-GM-RAW` search extension for Gmail-native queries | Support as optional search criterion |
| Gmail | Labels as virtual folders + flags | Map both representations |
| Outlook | Malformed BODYSTRUCTURE on calendar invites | Tolerate missing fields, default to safe values |
| Outlook | Slow IDLE — notifications delayed up to 5 minutes | Document; not fixable client-side |
| Outlook | Extra whitespace in ENVELOPE fields | Trim during parse |
| Yahoo | Literal byte count off-by-one on some encodings | Read actual bytes available, not just count |
| Yahoo | Non-standard flag names (`$Forwarded`, `$Junk`) | Accept any flag atom, don't validate against spec |
| Dovecot | Deeply nested MIME trees crash naive recursive parsers | Iterative traversal with depth limit (default: 50) |
| Exchange | Truncated ENVELOPE on long subjects | Accept partial envelope, fill missing with defaults |
| Exchange | Non-standard `\NonJunk`, `$MDNSent` flags | Accept any flag atom |
| iCloud | Occasional NIL where spec requires string | Coerce NIL to empty string where safe |
| All | Unquoted atoms containing spec-illegal characters | Lenient atom parsing: accept until whitespace/paren |

Strategy: parse strictly first, fall back to lenient mode per-field when
strict parsing fails. Every quirk is a test case.

### Command Dispatcher

IMAP supports command pipelining — multiple commands in flight
simultaneously, identified by unique tags. The dispatcher manages this
concurrency.

**Tagging.** Each command gets a monotonically increasing tag: `A001`,
`A002`, `A003`, etc. The tag prefix is configurable.

**Command queue.** Commands are submitted to the dispatcher, which:

1. Assigns a tag
2. Serializes the command string
3. Sends it over the socket
4. Returns a promise that resolves when the matching tagged response arrives

**Response routing.** As the parser emits parsed responses:

- **Tagged responses** are matched to pending commands by tag. The command's
  promise resolves (OK) or rejects (NO/BAD).
- **Untagged data** during a command (e.g., `* N FETCH` during a FETCH
  command) is collected and delivered with the tagged completion.
- **Unsolicited data** outside any command (EXISTS, EXPUNGE, flag changes)
  is emitted as events.

**Pipelining.** By default, commands are sent one at a time (wait for
tagged response before sending next). Pipelining mode sends multiple
commands without waiting. The response router handles interleaved responses
correctly. Pipelining is opt-in because some servers (notably older Exchange)
handle it poorly.

**Flow control.** The dispatcher respects TCP backpressure. If the socket's
write buffer is full, command serialization pauses until `drain` fires. For
literal uploads (APPEND), the dispatcher handles the synchronizing literal
dance: send command prefix, wait for `+`, send literal bytes.

### Authentication

Four mechanisms, auto-negotiated from server capabilities and the provided
credential config.

| Mechanism | Capability | Wire format | When used |
| ------------- | ------------------- | -------------------------------------------- | -------------------------------------------- |
| LOGIN | (always available) | `A001 LOGIN "user" "pass"` | Simplest. Plaintext over TLS. |
| SASL PLAIN | `AUTH=PLAIN` | `A001 AUTHENTICATE PLAIN\r\n<base64>` | Standard SASL. Single base64 blob. |
| XOAUTH2 | `AUTH=XOAUTH2` | `A001 AUTHENTICATE XOAUTH2\r\n<base64>` | Gmail, Outlook. `user=...\x01auth=Bearer ...\x01\x01` |
| OAUTHBEARER | `AUTH=OAUTHBEARER` | `A001 AUTHENTICATE OAUTHBEARER\r\n<base64>` | RFC 7628. Newer standard. Same providers. |

**Negotiation order:**

1. If OAuth2 credentials provided → try OAUTHBEARER if advertised, then
   XOAUTH2, then fail (don't fall back to plaintext with an OAuth token).
2. If user/pass credentials provided → try PLAIN if advertised, then LOGIN.
3. If custom mechanism provided → attempt directly.

**Token refresh.** OAuth2 access tokens expire (typically 1 hour). The
consumer provides a `refreshFn: () => Promise<string>` callback. When the
server rejects authentication with an expired-token error, the engine:

1. Calls `refreshFn()` to get a new access token
2. Re-attempts authentication with the new token
3. If refresh also fails, rejects with the auth error

The refresh is invisible to the caller — the `connect()` promise resolves
or rejects, never hangs.

OAuth2 providers still require the correct upstream scopes. For Gmail that
typically means full mail scope; for Outlook it means the mail read/write and
send scopes the tenant allows. Wrong-scope failures are surfaced distinctly
from expired-token failures so the consumer can re-authorize instead of
blindly refreshing.

### IMAP Commands

#### Capability

`CAPABILITY` → `string[]`. Issued automatically after connection and after
STARTTLS. The engine caches capabilities and checks them before attempting
extension commands. The capability set determines: which auth mechanisms are
available, whether CONDSTORE/QRESYNC are supported, whether MOVE is atomic,
whether IDLE is supported, whether COMPRESS is available, etc.

`ENABLE` (RFC 5161) → activates server-side features. Required for QRESYNC.
Sent after authentication: `A001 ENABLE QRESYNC` → `* ENABLED QRESYNC`.

`ID` (RFC 2971) → client/server identification. Some servers gate features
behind ID. The engine sends a standard identification: `("name" "email"
"version" "1.0.0")`.

#### Folder Operations

| Command | Typed result | Notes |
| --------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| `LIST "" "*"` | `Folder[]` | All folders with flags, delimiter, SPECIAL-USE |
| `LIST "" "%" RETURN (SPECIAL-USE)` | `Folder[]` | Top-level with roles (RFC 6154) |
| `NAMESPACE` | `{ personal, other, shared }` | Prefix and delimiter per namespace |
| `SELECT "INBOX"` | `SelectedFolder` | Opens r/w: exists, recent, flags, permanentFlags, uidValidity, uidNext, highestModSeq |
| `EXAMINE "INBOX"` | `SelectedFolder` | Opens read-only, same response format |
| `CREATE "Archive/2026"` | `void` | Creates folder, including intermediates |
| `DELETE "Old Stuff"` | `void` | Removes folder (must be empty on most servers) |
| `RENAME "Old" "New"` | `void` | Renames folder |
| `SUBSCRIBE "Shared/Team"` | `void` | Adds to subscription list |
| `UNSUBSCRIBE "Shared/Team"` | `void` | Removes from subscription list |
| `STATUS "INBOX" (MESSAGES UNSEEN)` | `FolderStatus` | Quick counts without SELECT |

**Folder roles** (SPECIAL-USE, RFC 6154):

| Flag | Role | Meaning |
| ------------ | ------- | ---------------------------------------- |
| `\All` | all | All messages (Gmail's "All Mail") |
| `\Archive` | archive | Archived messages |
| `\Drafts` | drafts | Draft compositions |
| `\Flagged` | flagged | Starred/flagged messages |
| `INBOX` (special name) | inbox | Primary inbox folder |
| `\Junk` | junk | Spam |
| `\Sent` | sent | Sent messages |
| `\Trash` | trash | Deleted messages awaiting expunge |

When the server doesn't advertise SPECIAL-USE, the engine falls back to
name-based heuristics: `Sent`, `Sent Messages`, `Sent Items` → sent;
`Drafts` → drafts; `Trash`, `Deleted Items`, `Deleted Messages` → trash;
`Junk`, `Spam` → junk; `Archive` → archive. The heuristic checks common
names in English, German (`Entwürfe`, `Papierkorb`, `Gesendet`), French
(`Brouillons`, `Corbeille`, `Envoyés`), and Spanish (`Borradores`,
`Papelera`, `Enviados`).

#### Message Operations

**FETCH** — the primary data retrieval command. Supports both sequence
numbers and UIDs.

| Data item | What it returns | When to use |
| ------------------------------- | --------------------------------- | ---------------------------------------- |
| `FLAGS` | Current flags | Listing, sync |
| `UID` | Unique ID | Always (stable across sessions) |
| `ENVELOPE` | Parsed headers structure | Listing, threading |
| `BODYSTRUCTURE` | MIME tree without content | Structure discovery |
| `RFC822.SIZE` | Message size in bytes | Listing, quota |
| `INTERNALDATE` | Server receive timestamp | Sorting |
| `BODY[HEADER]` | Raw headers | Full header access |
| `BODY[TEXT]` | Raw body | Full body access |
| `BODY[1]` | First MIME part content | Text body fetch |
| `BODY[1.2]` | Nested MIME part | Specific attachment |
| `BODY.PEEK[...]` | Same as BODY[] but doesn't set \Seen | Non-destructive reads |
| `BODY.PEEK[part]<offset.count>` | Partial byte range | Large body and attachment streaming |
| `MODSEQ` | Modification sequence (CONDSTORE) | Incremental sync |

**SEARCH** — query messages by criteria. Returns a list of sequence numbers
or UIDs.

| Criterion | Syntax | Example |
| ------------- | ---------------------------------------- | ---------------------------------------- |
| All | `ALL` | Every message |
| Unseen | `UNSEEN` | Unread messages |
| Since date | `SINCE 01-Mar-2026` | Messages after date |
| Before date | `BEFORE 01-Jan-2026` | Messages before date |
| From | `FROM "alice@example.com"` | Sender match |
| To | `TO "bob@example.com"` | Recipient match |
| Subject | `SUBJECT "quarterly report"` | Subject contains |
| Body | `BODY "invoice"` | Body contains |
| Header | `HEADER "X-Mailer" "Thunderbird"` | Custom header match |
| Flagged | `FLAGGED` | Starred messages |
| Larger | `LARGER 1000000` | Over 1MB |
| Or | `OR FROM "a" FROM "b"` | Boolean or |
| Not | `NOT DELETED` | Negation |
| And | `FROM "a" SINCE 01-Jan-2026` | Implicit and (juxtaposition) |
| UID set | `UID 1:100,200:*` | Specific UIDs |

The engine provides a typed query builder that compiles to IMAP SEARCH
syntax:

```typescript
type SearchQuery = {
  all?: boolean;
  unseen?: boolean;
  seen?: boolean;
  flagged?: boolean;
  answered?: boolean;
  deleted?: boolean;
  draft?: boolean;
  since?: Date;
  before?: Date;
  on?: Date;
  from?: string;
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  text?: string;
  header?: { name: string; value: string };
  larger?: number;
  smaller?: number;
  uid?: string;
  modseq?: number;
  gmailRaw?: string;
  or?: [SearchQuery, SearchQuery];
  not?: SearchQuery;
};
```

`gmailRaw` is only compiled when the selected account advertises Gmail search
extensions. All other providers reject it with a typed unsupported-feature
error instead of silently ignoring it.

**STORE** — set, add, or remove flags.

| Action | Syntax | Effect |
| ------ | ---------------------------------------- | --------------------------------- |
| Set | `STORE 1:5 FLAGS (\Seen)` | Replace all flags |
| Add | `STORE 1:5 +FLAGS (\Seen \Flagged)` | Add flags |
| Remove | `STORE 1:5 -FLAGS (\Flagged)` | Remove flags |
| Silent | `STORE 1:5 +FLAGS.SILENT (\Seen)` | Add without echoing new flags |

Silent mode avoids the server echoing back updated flags — saves bandwidth
when the client already knows the result.

**COPY, MOVE, EXPUNGE:**

| Command | What | Notes |
| ---------------------------------------- | --------------------------------- | ---------------------------------------- |
| `UID COPY 1:5 "Archive"` | Copy messages to folder | Returns COPYUID mapping (UIDPLUS) |
| `UID MOVE 1:5 "Archive"` | Atomic move (RFC 6851) | COPY+STORE+EXPUNGE in one command |
| `EXPUNGE` | Remove all \Deleted messages | Irreversible |
| `UID EXPUNGE 1,3,5` | Remove specific \Deleted UIDs | Requires UIDPLUS (RFC 4315) |

When MOVE is not supported, the engine falls back to the three-step
COPY → STORE +FLAGS (\Deleted) → EXPUNGE sequence.

**APPEND** — upload a message to a folder:

```text
A001 APPEND "Sent" (\Seen) "27-Mar-2026 10:30:00 +0000" {1234}
<1234 bytes of RFC 5322 message>
```

Used after sending (append to Sent), saving drafts (append to Drafts), and
importing messages. Returns APPENDUID if the server supports UIDPLUS.

#### IDLE

IDLE (RFC 2177) is the push notification mechanism. After sending `IDLE`,
the server streams unsolicited responses until the client sends `DONE`.

```text
C: A001 IDLE
S: + idling
... (time passes) ...
S: * 43 EXISTS
S: * 42 FETCH (FLAGS (\Seen \Flagged))
C: DONE
S: A001 OK IDLE terminated
```

The engine wraps IDLE in an async iterator:

```typescript
for await (const event of session.idle({ signal, timeout })) {
  switch (event.type) {
    case "exists": // new message count
    case "expunge": // message removed
    case "fetch": // flags changed
  }
}
```

**Timeout.** Most servers terminate IDLE after 30 minutes. The engine
auto-renews: sends `DONE`, collects the OK, immediately re-enters IDLE.
Configurable via `idleTimeout` (default: 25 minutes — 5 minutes before
typical server cutoff).

**AbortSignal.** The consumer can cancel IDLE via an `AbortController`. On
abort, the engine sends `DONE` and returns cleanly.

### Extensions

Extensions are auto-negotiated from `CAPABILITY`. The engine checks for
each extension before using it and falls back to base protocol when
unavailable.

#### CONDSTORE / QRESYNC (RFC 7162)

The efficient sync mechanism. CONDSTORE adds a `MODSEQ` value to every
message and folder. QRESYNC allows the client to resume sync from a known
state.

**CONDSTORE.** After `ENABLE CONDSTORE`:

- FETCH responses include `MODSEQ (N)` per message
- SELECT/EXAMINE responses include `[HIGHESTMODSEQ N]`
- `STORE ... (UNCHANGEDSINCE N)` enables conditional flag updates
- `SEARCH ... MODSEQ N` finds messages changed since a mod-sequence

**QRESYNC.** After `ENABLE QRESYNC`:

- SELECT can include known UID state: `SELECT "INBOX" (QRESYNC
  (uidvalidity highestModSeq knownUids))`
- Server responds with `VANISHED (EARLIER) uid-set` for expunged messages
  and FETCH responses for changed messages
- No need to compare full UID lists — delta sync in one command

This is the key to efficient incremental sync. Without it, the engine falls
back to UID comparison (fetch all UIDs, diff against local, fetch new,
detect expunged).

#### SPECIAL-USE (RFC 6154)

Standardized folder roles. The engine requests SPECIAL-USE in LIST:

```text
A001 LIST "" "*" RETURN (SPECIAL-USE)
```

Folder responses include role flags: `* LIST (\Sent \HasNoChildren)
"/" "Sent"`. These map to the `role` field on `Folder` objects.

#### MOVE (RFC 6851)

Atomic message move. Without it: `COPY` + `STORE +FLAGS (\Deleted)` +
`EXPUNGE` — three commands with a race window.

#### UIDPLUS (RFC 4315)

Extends APPEND and COPY with UID feedback:

- `APPENDUID validity uid` — the UID of the newly appended message
- `COPYUID validity source-uids dest-uids` — UID mapping after copy
- `UID EXPUNGE uid-set` — expunge specific UIDs only (prevents
  accidentally expunging messages flagged by another session)

#### SORT / THREAD (RFC 5256)

Server-side sorting and threading when supported:

```text
A001 UID SORT (DATE) UTF-8 SINCE 01-Mar-2026
A001 UID THREAD REFERENCES UTF-8 ALL
```

The engine prefers server-side THREAD for conversation reconstruction when
available. Falls back to client-side threading from References/In-Reply-To
headers.

#### COMPRESS=DEFLATE (RFC 4978)

After `COMPRESS DEFLATE` + `OK`, both directions are wrapped in zlib
deflate/inflate streams via `node:zlib`. Reduces bandwidth 60-80% for
typical email workloads. The engine activates compression automatically
when the server supports it.

#### NAMESPACE (RFC 2342)

Reveals mailbox hierarchy structure:

```text
A001 NAMESPACE
* NAMESPACE (("" "/")) (("Other Users/" "/")) (("Shared/" "/"))
```

The engine uses namespace info to:
- Determine the correct path prefix for personal folders
- Detect shared/other-user folders
- Use the correct hierarchy delimiter (usually `/` or `.`)

#### ID (RFC 2971)

Client/server identification. Some corporate servers require ID before
allowing full access:

```text
A001 ID ("name" "email-engine" "version" "1.0.0")
* ID ("name" "Dovecot" "version" "2.3.21")
```

The engine sends ID automatically after authentication when the server
advertises the capability.

#### QUOTA (RFC 9208)

Storage quota information:

```text
A001 GETQUOTAROOT "INBOX"
* QUOTAROOT "INBOX" ""
* QUOTA "" (STORAGE 45321 102400)
```

Exposed as `{ used: number, limit: number }` in kilobytes. The consumer
can check quota before large APPEND operations.

#### Additional Optional Extensions

These round out normal GUI parity and large-mailbox ergonomics. The engine
uses them opportunistically when available and degrades cleanly when not.

| Extension | RFC | What it adds | Fallback |
| ----------------- | -------- | -------------------------------------------------- | ---------------------------------------- |
| `UNSELECT` | 3691 | Leave the selected folder without closing the session | `CLOSE` or re-SELECT another folder |
| `LIST-STATUS` | 5819 | Folder list + counts in one round-trip | `LIST` + per-folder `STATUS` |
| `ESEARCH` | 4731 | Search result counts, MIN/MAX, UID metadata | Plain `SEARCH` |
| `BINARY` | 3516 | Binary-safe body fetch without transfer re-encoding | `BODY.PEEK[...]` + decode |
| `LITERAL-` / `LITERAL+` | 7888 | Faster literal send behavior | Synchronizing literals |
| `APPENDLIMIT` | 7889 | Per-mailbox max append size | SMTP/IMAP size check only |
| `ACL` | 4314 | Shared-mailbox permissions inspection | Read-only best effort |
| `METADATA` | 5464 | Folder/server annotations | Ignore metadata surfaces |

ACL and METADATA are optional convenience surfaces, not required for base
single-user mailbox management. The package remains fully functional without
them.

## MIME Engine

### Parsing (Inbound)

The MIME parser converts raw RFC 5322 message bytes into a typed structure.
It handles the full complexity of real-world email: nested multipart,
encoded headers, charset conversion, and attachment extraction.

#### Header Decoding

RFC 5322 headers are unfolded (continued lines start with whitespace) and
decoded. Structured headers (From, To, Date, Content-Type) are parsed into
typed values. Unstructured headers (Subject, Comments) are decoded for
RFC 2047 encoded words.

**RFC 2047 encoded words:**
```text
=?UTF-8?B?SGVsbG8gV29ybGQ=?=     → "Hello World" (base64)
=?ISO-8859-1?Q?Entw=FCrfe?=      → "Entwürfe" (quoted-printable)
=?UTF-8?Q?=E6=97=A5=E6=9C=AC?=   → "日本" (UTF-8 QP)
```

The decoder handles: charset specification, base64 and quoted-printable
transfer encodings, multi-word sequences (adjacent encoded words with
intervening whitespace are concatenated), and nested encoding. Charsets are
decoded via `TextDecoder` for WHATWG-supported encodings. In practice this
covers UTF-8, ISO-8859-* variants, Windows-1252, KOI8-R, Shift_JIS, EUC-JP,
GBK/GB2312, Big5, and the other labels Node exposes through the platform text
decoding stack. Unknown charsets fall back to raw-byte preservation plus a
typed decode warning rather than silent corruption.

**Address parsing:**

```text
"Alice Smith" <alice@example.com>    → { name: "Alice Smith", address: "alice@example.com" }
alice@example.com                    → { name: undefined, address: "alice@example.com" }
=?UTF-8?B?...?= <bob@example.com>   → { name: "decoded name", address: "bob@example.com" }
undisclosed-recipients:;             → group with empty member list
```

**Date parsing:**

RFC 5322 dates are parsed to ISO 8601 timestamps. The parser handles
the full range of formats found in the wild:

```text
Thu, 27 Mar 2026 10:30:00 +0000      → standard
27 Mar 2026 10:30:00 +0000           → no day-of-week
Thu, 27 Mar 2026 10:30 +0000         → no seconds
Thu, 27 Mar 2026 10:30:00 GMT        → named timezone
```

**Content-Type parsing:**

```text
Content-Type: multipart/mixed; boundary="----=_Part_123"
→ { type: "multipart", subtype: "mixed", params: { boundary: "----=_Part_123" } }

Content-Type: text/plain; charset="utf-8"; format=flowed
→ { type: "text", subtype: "plain", params: { charset: "utf-8", format: "flowed" } }
```

#### Body Decoding

Content-Transfer-Encoding determines how the body bytes are encoded for
transit:

| Encoding | Decoding | Notes |
| ----------------- | ---------------------------------------- | -------------------------------- |
| 7bit | Identity (no decoding) | ASCII-only content |
| 8bit | Identity | 8-bit clean content |
| binary | Identity | Raw bytes |
| base64 | `Buffer.from(data, "base64")` | Binary attachments |
| quoted-printable | `=XX` hex pairs → bytes, `=\r\n` soft breaks | Text with occasional non-ASCII |

After transfer decoding, charset decoding converts the raw bytes to a
JavaScript string using `TextDecoder(charset)`. For binary attachments
(images, PDFs, etc.), the result is a `Buffer` — no charset decoding.

#### Multipart Parsing

Multipart messages use a boundary string to separate parts:

```text
Content-Type: multipart/mixed; boundary="----=_Part_123"

------=_Part_123
Content-Type: text/plain; charset="utf-8"

Hello, world.
------=_Part_123
Content-Type: application/pdf; name="report.pdf"
Content-Disposition: attachment; filename="report.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQK...
------=_Part_123--
```

The parser splits on `--boundary` lines, recursively parses each part
(which may itself be multipart), and produces a tree. The closing
`--boundary--` terminates the multipart body. Preamble (before first
boundary) and epilogue (after closing boundary) are discarded per spec.

**Nested multipart structures** in real email:

```text
multipart/mixed
├── multipart/alternative
│   ├── text/plain          ← plain text body
│   └── multipart/related
│       ├── text/html       ← HTML body
│       └── image/png       ← inline image (CID)
├── application/pdf         ← attachment
└── message/rfc822          ← forwarded email (recursive parse)
```

The parser handles arbitrary nesting depth (configurable limit, default: 50
levels).

#### Attachment Extraction

An attachment is any MIME part with:
- `Content-Disposition: attachment` (explicit), OR
- A `filename` parameter on Content-Type or Content-Disposition, OR
- A non-text, non-multipart, non-message Content-Type without
  `Content-Disposition: inline`

Inline parts (typically images referenced by `cid:` URLs in HTML bodies)
are tracked separately with their Content-ID for HTML rendering.

```typescript
type Attachment = {
  filename: string;
  mimeType: string;
  size: number;
  contentId: string | null;
  inline: boolean;
  partPath: string;
  content: Buffer;  // decoded binary
};
```

#### Thread Reconstruction

Conversations are threaded using the JWZ algorithm (Jamie Zawinski's
threading algorithm, the industry standard used by Thunderbird, Apple Mail,
and most email clients):

1. **Group by References + In-Reply-To.** Each message's References header
   contains the full ancestor chain. In-Reply-To contains the immediate
   parent. Build a graph.
2. **Find thread roots.** Messages with no parent in the References chain
   are roots.
3. **Handle broken references.** Some clients omit References or include
   partial chains. The algorithm uses subject-based grouping as a fallback:
   messages with identical normalized subjects (strip `Re:`, `Fwd:`,
   `[tag]` prefixes) within a time window are grouped.
4. **Sort within threads.** By date ascending within each thread — the
   conversation reads chronologically.

The `threadId` field on each message is the `messageId` of the thread root.
When Gmail's `X-GM-THRID` is available, it is stored as provider metadata and
used as a stable hint during reconciliation, but never replaces the portable
thread identity derived from RFC headers.
Thread queries return ordered message arrays with depth indicators for
display.

### Composition (Outbound)

The composition engine builds valid RFC 5322 messages for sending via SMTP
and archiving via IMAP APPEND.

#### Message Building

```typescript
type ComposeInput = {
  from: Address;
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  sender?: Address;
  envelopeFrom?: Address;
  replyTo?: Address;
  subject: string;
  text?: string;
  html?: string;
  attachments?: ComposeAttachment[];
  inReplyTo?: string;
  references?: string[];
  headers?: Record<string, string>;
};

type ComposeAttachment = {
  filename: string;
  content: Buffer;
  mimeType?: string;
  inline?: boolean;
  contentId?: string;
};
```

The composer produces the correct MIME structure based on what's provided:

| Input | Structure |
| ---------------------------------------- | ---------------------------------------- |
| text only | text/plain |
| html only | text/html |
| text + html | multipart/alternative (text/plain + text/html) |
| text + attachments | multipart/mixed (text/plain + attachments) |
| text + html + attachments | multipart/mixed (multipart/alternative + attachments) |
| html + inline images + attachments | multipart/mixed (multipart/related (text/html + inline) + attachments) |

**Header construction:**

- `Message-ID`: `<timestamp.random@sender-domain>` — unique, unforgeable
- `Date`: RFC 5322 formatted current timestamp
- `MIME-Version`: `1.0`
- `Content-Type`: derived from structure
- `From`, `Sender`, `To`, `Cc`: RFC 2047 encoded if non-ASCII names
- `Subject`: RFC 2047 encoded if non-ASCII
- `In-Reply-To`, `References`: set for replies and forwards
- `User-Agent`: optional, configurable

`Bcc` handling is explicit:

- When composing, `bcc` participates in SMTP `RCPT TO`.
- For the local sent and draft copy, `Bcc` is preserved so the user can see
  what they actually sent.
- For the transmitted message body delivered to non-Bcc recipients, the `Bcc`
  header is omitted.
- If the consumer requests per-recipient archival parity with GUI behavior, the
  engine may append the fully-authored local copy to Sent while transmitting a
  scrubbed transport copy over SMTP.

**Attachment encoding:**

- Binary content → base64 with 76-character line wrapping
- Filename → RFC 2231 encoded if non-ASCII:
  `filename*=UTF-8''Entw%C3%BCrfe.pdf`
- Content-Disposition: `attachment; filename="report.pdf"` or
  `inline; filename="logo.png"` for inline images
- Content-ID: `<cid-random@domain>` for inline images

#### Reply Composition

`composeReply(original, replyInput)` builds a standards-compliant reply:

1. **Set In-Reply-To** to the original's Message-ID
2. **Set References** to the original's References + original's Message-ID
3. **Set Subject** to `Re: ` + original subject (avoid stacking:
   `Re: Re: Re:` → just `Re:`)
4. **Set To** to the original's Reply-To (if present) or From
5. **For reply-all:** add original's To and Cc (excluding self) to Cc
6. **Quote the original body:**
   ```text
   On Mar 27, 2026, at 10:30, Alice <alice@example.com> wrote:
   > Original message text here.
   > Second line of original.
   ```
7. **For HTML replies:** wrap the quoted original in a `<blockquote>` with
   appropriate styling

\"Excluding self\" uses the configured identity set for the account: the primary
auth user address plus any explicit aliases the consumer registers. The engine
never guesses from display names alone.

#### Forward Composition

`composeForward(original, forwardInput)` builds a forward:

1. **Set Subject** to `Fwd: ` + original subject (avoid stacking)
2. **Two modes:**
   - **Inline forward:** original body quoted below a separator:
     ```text
     ---------- Forwarded message ----------
     From: Alice <alice@example.com>
     Date: Mar 27, 2026
     Subject: Original subject
     To: Bob <bob@example.com>

     Original message body here.
     ```
   - **Attachment forward:** original message attached as
     `message/rfc822` — preserves all headers, structure, and
     attachments exactly
3. **Attachments from original** can optionally be included in the forward

## SMTP Client

A minimal, complete SMTP client for sending composed messages. SMTP is
dramatically simpler than IMAP — it's a linear command-response protocol
with no concurrency, no persistent state, and a small command set.

### Connection

**Direct TLS** (port 465, implicit): TLS from the start. The standard for
modern providers.

**STARTTLS** (port 587, submission): Plaintext greeting, then `EHLO`,
then `STARTTLS` upgrade. The standard submission port.

**Plaintext** (port 25, relay): No encryption. Only for local/testing
relays. Disabled by default — the consumer must explicitly opt in via
`allowInsecure: true`.

### Commands

| Command | Purpose | Response |
| --------------------------------- | --------------------------------- | ------------------------------ |
| `EHLO client.example.com` | Greeting + capability negotiation | `250-` capability lines |
| `AUTH PLAIN <base64>` | Authentication | `235 Authentication successful` |
| `AUTH XOAUTH2 <base64>` | OAuth2 authentication | `235 Authentication successful` |
| `MAIL FROM:<sender@example.com>` | Envelope sender | `250 OK` |
| `RCPT TO:<recipient@example.com>` | Envelope recipient (one per) | `250 OK` |
| `DATA` | Begin message body | `354 Start mail input` |
| `<message bytes>\r\n.\r\n` | End of message body | `250 OK: queued as ...` |
| `QUIT` | Close connection | `221 Bye` |

**Dot stuffing.** Lines in the message body starting with `.` are escaped
by prepending an additional `.`. The terminating `.\r\n` is not part of the
message.

**Envelope policy.**

- Default `MAIL FROM` uses `input.envelopeFrom ?? input.sender ?? input.from`.
- `RCPT TO` is the union of `to`, `cc`, and `bcc`, deduplicated by normalized
  address.
- If the server rejects a `MAIL FROM` that does not align with the
  authenticated identity, the engine raises a typed `EnvelopeRejectedError`
  rather than silently rewriting the sender.
- `Bcc` recipients are never leaked into the transmitted header block.

**Auth mechanisms.** Same as IMAP: PLAIN, LOGIN, XOAUTH2, OAUTHBEARER.
The engine checks `EHLO` response for `AUTH` capabilities and negotiates
identically to the IMAP auth flow.

**Size limits.** The `EHLO` response may include `SIZE N` indicating the
maximum message size. The engine checks this before sending and rejects
oversized messages with a clear error.

**Pipeline.** SMTP pipelining (RFC 2920) allows sending `MAIL FROM` +
`RCPT TO` commands without waiting for individual responses. The engine
uses pipelining when `PIPELINING` is advertised in `EHLO`.

**Additional SMTP capabilities.**

- `SMTPUTF8` — when advertised, permits non-ASCII addresses and header values.
  Without it, the engine requires ASCII mailbox local-parts and punycode-safe
  domains.
- `CHUNKING` / `BDAT` — when advertised, the engine may stream very large
  messages in chunks instead of buffering one giant dot-stuffed payload.
- `DSN` — delivery status notifications are optional. The engine exposes
  request hooks but does not guarantee provider support.

### Send Flow

`send(message: ComposedMessage)` executes:

1. Connect (TLS or STARTTLS)
2. `EHLO` — negotiate capabilities
3. `AUTH` — authenticate
4. `MAIL FROM` — envelope sender
5. `RCPT TO` — one per recipient (To + Cc + Bcc)
6. `DATA` — transmit the RFC 5322 message bytes
7. `QUIT` — close

For bulk sending, the engine supports connection reuse: authenticate once,
send multiple messages, then quit. The consumer calls `connect()` +
`authenticate()` once, then `send()` multiple times, then `disconnect()`.

### Error Handling

SMTP errors are categorized:

| Code range | Meaning | Retriable? |
| ---------- | -------------------------------- | ---------- |
| 2xx | Success | — |
| 4xx | Temporary failure | Yes |
| 5xx | Permanent failure | No |
| 421 | Server shutting down | Yes (reconnect) |
| 450 | Mailbox busy | Yes (retry later) |
| 451 | Server error | Yes |
| 452 | Insufficient storage | Yes (retry later) |
| 550 | Mailbox not found | No |
| 553 | Invalid address | No |
| 554 | Transaction failed | No |

The engine returns structured errors with the SMTP code, enhanced status
code (if available), and the server's human-readable message.

## Sync Engine

The sync engine bridges the stateless IMAP protocol with persistent local
state in SQLite. After sync, the local database is a metadata-complete,
queryable mirror of the mailbox — no network calls needed for folder lists,
message listings, threading, and local search. Bodies and attachments are
fetched on demand by default, and can be backfilled into a body-complete local
mirror when the consumer wants full offline access.

### Storage

SQLite via `node:sqlite` (Node 22+). One database file per consumer
configuration. Supports `:memory:` for testing.

#### Schema

```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT NOT NULL,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE folders (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  path TEXT NOT NULL,
  delimiter TEXT NOT NULL DEFAULT '/',
  role TEXT,
  uid_validity INTEGER,
  uid_next INTEGER,
  highest_mod_seq INTEGER,
  message_count INTEGER,
  unseen_count INTEGER,
  last_synced_at TEXT,
  UNIQUE(account_id, path)
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  folder_id INTEGER NOT NULL REFERENCES folders(id),
  uid INTEGER NOT NULL,
  message_id TEXT,
  in_reply_to TEXT,
  "references" TEXT,
  thread_id TEXT,
  subject TEXT,
  "from" TEXT,
  "to" TEXT,
  cc TEXT,
  bcc TEXT,
  reply_to TEXT,
  envelope_from TEXT,
  envelope_to TEXT,
  "date" TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  flags TEXT NOT NULL DEFAULT '[]',
  labels TEXT NOT NULL DEFAULT '[]',
  size INTEGER,
  body_structure TEXT,
  has_attachments INTEGER NOT NULL DEFAULT 0,
  mod_seq INTEGER,
  UNIQUE(folder_id, uid)
);

CREATE TABLE bodies (
  message_id INTEGER PRIMARY KEY REFERENCES messages(id),
  text_plain TEXT,
  text_html TEXT,
  raw BLOB
);

CREATE TABLE attachments (
  id INTEGER PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id),
  filename TEXT,
  mime_type TEXT,
  size INTEGER,
  content_id TEXT,
  part_path TEXT NOT NULL,
  inline_flag INTEGER NOT NULL DEFAULT 0,
  data BLOB
);

CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY,
  folder_id INTEGER NOT NULL REFERENCES folders(id),
  action TEXT NOT NULL,
  uid INTEGER NOT NULL,
  details TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

JSON-encoded fields: `references` (string array), `flags` (string array),
`labels` (string array), `from`/`to`/`cc`/`bcc`/`reply_to`/`envelope_from`/
`envelope_to` (address
objects or arrays), `body_structure` (recursive MIME tree).

#### Full-Text Search

FTS5 virtual table for instant local search across all synced messages:

```sql
CREATE VIRTUAL TABLE messages_fts USING fts5(
  subject,
  body_text,
  sender,
  recipients,
  content=messages,
  content_rowid=id,
  tokenize='porter unicode61 remove_diacritics 2'
);
```

The tokenizer uses Porter stemming with Unicode support and diacritics
removal — `"invoices"` matches `"invoice"`, `"München"` matches `"munchen"`.
FTS content is populated during sync: subject and decoded text/plain body
go into the index. HTML bodies are stripped to plain text before indexing by a
deterministic HTML-to-text pass: drop `script`/`style`, decode entities,
preserve block boundaries as newlines, collapse whitespace.

**Triggers** keep the FTS index in sync:

```sql
CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, subject, body_text, sender, recipients)
  VALUES (new.id, new.subject, '', new."from", new."to");
END;

CREATE TRIGGER messages_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, subject, body_text, sender, recipients)
  VALUES ('delete', old.id, old.subject, '', old."from", old."to");
END;

CREATE TRIGGER messages_au AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, subject, body_text, sender, recipients)
  VALUES ('delete', old.id, old.subject, '', old."from", old."to");
  INSERT INTO messages_fts(rowid, subject, body_text, sender, recipients)
  VALUES (new.id, new.subject, '', new."from", new."to");
END;
```

Body text is inserted asynchronously when bodies are fetched — the trigger on
initial message insert uses an empty string for `body_text`, and the update
path rewrites the FTS row when body content becomes available.

**Search API:**

```typescript
search(query: string): Message[]
```

Uses FTS5 query syntax: simple terms, phrase matching (`"exact phrase"`),
prefix matching (`invoic*`), boolean operators (`invoice OR receipt`),
column filtering (`subject:quarterly`).

#### Indexes

```sql
CREATE INDEX idx_messages_folder ON messages(folder_id, uid);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_date ON messages("date" DESC);
CREATE INDEX idx_messages_message_id ON messages(message_id);
CREATE INDEX idx_messages_flags ON messages(folder_id, flags);
CREATE INDEX idx_attachments_message ON attachments(message_id);
CREATE INDEX idx_sync_log_folder ON sync_log(folder_id, synced_at);
```

### Sync Operations

#### Initial Sync

First-time sync for a folder. Downloads all message metadata (envelope,
flags, structure, size) without bodies.

1. `SELECT folder` → get UIDVALIDITY, UIDNEXT, HIGHESTMODSEQ, message
   count
2. Store UIDVALIDITY and HIGHESTMODSEQ in the folders table
3. `UID FETCH 1:* (UID FLAGS ENVELOPE BODYSTRUCTURE RFC822.SIZE
   INTERNALDATE)` — full metadata fetch
4. Parse each FETCH response into a message row
5. Compute `threadId` from References/In-Reply-To
6. Detect `hasAttachments` from BODYSTRUCTURE
7. Insert all messages in a single transaction
8. Update folder counts

For large mailboxes (10,000+ messages), the fetch is batched:
`UID FETCH 1:500`, `501:1000`, etc. Batch size is configurable (default:
500).

**Cost:** ~200 bytes per message for metadata. 10,000 messages ≈ 2MB of
transfer + SQLite storage. Initial sync of a typical inbox: 5-30 seconds
depending on server and message count.

#### Incremental Sync (QRESYNC)

When CONDSTORE/QRESYNC is available (Gmail, Fastmail, modern Dovecot):

1. `SELECT folder (QRESYNC (uidValidity highestModSeq knownUidSet))` —
   resume from last known state
2. Server responds with:
   - `VANISHED (EARLIER) uid-set` — UIDs expunged since last sync
   - `* N FETCH (UID M FLAGS (...) MODSEQ (Q))` — messages with changed
     flags or new messages since last mod-seq
3. Delete vanished UIDs from local store
4. Update flags for changed messages
5. Insert new messages
6. Update folder's HIGHESTMODSEQ

**Cost:** Only changed messages are transferred. A mailbox with 50,000
messages where 3 new arrived and 2 had flag changes transfers ~5 messages
of metadata. Sub-second sync.

#### Incremental Sync (Fallback)

When CONDSTORE/QRESYNC is unavailable:

1. `SELECT folder` → get current UIDVALIDITY, UIDNEXT
2. If UIDVALIDITY changed → full re-sync (mailbox was rebuilt)
3. `UID SEARCH ALL` → get complete UID list
4. Compare against local UIDs:
   - UIDs in remote but not local → fetch metadata for new messages
   - UIDs in local but not remote → mark as expunged, delete from store
5. `UID FETCH 1:* (UID FLAGS)` → sync flags for all messages
6. Compare flags, update changed ones

**Cost:** Full UID list + flag sync every time. 10,000 messages ≈ ~100KB
of flag data per sync. Slower than QRESYNC but correct.

#### UIDVALIDITY Handling

UIDVALIDITY is a per-folder version number. When it changes (rare — server
rebuilt the mailbox), all previously cached UIDs are invalid. The engine:

1. Detects UIDVALIDITY change on SELECT
2. Drops all messages for that folder from local store
3. Performs a full initial sync
4. Logs the event in sync_log

This is unavoidable — the IMAP spec guarantees nothing about UID stability
across UIDVALIDITY changes.

#### Body Fetch

Bodies are fetched on demand, not during sync. This keeps initial sync fast
and storage lean.

```typescript
fetchBody(uid: number): { textPlain: string, textHtml: string, raw?: Buffer }
```

1. Check local `bodies` table — return cached if available
2. `UID FETCH uid (BODY.PEEK[])` — fetch full RFC 5322 message
3. Parse the MIME structure
4. Extract text/plain and text/html parts, decode charset
5. Store in `bodies` table
6. Update FTS index with body text
7. Return decoded content

**Selective fetch.** For messages with large attachments, the engine can
fetch specific MIME parts instead of the full message:
`UID FETCH uid (BODY.PEEK[1])` fetches only the first text part.

**Body-complete mode.** Consumers that need a fully offline analytical mirror
can run a body backfill pass after metadata sync. This iterates unsatisfied
messages, fetches bodies in batches, populates `bodies`, and updates FTS. The
default remains metadata-first because it keeps initial sync fast.

#### Attachment Fetch

Similar to body fetch — on demand with local caching.

```typescript
fetchAttachment(uid: number, partPath: string): Attachment
```

1. Check local `attachments` table — return cached if `data` is populated
2. `UID FETCH uid (BODY.PEEK[partPath])` — fetch specific MIME part
3. Decode transfer encoding (base64 → Buffer)
4. Store decoded data in `attachments` table
5. Return `{ filename, mimeType, size, content: Buffer }`

#### Thread Sync

After message sync, threads are computed locally:

1. Query all messages with non-null `references` or `in_reply_to`
2. Build the reference graph
3. Compute thread roots
4. Update `thread_id` for all messages in affected threads

Thread computation is pure SQL + in-memory graph traversal. No network
calls.

### Watch (Real-Time)

The watch system uses IDLE for real-time mailbox monitoring:

```typescript
for await (const event of store.watch("INBOX", { signal })) {
  switch (event.type) {
    case "new":      // new message(s) arrived, auto-synced
    case "flags":    // flags changed on existing message(s)
    case "expunge":  // message(s) removed
  }
}
```

When a new EXISTS notification arrives during IDLE:

1. Exit IDLE (send `DONE`)
2. Fetch metadata for new messages (UIDs > last known UIDNEXT)
3. Insert into local store
4. Emit `new` event with message metadata
5. Re-enter IDLE

This gives the consumer near-real-time message arrival with automatic
local caching — no manual sync needed while watching.

## High-Level API

The porcelain surface that wires everything together. This is what most
consumers import.

### Configuration

```typescript
type EmailConfig = {
  imap: {
    host: string;
    port: number;
    tls?: boolean;   // default: true (port 993)
  };
  smtp: {
    host: string;
    port: number;
    tls?: boolean;   // default: true (port 465)
  };
  auth: AuthConfig;
  identities?: Address[];  // primary address + aliases for reply-all/self filtering
  storage?: string;  // SQLite path, default: ":memory:"
};

type AuthConfig =
  | { user: string; pass: string }
  | {
      user: string;
      accessToken: string;
      refreshToken?: string;
      refreshFn?: () => Promise<string>;
    }
  | { mechanism: string; credentials: Record<string, string> };
```

### Mailbox Surface

```typescript
import { Mailbox } from "email";

const mailbox = new Mailbox(config);

await mailbox.connect();
await mailbox.sync();
```

#### Read Operations

**Folders:**

```typescript
mailbox.folders(): Folder[]
mailbox.refreshFolders(): Promise<Folder[]>
mailbox.folderStatus(path: string): FolderStatus
```

Returns all folders with roles, counts, and sync state. Cached from last
LIST — no network call.

`refreshFolders()` performs a fresh LIST plus STATUS/LIST-STATUS round-trip and
updates the local folder cache.

```typescript
type Folder = {
  path: string;
  delimiter: string;
  role: "inbox" | "sent" | "drafts" | "trash" | "junk" | "archive" | "all" | "flagged" | null;
  messageCount: number;
  unseenCount: number;
  lastSyncedAt: string | null;
};
```

**Messages:**

```typescript
mailbox.messages(folder: string, options?: {
  limit?: number;
  offset?: number;
  sort?: "date" | "from" | "subject" | "size";
  order?: "asc" | "desc";
}): Message[]
```

Paginated message listing from local store. No network call.

**Threads:**

```typescript
mailbox.threads(folder: string, options?: {
  limit?: number;
  offset?: number;
}): Thread[]
mailbox.getThread(threadId: string): Thread
```

Returns threaded conversations. Each thread contains an ordered array of
messages with depth indicators.

```typescript
type Thread = {
  threadId: string;
  subject: string;
  participants: Address[];
  messageCount: number;
  unreadCount: number;
  lastDate: string;
  messages: (Message & { depth: number })[];
};
```

**Single message:**

```typescript
mailbox.getMessage(folder: string, uid: number): Promise<Message & {
  textPlain: string;
  textHtml: string;
  attachments: AttachmentMeta[];
}>
```

Fetches body on demand if not cached locally. Returns decoded text content
and attachment metadata (without binary data — fetch separately).

**Attachments:**

```typescript
mailbox.getAttachment(folder: string, uid: number, partPath: string): Promise<Attachment>
```

Fetches and decodes a specific attachment. Returns `Buffer` content.

```typescript
mailbox.listAttachments(folder: string, uid: number): AttachmentMeta[]
```

**Search:**

```typescript
mailbox.search(query: string, options?: {
  folder?: string;
  since?: Date;
  before?: Date;
  hasAttachments?: boolean;
  unreadOnly?: boolean;
  limit?: number;
}): Message[]
```

Searches the local FTS5 index. Sub-millisecond for typical mailbox sizes.
Supports FTS5 query syntax: terms, phrases, prefixes, boolean operators,
column filtering.

**Remote search:**

```typescript
mailbox.searchRemote(folder: string, query: SearchQuery): Promise<number[]>
```

Runs IMAP SEARCH / ESEARCH against the provider and returns matching UIDs in
the selected folder. Used when the consumer needs authoritative server-side
results, provider-native criteria, or has not yet synced the relevant bodies
locally.

**Statistics:**

```typescript
mailbox.stats(): {
  folders: { path: string; role: string | null; total: number; unread: number }[];
  totalMessages: number;
  totalUnread: number;
  lastSyncedAt: string | null;
  storageUsed: number;
}
```

Quick overview from local store. No network call.

**Raw database access:**

```typescript
mailbox.getDatabase(): Database
```

Escape hatch for data engineering. Returns the underlying `node:sqlite`
Database instance for arbitrary SQL queries.

#### Write Operations

**Flags:**

```typescript
mailbox.markRead(folder: string, uids: number[]): Promise<void>
mailbox.markUnread(folder: string, uids: number[]): Promise<void>
mailbox.star(folder: string, uids: number[]): Promise<void>
mailbox.unstar(folder: string, uids: number[]): Promise<void>
mailbox.markAnswered(folder: string, uids: number[]): Promise<void>
```

Sets flags on the server via STORE and updates local store. Uses
`.SILENT` mode to skip server echo.

Batch mutation rule: the local store is updated only after the server confirms
success. If a server rejects the command, the local cache is left untouched and
the promise rejects with the provider error.

**Organization:**

```typescript
mailbox.copyTo(folder: string, uids: number[], destination: string): Promise<void>
mailbox.moveTo(folder: string, uids: number[], destination: string): Promise<void>
mailbox.archive(folder: string, uids: number[]): Promise<void>
mailbox.trash(folder: string, uids: number[]): Promise<void>
mailbox.moveToJunk(folder: string, uids: number[]): Promise<void>
mailbox.markNotJunk(folder: string, uids: number[], destination?: string): Promise<void>
mailbox.delete(folder: string, uids: number[]): Promise<void>
```

`copyTo` preserves the source message. `moveTo` uses MOVE when available,
falls back to COPY+DELETE+EXPUNGE. `archive` uses SPECIAL-USE Archive when
available, else provider heuristics (`All Mail` on Gmail, `Archive` elsewhere).
`trash` moves to the Trash folder. `moveToJunk` and `markNotJunk` route
through the Junk folder and add/remove junk flags when the provider supports
them. `delete` permanently expunges.

**Provider extensions:**

```typescript
mailbox.addLabels(folder: string, uids: number[], labels: string[]): Promise<void>
mailbox.removeLabels(folder: string, uids: number[], labels: string[]): Promise<void>
mailbox.setLabels(folder: string, uids: number[], labels: string[]): Promise<void>
```

These are only active for providers that expose first-class label semantics
(notably Gmail `X-GM-LABELS`). Other providers reject them with an unsupported
feature error so the consumer cannot mistake folders for labels.

**Send:**

```typescript
mailbox.send(input: ComposeInput): Promise<{ messageId: string }>
```

1. Compose RFC 5322 message
2. Send via SMTP
3. APPEND to Sent folder (auto-detected)
4. Return the generated Message-ID

**Reply:**

```typescript
mailbox.reply(folder: string, uid: number, input: {
  to?: Address[];
  cc?: Address[];
  bcc?: Address[];
  text?: string;
  html?: string;
  attachments?: ComposeAttachment[];
  replyAll?: boolean;
}): Promise<{ messageId: string }>
```

1. Fetch original message (from local store or server)
2. Compose reply (In-Reply-To, References, quoted body, Re: subject, optional
   additional recipients)
3. Send via SMTP
4. APPEND to Sent folder
5. Set `\Answered` flag on original
6. Return the generated Message-ID

**Forward:**

```typescript
mailbox.forward(folder: string, uid: number, input: {
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  text?: string;
  html?: string;
  attachments?: ComposeAttachment[];
  mode?: "inline" | "attachment";
}): Promise<{ messageId: string }>
```

1. Fetch original message
2. Compose forward (Fwd: subject, original content inline or as
   attachment)
3. Include original attachments (configurable)
4. Send via SMTP
5. APPEND to Sent folder
6. Set `$Forwarded` flag on original (if supported)
7. Return the generated Message-ID

**Drafts:**

```typescript
mailbox.saveDraft(input: ComposeInput): Promise<{ uid: number }>
mailbox.updateDraft(uid: number, input: ComposeInput): Promise<{ uid: number }>
mailbox.sendDraft(uid: number): Promise<{ messageId: string }>
```

`saveDraft` composes a message with the `\Draft` flag and APPENDs to the
Drafts folder. `updateDraft` replaces the draft (APPEND new + DELETE old).
`sendDraft` sends the draft via SMTP, deletes from Drafts, appends to
Sent. When UIDPLUS is available, the returned UID is authoritative. Without
UIDPLUS, the engine discovers the new draft UID via APPEND response metadata or
post-append SEARCH and documents that this step is best-effort on older
servers.

**Folder management:**

```typescript
mailbox.createFolder(path: string): Promise<void>
mailbox.renameFolder(oldPath: string, newPath: string): Promise<void>
mailbox.deleteFolder(path: string): Promise<void>
mailbox.subscribeFolder(path: string): Promise<void>
mailbox.unsubscribeFolder(path: string): Promise<void>
mailbox.exportEml(folder: string, uid: number): Promise<Buffer>
mailbox.importEml(folder: string, eml: Buffer, flags?: string[]): Promise<{ uid?: number }>
```

#### Sync Operations

```typescript
mailbox.sync(options?: {
  folders?: string[];
  fullSync?: boolean;
  bodies?: "none" | "missing" | "all";
}): Promise<SyncResult>
```

Syncs specified folders (default: all subscribed folders). Uses QRESYNC
when available, falls back to UID comparison. Returns counts of new,
updated, and expunged messages.

```typescript
type SyncResult = {
  folders: {
    path: string;
    newMessages: number;
    updatedFlags: number;
    expunged: number;
    duration: number;
  }[];
  totalNew: number;
  totalExpunged: number;
};
```

#### Real-Time

```typescript
mailbox.watch(options?: {
  folders?: string[];
  signal?: AbortSignal;
}): AsyncIterable<WatchEvent>
```

Monitors folders via IDLE. Automatically syncs new messages into local
store before emitting events.

```typescript
type WatchEvent =
  | { type: "new"; folder: string; messages: Message[] }
  | { type: "flags"; folder: string; uid: number; flags: string[] }
  | { type: "expunge"; folder: string; uid: number };
```

Watching multiple folders requires multiple IMAP connections (IDLE locks
the connection to one folder). The engine manages a connection pool —
one connection per watched folder, plus one for commands. Pool growth is
bounded by `maxConnections`; excess watch requests queue or fail with a typed
capacity error instead of silently exhausting provider connection limits.

#### Lifecycle

```typescript
mailbox.connect(): Promise<void>
mailbox.disconnect(): Promise<void>
mailbox.isConnected(): boolean
mailbox.reconnect(): Promise<void>
```

`connect()` establishes IMAP + SMTP connections, initializes SQLite schema,
and issues initial CAPABILITY/ID/ENABLE commands.

`disconnect()` sends LOGOUT on all connections, closes sockets, and closes
the SQLite database.

## Derived State

Computed at read time from the local store, never stored separately:

### Message-Level

- `isRead` — `\Seen` in flags
- `isStarred` — `\Flagged` in flags
- `isAnswered` — `\Answered` in flags
- `isDraft` — `\Draft` in flags
- `isDeleted` — `\Deleted` in flags
- `hasAttachments` — derived from BODYSTRUCTURE during sync
- `threadPosition` — computed depth within thread

### Folder-Level

- `messageCount` — total messages in folder
- `unseenCount` — messages without `\Seen`
- `recentCount` — messages with `\Recent` (session-scoped, not persisted)

### Account-Level

- `totalMessages` — sum across all synced folders
- `totalUnread` — sum of unseen across all folders
- `quotaUsed` / `quotaLimit` — from QUOTA command (if supported)
- `capabilities` — negotiated IMAP capabilities
- `syncHealth` — whether all folders are synced, any sync errors pending

## Provider Compatibility Matrix

### Tier 1 — Tested, Quirk-Handled

| Provider | IMAP Host | SMTP Host | Auth | CONDSTORE | QRESYNC | SPECIAL-USE | IDLE | MOVE |
| -------- | --------------------------- | ----------------------- | ---------- | --------- | ------- | ----------- | ---- | ---- |
| Gmail | imap.gmail.com:993 | smtp.gmail.com:465 | XOAUTH2, app password | Yes | Yes | Yes | Yes | Yes |
| Outlook | outlook.office365.com:993 | smtp.office365.com:587 | XOAUTH2 | Yes | No | Yes | Yes (slow) | Yes |
| Yahoo | imap.mail.yahoo.com:993 | smtp.mail.yahoo.com:465 | App password | No | No | Yes | Yes | No |
| iCloud | imap.mail.me.com:993 | smtp.mail.me.com:587 | App password | Yes | No | Yes | Yes | Yes |
| Fastmail | imap.fastmail.com:993 | smtp.fastmail.com:465 | App password, XOAUTH2 | Yes | Yes | Yes | Yes | Yes |

### Tier 2 — Standard Protocol, Minimal Quirks

| Provider | IMAP Host | SMTP Host | Auth | Notes |
| -------- | --------------------------------- | --------------------------------- | ------------- | ------- |
| GMX | imap.gmx.net:993 | mail.gmx.net:465 | LOGIN | Standard |
| Web.de | imap.web.de:993 | smtp.web.de:587 | LOGIN | Standard |
| T-Online | secureimap.t-online.de:993 | securesmtp.t-online.de:465 | LOGIN | Standard |
| Zoho | imap.zoho.com:993 | smtp.zoho.com:465 | App password | Standard |
| Yandex | imap.yandex.com:993 | smtp.yandex.com:465 | App password | Standard |
| Mail.ru | imap.mail.ru:993 | smtp.mail.ru:465 | App password | Standard |
| ProtonMail | 127.0.0.1:1143 (Bridge) | 127.0.0.1:1025 (Bridge) | LOGIN | Via Proton Mail Bridge |

### Tier 3 — Self-Hosted

| Software | Notes |
| -------------- | ---------------------------------------- |
| Dovecot | Reference implementation. Full extension support. |
| Cyrus | Enterprise. Full extension support. |
| hMailServer | Windows. Standard IMAP. |
| Postfix+Dovecot| Classic Linux combo. Standard. |
| Exchange | Quirky IMAP. Usually behind MAPI. |

## Defaults and Knobs

### Connection

| Knob | Default | Controls |
| --------------------- | --------- | ---------------------------------------- |
| `connectionTimeout` | 30000 | TCP connection timeout (ms) |
| `socketTimeout` | 300000 | Socket inactivity timeout (ms) |
| `keepaliveInterval` | 300000 | NOOP interval when not in IDLE (ms) |
| `maxReconnectDelay` | 60000 | Reconnect backoff cap (ms) |
| `maxReconnectAttempts` | 10 | Reconnect attempts before giving up |
| `maxConnections` | 6 | Total IMAP connections including watch pool |
| `pipelining` | false | Enable IMAP command pipelining |
| `compress` | true | Enable COMPRESS=DEFLATE when available |
| `tagPrefix` | `"A"` | Command tag prefix |

### Sync

| Knob | Default | Controls |
| ------------------- | ------- | ---------------------------------------- |
| `batchSize` | 500 | Messages per FETCH batch during initial sync |
| `autoExpunge` | false | Expunge on every delete vs manual |
| `syncDeletedFolders`| false | Include Trash/Junk in sync |
| `maxBodyCache` | 1000 | Max bodies to cache locally (LRU) |
| `maxAttachmentCache` | 100 | Max attachments to cache locally (LRU) |

### IDLE

| Knob | Default | Controls |
| -------------- | ------- | ---------------------------------------- |
| `idleTimeout` | 1500000 | Re-enter IDLE cycle (ms, 25 min) |
| `watchFolders` | `["INBOX"]` | Default folders to watch |

### MIME

| Knob | Default | Controls |
| ------------------- | ------- | ---------------------------------------- |
| `maxNestingDepth` | 50 | MIME nesting limit for parser |
| `maxMessageSize` | 26214400 | Max message size (25MB) |
| `defaultCharset` | `"utf-8"` | Charset when not specified |

## Complexity Budget

- Six SQLite tables + one FTS5 virtual table.
- Local store is a cache — the IMAP server is the source of truth for
  mailbox state. Local store is the source of truth for search and fast
  reads.
- The package does not call LLMs. The package does not interpret message
  content beyond structural parsing.
- The package does not render HTML email. It parses HTML to extract
  text and structure.
- The package does not manage OAuth2 flows. It consumes tokens. The
  consumer handles browser redirects and token exchange.
- The package does not filter spam. It reads server-assigned flags and
  folder placement.
- The package does not schedule sends or manage queues. Send is immediate
  and request-scoped from the caller's perspective.
- The package does not verify or decrypt S/MIME or OpenPGP content. Signed
  and encrypted parts are exposed as MIME parts and attachments.
- The package does not decode TNEF / `winmail.dat` into richer structures.
  The opaque attachment remains accessible as binary content.
- Reject changes that turn email into a calendar client (CalDAV), contact
  manager (CardDAV), notification system, or email rendering engine. Each
  is a separate domain.

### Dependency Budget

Zero npm dependencies. All I/O uses Node.js built-in modules:

| Concern | Module |
| -------------------- | ----------------------------- |
| TLS sockets | `node:tls` |
| TCP sockets | `node:net` |
| Compression | `node:zlib` |
| Crypto | `node:crypto` |
| SQLite | `node:sqlite` |
| Buffer ops | `node:buffer` |
| Text decoding | `TextDecoder` (global) |
| Events | `node:events` |

### Network Confinement

Network access is confined to IMAP and SMTP connections. All local store
operations (search, thread, list, stats) are synchronous and offline. The
clear boundary: `connect`, `sync`, `watch`, `send`, `reply`, `forward`,
`searchRemote`, `fetch*`, folder mutations, and flag mutations require
network. Everything else is local.

## Automation Boundary

### Deterministic (zero tokens)

- IMAP protocol parsing, tokenization, and response routing
- MIME parsing: header decoding, charset conversion, multipart boundary
  splitting, attachment extraction, transfer encoding
- MIME composition: header construction, RFC 2047 encoding, multipart
  assembly, base64 encoding, boundary generation
- Thread reconstruction from References/In-Reply-To (JWZ algorithm)
- Modified UTF-7 mailbox name encoding/decoding
- Reply composition: In-Reply-To, References chain, quoted body, subject
  prefix normalization
- Forward composition: inline or attachment mode, original header block
- OAuth2 token refresh callback invocation
- IMAP SEARCH query compilation from typed query objects
- SQLite schema initialization and migration
- FTS5 index population and query execution
- Incremental sync (QRESYNC or UID comparison)
- UIDVALIDITY change detection and full re-sync
- Flag sync and conflict detection
- Body and attachment fetch-on-demand with local caching
- IDLE monitoring with automatic re-enter and sync
- SMTP dot-stuffing, size checking, error categorization
- Provider quirk handling in parser
- Folder role detection (SPECIAL-USE + name heuristics)
- Connection keepalive, reconnect with backoff
- Draft lifecycle (save, update, send)

### Consumer-Provided (requires judgment)

- Which folders to sync and watch
- When to sync (periodic, on-demand, on notification)
- Which messages to read, reply to, forward, delete
- What to write in replies and forwards
- How to present messages in a UI
- How to handle OAuth2 token acquisition (browser flow)
- Which search queries to run and how to use results
- When to purge cached bodies and attachments
- Whether to trust message content (phishing, spam)
- How to map email data to other systems (CRM, task tracker, etc.)

## Surfaces

### Read (mostly local — with on-demand fetch where noted)

Folders:
- `folders()` → `Folder[]` — all folders with roles and counts
- `folderStatus(path)` → `FolderStatus` — detailed counts for one folder

Messages:
- `messages(folder, options?)` → `Message[]` — paginated listing
- `getMessage(folder, uid)` → `Promise<MessageDetail>` — single message with body
- `threads(folder, options?)` → `Thread[]` — threaded conversations
- `getThread(threadId)` → `Thread` — single thread by root message-id
- `search(query, options?)` → `Message[]` — FTS5 local search
- `stats()` → `AccountStats` — overview counts

Attachments:
- `listAttachments(folder, uid)` → `AttachmentMeta[]` — metadata without
  binary
- `getAttachment(folder, uid, partPath)` → `Promise<Attachment>` — decoded binary

Database:
- `getDatabase()` → `Database` — raw SQLite handle for custom queries

### Write (network — propagated to server)

Flags:
- `markRead(folder, uids)` → `Promise<void>`
- `markUnread(folder, uids)` → `Promise<void>`
- `star(folder, uids)` → `Promise<void>`
- `unstar(folder, uids)` → `Promise<void>`
- `markAnswered(folder, uids)` → `Promise<void>`

Organization:
- `copyTo(folder, uids, destination)` → `Promise<void>`
- `moveTo(folder, uids, destination)` → `Promise<void>`
- `archive(folder, uids)` → `Promise<void>`
- `trash(folder, uids)` → `Promise<void>`
- `moveToJunk(folder, uids)` → `Promise<void>`
- `markNotJunk(folder, uids, destination?)` → `Promise<void>`
- `delete(folder, uids)` → `Promise<void>`
- `addLabels(folder, uids, labels)` → `Promise<void>`
- `removeLabels(folder, uids, labels)` → `Promise<void>`
- `setLabels(folder, uids, labels)` → `Promise<void>`

Folders:
- `createFolder(path)` → `Promise<void>`
- `renameFolder(oldPath, newPath)` → `Promise<void>`
- `deleteFolder(path)` → `Promise<void>`
- `subscribeFolder(path)` → `Promise<void>`
- `unsubscribeFolder(path)` → `Promise<void>`

Drafts:
- `saveDraft(input)` → `Promise<{ uid }>`
- `updateDraft(uid, input)` → `Promise<{ uid }>`
- `exportEml(folder, uid)` → `Promise<Buffer>`
- `importEml(folder, eml, flags?)` → `Promise<{ uid? }>`

### Network (async)

Connection:
- `connect()` → `Promise<void>`
- `disconnect()` → `Promise<void>`
- `reconnect()` → `Promise<void>`

Sync:
- `sync(options?)` → `Promise<SyncResult>`
- `watch(options?)` → `AsyncIterable<WatchEvent>`
- `searchRemote(folder, query)` → `Promise<number[]>`

Send:
- `send(input)` → `Promise<{ messageId }>`
- `reply(folder, uid, input)` → `Promise<{ messageId }>`
- `forward(folder, uid, input)` → `Promise<{ messageId }>`
- `sendDraft(uid)` → `Promise<{ messageId }>`

Fetch (on-demand with caching):
- `fetchBody(folder, uid)` → `Promise<MessageBody>`
- `fetchAttachment(folder, uid, partPath)` → `Promise<Attachment>`

### Runtime

- `init(config)` → low-level helper used by `new Mailbox(config)` and
  `connect()` to create SQLite tables and bootstrap internal clients. Most
  consumers never call it directly.

## Package Shape

The standalone package should expose the same kind of front door the other
faculties converge on: a clean domain surface first, optional LLM overlays
second.

### Public Namespaces

| Export | Role | Notes |
| ---------------- | ---------------------------------------- | ---------------------------------------- |
| `read` | deterministic local queries | local-store first, no network unless explicitly stated |
| `write` | mailbox mutations and composition | privileged side effects; usually async |
| `network` | live protocol/session operations | connect, sync, watch, fetch, remote search |
| `runtime` | initialization and bootstrap | schema creation, capability negotiation helpers |
| `tools` | optional LLM tool wrappers | thin adapters over `read` / `write` / `network` |
| `skills` | optional markdown procedures | guidance for agent usage, not required for direct code use |
| `soul` | optional specialist persona fragment | rendered prompt text + tool guidance |

The `Mailbox` class remains the ergonomic porcelain for most consumers. The
namespace exports are the stable direct-code substrate for packages,
orchestrators, and thin tool wrappers.

### Exact Interface Shape

```typescript
type EmailPackage = {
  read: EmailReadSurface;
  write: EmailWriteSurface;
  network: EmailNetworkSurface;
  runtime: EmailRuntimeSurface;
  tools?: EmailToolFactory;
  skills?: EmailSkillArtifact[];
  soul?: EmailSoulFragment;
};

type ReplyInput = {
  to?: Address[];
  cc?: Address[];
  bcc?: Address[];
  text?: string;
  html?: string;
  attachments?: ComposeAttachment[];
  replyAll?: boolean;
};

type ForwardInput = {
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  text?: string;
  html?: string;
  attachments?: ComposeAttachment[];
  mode?: "inline" | "attachment";
};

type EmailToolFactory = () => EmailToolSpec[];

type EmailToolSpec = {
  name: string;
  description: string;
  input: string;
};

type EmailSkillArtifact = {
  name: string;
  description: string;
  content: string;
};

type EmailSoulFragment = {
  name: string;
  description: string;
  prompt: string;
  toolGuidance: string;
};

type EmailReadSurface = {
  folders(): Folder[];
  folderStatus(path: string): FolderStatus;
  messages(folder: string, options?: MessageListOptions): Message[];
  threads(folder: string, options?: ThreadListOptions): Thread[];
  getThread(threadId: string): Thread;
  getMessage(folder: string, uid: number): Promise<MessageDetail>;
  listAttachments(folder: string, uid: number): AttachmentMeta[];
  getAttachment(folder: string, uid: number, partPath: string): Promise<Attachment>;
  search(query: string, options?: LocalSearchOptions): Message[];
  stats(): AccountStats;
  getDatabase(): Database;
};

type EmailWriteSurface = {
  markRead(folder: string, uids: number[]): Promise<void>;
  markUnread(folder: string, uids: number[]): Promise<void>;
  star(folder: string, uids: number[]): Promise<void>;
  unstar(folder: string, uids: number[]): Promise<void>;
  markAnswered(folder: string, uids: number[]): Promise<void>;
  copyTo(folder: string, uids: number[], destination: string): Promise<void>;
  moveTo(folder: string, uids: number[], destination: string): Promise<void>;
  archive(folder: string, uids: number[]): Promise<void>;
  trash(folder: string, uids: number[]): Promise<void>;
  moveToJunk(folder: string, uids: number[]): Promise<void>;
  markNotJunk(folder: string, uids: number[], destination?: string): Promise<void>;
  delete(folder: string, uids: number[]): Promise<void>;
  addLabels(folder: string, uids: number[], labels: string[]): Promise<void>;
  removeLabels(folder: string, uids: number[], labels: string[]): Promise<void>;
  setLabels(folder: string, uids: number[], labels: string[]): Promise<void>;
  send(input: ComposeInput): Promise<{ messageId: string }>;
  reply(folder: string, uid: number, input: ReplyInput): Promise<{ messageId: string }>;
  forward(folder: string, uid: number, input: ForwardInput): Promise<{ messageId: string }>;
  saveDraft(input: ComposeInput): Promise<{ uid: number }>;
  updateDraft(uid: number, input: ComposeInput): Promise<{ uid: number }>;
  sendDraft(uid: number): Promise<{ messageId: string }>;
  createFolder(path: string): Promise<void>;
  renameFolder(oldPath: string, newPath: string): Promise<void>;
  deleteFolder(path: string): Promise<void>;
  subscribeFolder(path: string): Promise<void>;
  unsubscribeFolder(path: string): Promise<void>;
  exportEml(folder: string, uid: number): Promise<Buffer>;
  importEml(folder: string, eml: Buffer, flags?: string[]): Promise<{ uid?: number }>;
};

type EmailNetworkSurface = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  sync(options?: SyncOptions): Promise<SyncResult>;
  watch(options?: WatchOptions): AsyncIterable<WatchEvent>;
  refreshFolders(): Promise<Folder[]>;
  searchRemote(folder: string, query: SearchQuery): Promise<number[]>;
  fetchBody(folder: string, uid: number): Promise<MessageBody>;
  fetchAttachment(folder: string, uid: number, partPath: string): Promise<Attachment>;
};

type EmailRuntimeSurface = {
  init(config: EmailConfig): Promise<void> | void;
};
```

This keeps the contract aligned with the other faculties:

- **`read`** is the stable query truth
- **`write`** is the mutation truth
- **`network`** holds the explicitly live protocol work
- **`tools` / `skills` / `soul`** are optional overlays over the same substrate

## Usage Regimes

**Cold start.** Empty SQLite database. `connect()` authenticates and
negotiates capabilities. `sync()` performs initial metadata sync — downloads
envelope, flags, and structure for all messages. Bodies and attachments
remain on the server until requested. Time: 5-60 seconds depending on
mailbox size.

**Light use.** Periodic `sync()` to update local state. Search locally via
FTS5. Fetch bodies on demand. Reply and forward through the high-level
API. No IDLE — sync on demand.

**Steady use.** IDLE watch on INBOX for real-time arrival notifications.
Periodic sync of other folders. Local FTS5 search across all synced
messages. Bodies cached for recently accessed messages. Threads computed
locally for conversation view.

**Heavy use / data engineering.** Full sync of all folders. All bodies
downloaded and FTS-indexed. Raw SQL queries against the local database for
analytics: sender frequency, attachment analysis, thread depth, response
time patterns. In this mode the database becomes a body-complete local mirror
— the consumer can run arbitrary analysis without network calls.

**Agent use.** An LLM agent manages the mailbox through the high-level
API: read unread messages, search for specific content, compose and send
replies, organize by moving to folders, manage drafts. The typed API
surface maps directly to tool definitions. The local FTS5 search means
the agent can find relevant messages instantly without slow IMAP SEARCH
round-trips.

## Composability

| Faculty | Domain | Core Loop |
| ---------- | -------------------------------- | ---------------------------------------- |
| `questlog` | tasks and commitments | plan, track, complete, reward |
| `affinity` | people and relationships | meet, bond, interact, maintain |
| `codex` | beliefs and knowledge | remember, recall, revise, process |
| `souls` | cognitive identity | observe, crystallize, refine, level up |
| `grimoire` | procedures and competence | inscribe, practice, hone, master |
| `email` | communication channels | connect, sync, search, compose, send |

Email is the communication substrate. It surfaces incoming information
(messages, threads, attachments) and provides outgoing capabilities (reply,
forward, send). Other faculties act on email data: questlog extracts
commitments from messages, affinity maintains relationships revealed in
correspondence, codex absorbs facts from email content. Email provides the
raw channel; the other faculties provide the judgment.

## Standalone Scope

Email owns protocol-complete IMAP/SMTP mailbox management with local sync.

It does not own:

- cognitive identity (`souls`)
- beliefs and factual knowledge (`codex`)
- relationships and social understanding (`affinity`)
- tasks and temporal commitments (`questlog`)
- procedural knowledge (`grimoire`)
- email rendering or display (UI concern)
- calendar events or contacts (CalDAV/CardDAV)
- spam classification (server-side concern)
- OAuth2 flow management (auth provider concern)

### Integration Boundary

Email is the protocol bridge between the raw email channel and higher-level
agent capabilities. Which messages to read, what to reply, when to sync,
how to present messages — all external. One consumer might use it as a
read-only inbox monitor. Another might use it as a full autonomous email
assistant. The engine serves both without caring.

The package remains valid as a direct-code standalone system. The underlying
model does not depend on any specific agent framework or orchestration
pattern.

### Reintegration Note

When extracted as a dedicated standalone package, the consuming orchestrator
uses the package directly instead of maintaining a parallel internal model.
The intended path:

- use the standalone Email read and write surface as the source of truth
  for mailbox state
- keep orchestrator-side wrappers thin and policy-oriented (which messages
  to act on, when to sync, what to reply)
- preserve runtime assumptions: Node 22+, built-in `node:sqlite`, zero
  runtime dependencies
- treat sync schedules, watch configurations, and folder selection as
  orchestration policy, not core ontology

## Showcase Layers

Email ships as a public read/write/network surface. Two optional showcase
layers demonstrate how to compose it for humans and for LLMs without adding
new core ontology.

### Demo App — Mailroom

A local-first mailbox workbench. Calm dispatch-desk aesthetic — folders in the
left rail, thread list in the center, active message on the right, attachment
tray below.

#### Screens

**Folder Rail.** Role-aware folders with unread counts, last sync time, and a
one-click refresh action.

**Thread Queue.** Thread-first message list with unread emphasis, attachment
badges, sender clusters, and quick archive / trash / junk actions.

**Message View.** Plain text first, HTML available on demand, attachment list,
headers drawer, and reply / reply-all / forward actions.

**Draft Desk.** Drafts as durable compositions with autosave to the Drafts
folder and send-from-draft support.

**Search Bench.** Local FTS search by default, optional remote search toggle,
filters for folder/date/attachment/unread, result export to `.eml`.

### LLM Layer — Tools, Skills, Soul

The optional LLM layer should stay lean: a small number of broad, legible
tools wrapping the same `read`, `write`, and `network` surfaces. The goal is
not to expose every IMAP verb. The goal is to expose the daily mailbox
workflow clearly.

#### Tool Surface

Five specialist tools are enough for normal daily mailbox work:

| Tool | Parameters | What it does |
| ---- | ---------- | ------------ |
| `mail_read` | `view, folder?, uid?, threadId?, partPath?, limit?, unreadOnly?, refresh?` | Overview folders, unread queue, thread, single message, attachment metadata, or exported `.eml` |
| `mail_search` | `query, folder?, mode?, since?, before?, hasAttachments?, unreadOnly?, limit?` | Search locally via FTS or remotely via IMAP SEARCH/ESEARCH |
| `mail_compose` | `action, input` | Send, reply, forward, save draft, update draft, send draft |
| `mail_organize` | `action, folder?, uids?, destination?, labels?, path?, flags?` | Mark read/unread/starred/answered, copy, move, archive, trash, junk, label, folder create/rename/delete/subscribe |
| `mail_sync` | `action, folders?, bodies?, watch?, refreshFolders?` | Connect, sync, refresh folder state, start/stop watch flows |

This is deliberately fewer tools than the raw feature count would suggest.
Message reading, organization, and composition are the real daily verbs. The
lower-level protocol detail stays under the hood.

#### Tool Parameter Shapes

```typescript
type MailReadInput =
  | { view: "folders"; refresh?: boolean }
  | { view: "queue"; folder?: string; unreadOnly?: boolean; limit?: number; refresh?: boolean }
  | { view: "thread"; threadId: string }
  | { view: "message"; folder: string; uid: number }
  | { view: "attachment"; folder: string; uid: number; partPath: string }
  | { view: "eml"; folder: string; uid: number };

type MailSearchInput = {
  query: string | SearchQuery;
  folder?: string;
  mode?: "local" | "remote";
  since?: string;
  before?: string;
  hasAttachments?: boolean;
  unreadOnly?: boolean;
  limit?: number;
};

type MailComposeInput =
  | { action: "send"; input: ComposeInput }
  | { action: "reply"; folder: string; uid: number; input: ReplyInput }
  | { action: "forward"; folder: string; uid: number; input: ForwardInput }
  | { action: "save_draft"; input: ComposeInput }
  | { action: "update_draft"; uid: number; input: ComposeInput }
  | { action: "send_draft"; uid: number };

type MailOrganizeInput =
  | { action: "mark_read" | "mark_unread" | "star" | "unstar" | "mark_answered"; folder: string; uids: number[] }
  | { action: "copy" | "move"; folder: string; uids: number[]; destination: string }
  | { action: "archive" | "trash" | "junk"; folder: string; uids: number[] }
  | { action: "not_junk"; folder: string; uids: number[]; destination?: string }
  | { action: "set_labels" | "add_labels" | "remove_labels"; folder: string; uids: number[]; labels: string[] }
  | { action: "create_folder"; path: string }
  | { action: "rename_folder"; oldPath: string; newPath: string }
  | { action: "delete_folder" | "subscribe_folder" | "unsubscribe_folder"; path: string };

type MailSyncInput =
  | { action: "connect" | "disconnect" | "reconnect" }
  | { action: "sync"; folders?: string[]; bodies?: "none" | "missing" | "all" }
  | { action: "refresh_folders" }
  | { action: "watch"; folders?: string[] };
```

#### Tool Guidance

```text
## Tools

Use `mail_read` to inspect the inbox, a thread, a message, or an attachment.
Use `mail_search` when you know what you are looking for and need either local
FTS speed or authoritative remote matching. Use `mail_compose` for all
outbound writing: new mail, reply, forward, draft save, and draft send. Use
`mail_organize` to reconcile the mailbox state after reading: mark, archive,
move, trash, junk, label, and folder operations. Use `mail_sync` when you need
fresh state from the provider or continuous watch behavior.
```

#### Soul

The rendered specialist identity block, used only when a consumer wants a
dedicated email-operating persona.

```text
# Correspondent
*The mailbox specialist — reads threads cleanly, protects recipient semantics,
keeps the inbox navigable, and writes replies that sound human while honoring
the exact transport and threading rules that keep email coherent.*

You treat email as a living queue of obligations, signals, and social context.
You do not spray replies. You read the thread first, identify who actually
needs to see the response, preserve the conversation chain, and keep the
mailbox cleaner after every action than it was before. You know the difference
between what belongs in headers and what belongs in the transport envelope.
You do not leak Bcc, do not reply-all by reflex, and do not break a thread by
inventing a fresh subject when continuity matters.

You prefer archive over clutter, clarity over cleverness, and the smallest
correct action over broad inbox surgery. Search locally first when the mirror
is fresh. Search remotely when the answer must be authoritative or the mirror
is incomplete. When you write, you sound like a competent human colleague, not
an auto-responder.

## Traits
- Read the whole thread before you answer the latest message.
- Preserve recipient intent: who sees the reply matters as much as the words.
```

#### Meta-Skills

Three optional markdown skills are enough to make the specialist effective:

- `mail-triage` — how to review the queue, distinguish act / archive / trash /
  junk, and leave the inbox in a cleaner state than before.
- `reply-craft` — how to write concise, human, thread-safe replies and
  forwards, including reply-all restraint and quote discipline.
- `mail-searching` — when to prefer local FTS vs remote IMAP search, how to
  scope by folder/date/sender, and when to trigger body backfill for offline
  work.
