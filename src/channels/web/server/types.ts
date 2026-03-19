import type { IncomingMessage, ServerResponse } from "node:http";
import type { Entity } from "../../../harness/index.ts";
import type { DatabaseHandle } from "../../../lib/index.ts";

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
}

export type RouteHandler = (ctx: RouteContext) => void | Promise<void>;

export interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  requiresAuth: boolean;
}

export interface WebServerConfig {
  port: number;
  passwordHash: string;
  clientJs: string;
  bootstrapCss: string;
  db: DatabaseHandle;
  entity?: Entity;
  customCss?: string;
  secure?: boolean;
  version?: string;
}
