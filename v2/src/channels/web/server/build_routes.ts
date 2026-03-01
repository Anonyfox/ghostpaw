import type { DatabaseHandle } from "../../../lib/index.ts";
import { createRoute } from "./create_route.ts";
import { createAuthHandlers } from "./routes/auth.ts";
import { createChatApiHandlers } from "./routes/chat_api.ts";
import { createChatSessionsApiHandlers } from "./routes/chat_sessions_api.ts";
import { createConfigApiHandlers } from "./routes/config_api.ts";
import { createDashboardHandler } from "./routes/dashboard_api.ts";
import { createModelsApiHandlers } from "./routes/models_api.ts";
import { createSecretsApiHandlers } from "./routes/secrets_api.ts";
import { createSoulGenerateHandlers } from "./routes/soul_generate.ts";
import { createSoulTraitsApiHandlers } from "./routes/soul_traits_api.ts";
import { createSoulsApiHandlers } from "./routes/souls_api.ts";
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
  const souls = createSoulsApiHandlers(config.db);
  const soulGenerate = createSoulGenerateHandlers(config.db);
  const soulTraits = createSoulTraitsApiHandlers(config.db);

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
      createRoute("GET", "/api/souls", souls.list, true),
      createRoute("GET", "/api/souls/deleted", souls.listDeleted, true),
      createRoute("POST", "/api/souls", souls.create, true),
      createRoute("GET", "/api/souls/:id", souls.detail, true),
      createRoute("PATCH", "/api/souls/:id", souls.update, true),
      createRoute("DELETE", "/api/souls/:id", souls.archive, true),
      createRoute("POST", "/api/souls/:id/restore", souls.restore, true),
      createRoute(
        "POST",
        "/api/souls/:id/generate-description",
        soulGenerate.generateDescription,
        true,
      ),
      createRoute("POST", "/api/souls/:id/generate-name", soulGenerate.generateName, true),
      createRoute("GET", "/api/souls/:id/levels", souls.levels, true),
      createRoute("POST", "/api/souls/:id/revert-level-up", souls.revertLevel, true),
      createRoute("POST", "/api/souls/:id/traits", soulTraits.add, true),
      createRoute("PATCH", "/api/souls/:id/traits/:tid", soulTraits.revise, true),
      createRoute("POST", "/api/souls/:id/traits/:tid/revert", soulTraits.revert, true),
      createRoute("POST", "/api/souls/:id/traits/:tid/reactivate", soulTraits.reactivate, true),
      createRoute("GET", "/assets/app.js", statics.serveAppJs, false),
      createRoute("GET", "/assets/style.css", statics.serveStyleCss, false),
    ],
  };
}
