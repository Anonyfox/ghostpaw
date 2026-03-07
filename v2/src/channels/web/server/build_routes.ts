import type { Entity } from "../../../harness/index.ts";
import type { DatabaseHandle } from "../../../lib/index.ts";
import { createRoute } from "./create_route.ts";
import { createAuthHandlers } from "./routes/auth.ts";
import { createChatApiHandlers } from "./routes/chat_api.ts";
import { createChatSessionsApiHandlers } from "./routes/chat_sessions_api.ts";
import { createConfigApiHandlers } from "./routes/config_api.ts";
import { createCostsApiHandlers } from "./routes/costs_api.ts";
import { createDashboardHandler } from "./routes/dashboard_api.ts";
import { createDistillApiHandlers } from "./routes/distill_api.ts";
import { createHauntApiHandlers } from "./routes/haunt_api.ts";
import { createHowlsApiHandlers } from "./routes/howls_api.ts";
import { createMemoryApiHandlers } from "./routes/memory_api.ts";
import { createMentorApiHandlers } from "./routes/mentor_api.ts";
import { createModelsApiHandlers } from "./routes/models_api.ts";
import { createPackApiHandlers } from "./routes/pack_api.ts";
import { createQuestsApiHandlers } from "./routes/quests_api.ts";
import { createSecretsApiHandlers } from "./routes/secrets_api.ts";
import { createSessionsApiHandlers } from "./routes/sessions_api.ts";
import { createSkillsApiHandlers } from "./routes/skills_api.ts";
import { createSoulGenerateHandlers } from "./routes/soul_generate.ts";
import { createSoulTraitsApiHandlers } from "./routes/soul_traits_api.ts";
import { createSoulsApiHandlers } from "./routes/souls_api.ts";
import { createStaticHandlers } from "./routes/static.ts";
import { createTrainerApiHandlers } from "./routes/trainer_api.ts";
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
  entity?: Entity;
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
  const souls = createSoulsApiHandlers(config.db, config.entity != null);
  const soulGenerate = createSoulGenerateHandlers(config.db);
  const soulTraits = createSoulTraitsApiHandlers(config.db);
  const memories = createMemoryApiHandlers(config.db);
  const pack = createPackApiHandlers(config.db);
  const costs = createCostsApiHandlers(config.db);
  const sessions = createSessionsApiHandlers(config.db);
  const distill = createDistillApiHandlers(config.db);
  const haunt = createHauntApiHandlers(config.db, config.entity);
  const howls = createHowlsApiHandlers(config.db);
  const mentor = createMentorApiHandlers(config.db, config.entity);
  const trainer = createTrainerApiHandlers(config.db, config.entity);
  const quests = createQuestsApiHandlers(config.db);
  const skills = createSkillsApiHandlers();

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
      createRoute("POST", "/api/souls/:id/review", mentor.review, true),
      createRoute("POST", "/api/souls/:id/refine", mentor.refine, true),
      createRoute("POST", "/api/souls/:id/level-up", mentor.levelUp, true),
      createRoute("GET", "/api/trainer/status", trainer.status, true),
      createRoute("POST", "/api/trainer/scout/propose", trainer.scoutPropose, true),
      createRoute("POST", "/api/trainer/scout/execute", trainer.scoutExecute, true),
      createRoute("POST", "/api/trainer/train/propose", trainer.trainPropose, true),
      createRoute("POST", "/api/trainer/train/execute", trainer.trainExecute, true),
      createRoute("GET", "/api/skills", skills.list, true),
      createRoute("GET", "/api/skills/:name", skills.detail, true),
      createRoute("POST", "/api/skills/:name/validate", skills.validate, true),
      createRoute("GET", "/api/memories", memories.list, true),
      createRoute("GET", "/api/memories/stats", memories.stats, true),
      createRoute("GET", "/api/memories/search", memories.search, true),
      createRoute("POST", "/api/memories", memories.store, true),
      createRoute("POST", "/api/memories/merge", memories.merge, true),
      createRoute("GET", "/api/memories/:id", memories.detail, true),
      createRoute("POST", "/api/memories/:id/confirm", memories.confirm, true),
      createRoute("POST", "/api/memories/:id/forget", memories.forget, true),
      createRoute("PATCH", "/api/memories/:id", memories.correct, true),
      createRoute("GET", "/api/pack", pack.list, true),
      createRoute("GET", "/api/pack/stats", pack.stats, true),
      createRoute("POST", "/api/pack", pack.meet, true),
      createRoute("GET", "/api/pack/:id", pack.detail, true),
      createRoute("PATCH", "/api/pack/:id", pack.bond, true),
      createRoute("POST", "/api/pack/:id/note", pack.note, true),
      createRoute("GET", "/api/pack/:id/interactions", pack.interactions, true),
      createRoute("GET", "/api/pack/:id/contacts", pack.contacts, true),
      createRoute("POST", "/api/pack/:id/contacts", pack.addContact, true),
      createRoute("DELETE", "/api/pack/contacts/:contactId", pack.removeContact, true),
      createRoute("GET", "/api/pack/lookup/:type/:value", pack.lookupContact, true),
      createRoute("POST", "/api/pack/merge", pack.merge, true),
      createRoute("GET", "/api/quests", quests.list, true),
      createRoute("GET", "/api/quests/context", quests.context, true),
      createRoute("POST", "/api/quests", quests.create, true),
      createRoute("GET", "/api/quests/:id", quests.detail, true),
      createRoute("PATCH", "/api/quests/:id", quests.update, true),
      createRoute("POST", "/api/quests/:id/done", quests.done, true),
      createRoute("POST", "/api/quests/:id/accept", quests.accept, true),
      createRoute("POST", "/api/quests/:id/dismiss", quests.dismiss, true),
      createRoute("POST", "/api/quests/:id/occurrence", quests.occurrence, true),
      createRoute("GET", "/api/quest-logs", quests.logList, true),
      createRoute("POST", "/api/quest-logs", quests.logCreate, true),
      createRoute("GET", "/api/quest-logs/:id", quests.logDetail, true),
      createRoute("PATCH", "/api/quest-logs/:id", quests.logUpdate, true),
      createRoute("POST", "/api/quest-logs/:id/done", quests.logDone, true),
      createRoute("GET", "/api/costs", costs.get, true),
      createRoute("POST", "/api/costs/limit", costs.setLimit, true),
      createRoute("GET", "/api/sessions", sessions.list, true),
      createRoute("GET", "/api/sessions/stats", sessions.stats, true),
      createRoute("GET", "/api/sessions/:id", sessions.detail, true),
      createRoute("POST", "/api/sessions/prune", sessions.prune, true),
      createRoute("GET", "/api/distill/status", distill.status, true),
      createRoute("POST", "/api/distill", distill.sweep, true),
      createRoute("POST", "/api/distill/:id", distill.single, true),
      createRoute("POST", "/api/haunt", haunt.trigger, true),
      createRoute("GET", "/api/haunt/status", haunt.status, true),
      createRoute("GET", "/api/howls/pending", howls.pending, true),
      createRoute("GET", "/api/howls", howls.list, true),
      createRoute("GET", "/api/howls/:id", howls.detail, true),
      createRoute("GET", "/api/howls/:id/history", howls.history, true),
      createRoute("POST", "/api/howls/:id/reply", howls.reply, true),
      createRoute("POST", "/api/howls/:id/dismiss", howls.dismiss, true),
      createRoute("GET", "/assets/app.js", statics.serveAppJs, false),
      createRoute("GET", "/assets/style.css", statics.serveStyleCss, false),
    ],
  };
}
