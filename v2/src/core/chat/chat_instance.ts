import type { GenerateResult, GenerateWithToolsOptions, Tool } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";

export interface ChatInstance {
  system(content: string): ChatInstance;
  user(content: string): ChatInstance;
  assistant(content: string): ChatInstance;
  addTool(tool: Tool): ChatInstance;
  generate(options?: GenerateWithToolsOptions): Promise<string>;
  stream(options?: GenerateWithToolsOptions): AsyncGenerator<string, void, undefined>;
  get lastResult(): GenerateResult | null;
}

export type ChatFactory = (model: string) => ChatInstance;

export interface TurnContext {
  db: DatabaseHandle;
  tools: Tool[];
  createChat: ChatFactory;
}
