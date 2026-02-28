import type { DatabaseHandle } from "../../../lib/index.ts";
import { createRoute } from "./create_route.ts";
import { createAuthHandlers } from "./routes/auth.ts";
import { createChatApiHandlers } from "./routes/chat_api.ts";
import { createChatSessionsApiHandlers } from "./routes/chat_sessions_api.ts";
import { createConfigApiHandlers } from "./routes/config_api.ts";
import { createDashboardHandler } from "./routes/dashboard_api.ts";
import { createModelsApiHandlers } from "./routes/models_api.ts";
import { createSecretsApiHandlers } from "./routes/secrets_api.ts";
import { createStaticHandlers } from "./routes/static.ts";
import type { Route, RouteHandler } from "./types.ts";

interface BuildRoutesConfig {
  passwordHash: string;
  secure: boolean;
  clientJs: string;
  bootstrapCss: string;
  customCss?: string;
  bootId: string;
  version: string;
  db: DatabaseHandle;
  spaHandler: RouteHandler;
}

interface BuiltRoutes {
  routes: Route[];
  checkSession: ReturnType<typeof createAuthHandlers>["checkSession"];
}

export function buildRoutes(config: BuildRoutesConfig): BuiltRoutes {
  const auth = createAuthHandlers({ passwordHash: config.passwordHash, secure: config.secure });
  const statics = createStaticHandlers({
    clientJs: config.clientJs,
    bootstrapCss: config.bootstrapCss,
    customCss: config.customCss,
    bootId: config.bootId,
  });
  const dashboard = createDashboardHandler({ version: config.version, db: config.db });
  const secrets = createSecretsApiHandlers(config.db);
  const cfg = createConfigApiHandlers(config.db);
  const models = createModelsApiHandlers(config.db);
  const chat = createChatApiHandlers(config.db);
  const chatSessions = createChatSessionsApiHandlers(config.db);

  return {
    checkSession: auth.checkSession,
    routes: [
      createRoute("POST", "/api/auth/login", auth.login, false),
      createRoute("POST", "/api/auth/logout", auth.logout, true),
      createRoute("GET", "/api/dashboard", dashboard, true),
      createRoute("GET", "/api/secrets", secrets.list, true),
      createRoute("POST", "/api/secrets", secrets.set, true),
      createRoute("DELETE", "/api/secrets/:key", secrets.remove, true),
      createRoute("GET", "/api/config", cfg.list, true),
      createRoute("POST", "/api/config", cfg.set, true),
      createRoute("POST", "/api/config/:key/undo", cfg.undo, true),
      createRoute("DELETE", "/api/config/:key", cfg.reset, true),
      createRoute("GET", "/api/models", models.list, true),
      createRoute("POST", "/api/models", models.set, true),
      createRoute("GET", "/api/chat", chatSessions.list, true),
      createRoute("PATCH", "/api/chat/:id", chatSessions.rename, true),
      createRoute("POST", "/api/chat", chat.create, true),
      createRoute("GET", "/api/chat/:id", chat.history, true),
      createRoute("GET", "/api/chat/:id/stream", chat.stream, true),
      createRoute("POST", "/api/chat/:id/send", chat.send, true),
      createRoute("GET", "/assets/app.js", statics.serveAppJs, false),
      createRoute("GET", "/assets/style.css", statics.serveStyleCss, false),
    ],
  };
}
