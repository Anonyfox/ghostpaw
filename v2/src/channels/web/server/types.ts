import type { IncomingMessage, ServerResponse } from "node:http";

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  nonce: string;
}

export type RouteHandler = (ctx: RouteContext) => void | Promise<void>;

export interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  requiresAuth: boolean;
}
