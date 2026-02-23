import type { Tool } from "chatoyant";
import { ValidationError } from "../lib/errors.js";

export interface ToolRegistry {
  register(tool: Tool): void;
  unregister(name: string): void;
  get(name: string): Tool | undefined;
  has(name: string): boolean;
  list(): Tool[];
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, Tool>();

  return {
    register(tool: Tool): void {
      if (!tool.name) {
        throw new ValidationError("name", tool.name, "Tool name is required");
      }
      if (tools.has(tool.name)) {
        throw new ValidationError("name", tool.name, `Tool "${tool.name}" is already registered`);
      }
      tools.set(tool.name, tool);
    },

    unregister(name: string): void {
      tools.delete(name);
    },

    get(name: string): Tool | undefined {
      return tools.get(name);
    },

    has(name: string): boolean {
      return tools.has(name);
    },

    list(): Tool[] {
      return [...tools.values()];
    },
  };
}
