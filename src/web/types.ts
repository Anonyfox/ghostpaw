import type { IncomingMessage, ServerResponse } from "node:http";
import type { ChannelRuntime } from "../channels/runtime.js";

export interface WebChannelConfig {
  host?: string;
  port?: number;
}

export interface WebStartResult {
  url: string;
  host: string;
  port: number;
}

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RequestContext,
) => Promise<void> | void;

export interface RequestContext {
  runtime: ChannelRuntime;
  passwordHash: string;
  origin: string;
  nonce: string;
  path: string;
  isLocalhost: boolean;
}

export interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  requiresAuth: boolean;
}
