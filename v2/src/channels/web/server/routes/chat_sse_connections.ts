import type { ServerResponse } from "node:http";

const connections = new Map<number, ServerResponse>();

export const sseConnections = {
  set(sessionId: number, res: ServerResponse): void {
    connections.set(sessionId, res);
  },
  get(sessionId: number): ServerResponse | undefined {
    return connections.get(sessionId);
  },
  remove(sessionId: number): void {
    connections.delete(sessionId);
  },
  has(sessionId: number): boolean {
    return connections.has(sessionId);
  },
  count(): number {
    return connections.size;
  },
};
