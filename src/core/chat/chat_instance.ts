import type { GenerateResult, GenerateWithToolsOptions, Message, Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import type { ChatMessage } from "./types.ts";

export interface ChatInstance {
  system(content: string): ChatInstance;
  user(content: string): ChatInstance;
  assistant(content: string): ChatInstance;
  addTool(tool: Tool): ChatInstance;
  generate(options?: GenerateWithToolsOptions): Promise<string>;
  stream(options?: GenerateWithToolsOptions): AsyncGenerator<string, void, undefined>;
  get lastResult(): GenerateResult | null;
  get messages(): readonly Message[];
}

export type ChatFactory = (model: string) => ChatInstance;

export type CompactFn = (
  db: DatabaseHandle,
  sessionId: number,
  history: ChatMessage[],
  model: string,
  createChat: ChatFactory,
) => Promise<ChatMessage>;

export interface TurnContext {
  db: DatabaseHandle;
  tools: Tool[];
  createChat: ChatFactory;
  compactFn?: CompactFn;
}
