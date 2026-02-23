import { generateId } from "../lib/ids.js";
import { type GhostpawDatabase, isNullRow } from "./database.js";

export type MessageRole = "system" | "user" | "assistant";

export interface Session {
  id: string;
  key: string;
  createdAt: number;
  lastActive: number;
  tokensIn: number;
  tokensOut: number;
  tokenBudget: number | null;
  model: string | null;
  headMessageId: string | null;
  metadata: string | null;
}

export interface Message {
  id: string;
  sessionId: string;
  parentId: string | null;
  role: MessageRole;
  content: string | null;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  createdAt: number;
  isCompaction: boolean;
}

export interface AddMessageOptions {
  role: MessageRole;
  content?: string | null;
  parentId?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  isCompaction?: boolean;
}

export interface CreateSessionOptions {
  model?: string;
  tokenBudget?: number;
  metadata?: Record<string, unknown>;
}

export interface SessionStore {
  createSession(key: string, options?: CreateSessionOptions): Session;
  getSession(id: string): Session | null;
  getSessionByKey(key: string): Session | null;
  listSessions(): Session[];
  deleteSession(id: string): void;
  addMessage(sessionId: string, options: AddMessageOptions): Message;
  getMessage(id: string): Message | null;
  getConversationHistory(sessionId: string): Message[];
  setHead(sessionId: string, messageId: string): void;
  updateSessionTokens(sessionId: string, tokensIn: number, tokensOut: number): void;
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    key: row.key as string,
    createdAt: row.created_at as number,
    lastActive: row.last_active as number,
    tokensIn: (row.tokens_in as number) ?? 0,
    tokensOut: (row.tokens_out as number) ?? 0,
    tokenBudget: (row.token_budget as number) ?? null,
    model: (row.model as string) ?? null,
    headMessageId: (row.head_message_id as string) ?? null,
    metadata: (row.metadata as string) ?? null,
  };
}

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    parentId: (row.parent_id as string) ?? null,
    role: row.role as MessageRole,
    content: (row.content as string) ?? null,
    model: (row.model as string) ?? null,
    tokensIn: (row.tokens_in as number) ?? 0,
    tokensOut: (row.tokens_out as number) ?? 0,
    createdAt: row.created_at as number,
    isCompaction: row.is_compaction === 1,
  };
}

export function createSessionStore(db: GhostpawDatabase): SessionStore {
  const { sqlite } = db;

  return {
    createSession(key: string, options?: CreateSessionOptions): Session {
      const id = generateId();
      const now = Date.now();
      const model = options?.model ?? null;
      const tokenBudget = options?.tokenBudget ?? null;
      const metadata = options?.metadata ? JSON.stringify(options.metadata) : null;

      sqlite
        .prepare(
          `INSERT INTO sessions (id, key, created_at, last_active, model, token_budget, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, key, now, now, model, tokenBudget, metadata);

      return {
        id,
        key,
        createdAt: now,
        lastActive: now,
        tokensIn: 0,
        tokensOut: 0,
        tokenBudget,
        model,
        headMessageId: null,
        metadata,
      };
    },

    getSession(id: string): Session | null {
      const row = sqlite.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
      return isNullRow(row) ? null : rowToSession(row);
    },

    getSessionByKey(key: string): Session | null {
      const row = sqlite.prepare("SELECT * FROM sessions WHERE key = ?").get(key) as
        | Record<string, unknown>
        | undefined;
      return isNullRow(row) ? null : rowToSession(row);
    },

    listSessions(): Session[] {
      const rows = sqlite
        .prepare("SELECT * FROM sessions ORDER BY last_active DESC")
        .all() as Record<string, unknown>[];
      return rows.map(rowToSession);
    },

    deleteSession(id: string): void {
      sqlite.prepare("DELETE FROM messages WHERE session_id = ?").run(id);
      sqlite.prepare("DELETE FROM memory WHERE session_id = ?").run(id);
      sqlite.prepare("DELETE FROM runs WHERE session_id = ?").run(id);
      sqlite.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    },

    addMessage(sessionId: string, options: AddMessageOptions): Message {
      const id = generateId();
      const now = Date.now();
      const parentId = options.parentId ?? null;
      const content = options.content ?? null;
      const model = options.model ?? null;
      const tokensIn = options.tokensIn ?? 0;
      const tokensOut = options.tokensOut ?? 0;
      const isCompaction = options.isCompaction ? 1 : 0;

      sqlite
        .prepare(
          `INSERT INTO messages (id, session_id, parent_id, role, content, model, tokens_in, tokens_out, created_at, is_compaction)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          sessionId,
          parentId,
          options.role,
          content,
          model,
          tokensIn,
          tokensOut,
          now,
          isCompaction,
        );

      sqlite
        .prepare("UPDATE sessions SET head_message_id = ?, last_active = ? WHERE id = ?")
        .run(id, now, sessionId);

      return {
        id,
        sessionId,
        parentId,
        role: options.role,
        content,
        model,
        tokensIn,
        tokensOut,
        createdAt: now,
        isCompaction: !!options.isCompaction,
      };
    },

    getMessage(id: string): Message | null {
      const row = sqlite.prepare("SELECT * FROM messages WHERE id = ?").get(id) as
        | Record<string, unknown>
        | undefined;
      return isNullRow(row) ? null : rowToMessage(row);
    },

    getConversationHistory(sessionId: string): Message[] {
      const session = sqlite
        .prepare("SELECT head_message_id FROM sessions WHERE id = ?")
        .get(sessionId) as Record<string, unknown> | undefined;
      if (isNullRow(session) || !session.head_message_id) return [];

      const rows = sqlite
        .prepare(
          `WITH RECURSIVE chain AS (
             SELECT *, 0 AS depth FROM messages WHERE id = ?
             UNION ALL
             SELECT m.*, c.depth + 1 FROM messages m JOIN chain c ON m.id = c.parent_id
           )
           SELECT * FROM chain ORDER BY depth DESC`,
        )
        .all(session.head_message_id) as Record<string, unknown>[];

      return rows.map(rowToMessage);
    },

    setHead(sessionId: string, messageId: string): void {
      sqlite
        .prepare("UPDATE sessions SET head_message_id = ?, last_active = ? WHERE id = ?")
        .run(messageId, Date.now(), sessionId);
    },

    updateSessionTokens(sessionId: string, tokensIn: number, tokensOut: number): void {
      sqlite
        .prepare(
          "UPDATE sessions SET tokens_in = tokens_in + ?, tokens_out = tokens_out + ?, last_active = ? WHERE id = ?",
        )
        .run(tokensIn, tokensOut, Date.now(), sessionId);
    },
  };
}
