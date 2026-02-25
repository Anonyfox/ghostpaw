import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import type { ChannelRuntime } from "../channels/runtime.js";
import { getAllSkillRanks, hasHistory } from "../lib/skill-history.js";
import { parseJSON, readBody } from "./body.js";
import { json } from "./response.js";
import { extractParam, type Router } from "./router.js";

declare const __VERSION__: string;

export function registerAPIRoutes(router: Router, runtime: ChannelRuntime): void {
  router.add("GET", "/api/status", async (_req, res) => {
    const sessions = runtime.sessions;
    const allSessions = sessions.listSessions();
    const totalTokensIn = allSessions.reduce((sum, s) => sum + (s.tokensIn ?? 0), 0);
    const totalTokensOut = allSessions.reduce((sum, s) => sum + (s.tokensOut ?? 0), 0);

    let skillCount = 0;
    try {
      const skillDir = resolve(runtime.workspace, "skills");
      skillCount = readdirSync(skillDir).filter((f) => f.endsWith(".md")).length;
    } catch {
      /* no skills dir */
    }

    let agentCount = 0;
    try {
      const agentsDir = resolve(runtime.workspace, "agents");
      agentCount = readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length;
    } catch {
      /* no agents dir */
    }

    json(res, 200, {
      version: typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev",
      model: runtime.model,
      sessions: allSessions.length,
      skills: skillCount,
      agents: agentCount,
      memories: runtime.memory.count(),
      tokens: { in: totalTokensIn, out: totalTokensOut },
    });
  });

  router.add("GET", "/api/sessions", (_req, res) => {
    const allSessions = runtime.sessions.listSessions();
    const mapped = allSessions.map((s) => {
      let messageCount = 0;
      let preview = "";
      if (s.headMessageId) {
        const history = runtime.sessions.getConversationHistory(s.id);
        messageCount = history.filter((m) => !m.isCompaction).length;
        const firstUser = history.find((m) => m.role === "user" && !m.isCompaction);
        if (firstUser?.content) {
          preview = firstUser.content.slice(0, 120);
        }
      }
      return {
        id: s.id,
        key: s.key,
        createdAt: s.createdAt,
        lastActive: s.lastActive,
        tokensIn: s.tokensIn,
        tokensOut: s.tokensOut,
        model: s.model,
        absorbedAt: s.absorbedAt,
        messageCount,
        preview,
      };
    });
    json(res, 200, mapped);
  });

  router.add("POST", "/api/sessions", async (req, res) => {
    const body = (await parseJSON(req)) as { name?: string };
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 64) : "";
    const key = `web:${name || `session-${Date.now()}`}`;
    const session =
      runtime.sessions.getSessionByKey(key) ??
      runtime.sessions.createSession(key, { model: runtime.model });
    json(res, 201, { id: session.id, key });
  });

  router.add("GET", "/api/sessions/:key/messages", (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const rawKey = extractParam(url.pathname, "/api/sessions/:key/messages");
    if (!rawKey) {
      json(res, 400, { error: "Invalid session key" });
      return;
    }
    const key = decodeURIComponent(rawKey);
    if (!/^[\w:.-]+$/.test(key)) {
      json(res, 400, { error: "Invalid session key" });
      return;
    }
    const session = runtime.sessions.getSessionByKey(key);
    if (!session) {
      json(res, 404, { error: "Session not found" });
      return;
    }
    const messages = runtime.sessions.getConversationHistory(session.id);
    json(
      res,
      200,
      messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        isCompaction: m.isCompaction,
      })),
    );
  });

  router.add("POST", "/api/sessions/:key/chat", async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const rawKey = extractParam(url.pathname, "/api/sessions/:key/chat");
    if (!rawKey) {
      json(res, 400, { error: "Invalid session key" });
      return;
    }
    const sessionKey = decodeURIComponent(rawKey);
    if (!/^[\w:.-]+$/.test(sessionKey)) {
      json(res, 400, { error: "Invalid session key" });
      return;
    }

    const body = (await parseJSON(req)) as { message?: string };
    const message = body?.message;
    if (typeof message !== "string" || !message.trim()) {
      json(res, 400, { error: "Message is required" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    let clientDisconnected = false;
    req.on("close", () => {
      clientDisconnected = true;
    });

    try {
      for await (const chunk of runtime.stream(sessionKey, message.trim())) {
        if (clientDisconnected) break;
        res.write(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`);
      }
      if (!clientDisconnected) {
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      }
    } catch (err) {
      if (!clientDisconnected) {
        res.write(
          `data: ${JSON.stringify({ type: "error", message: (err as Error).message })}\n\n`,
        );
      }
    } finally {
      res.end();
    }
  });

  router.add("GET", "/api/skills", async (_req, res) => {
    const skillDir = resolve(runtime.workspace, "skills");
    let files: string[] = [];
    try {
      files = readdirSync(skillDir)
        .filter((f) => f.endsWith(".md"))
        .sort();
    } catch {
      /* no skills dir */
    }

    const ranks = hasHistory(runtime.workspace) ? getAllSkillRanks(runtime.workspace) : {};

    const skills = files.map((filename) => {
      let title = filename.replace(/\.md$/, "");
      let lines = 0;
      let description = "";
      try {
        const content = readFileSync(resolve(skillDir, filename), "utf-8");
        const titleMatch = content.match(/^#\s+(.+)/m);
        if (titleMatch) title = titleMatch[1]!;
        lines = content.split("\n").length;
        const descLine = content
          .split("\n")
          .find((l) => l.trim().length > 0 && !l.trim().startsWith("#"));
        if (descLine) description = descLine.trim().slice(0, 160);
      } catch {
        /* keep filename as title */
      }
      return { filename, title, rank: ranks[filename] ?? 0, lines, description };
    });
    json(res, 200, skills);
  });

  router.add("GET", "/api/skills/:filename", async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const filename = extractParam(url.pathname, "/api/skills/:filename");
    if (!filename || !filename.endsWith(".md")) {
      json(res, 400, { error: "Invalid skill filename" });
      return;
    }

    const skillDir = resolve(runtime.workspace, "skills");
    const fullPath = resolve(skillDir, decodeURIComponent(filename));
    if (relative(skillDir, fullPath).startsWith("..")) {
      json(res, 403, { error: "Access denied" });
      return;
    }

    try {
      const content = readFileSync(fullPath, "utf-8");
      json(res, 200, { filename, content });
    } catch {
      json(res, 404, { error: "Skill not found" });
    }
  });

  router.add("PUT", "/api/skills/:filename", async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const filename = extractParam(url.pathname, "/api/skills/:filename");
    if (!filename || !filename.endsWith(".md")) {
      json(res, 400, { error: "Invalid skill filename" });
      return;
    }

    const body = (await parseJSON(req)) as { content?: string };
    if (typeof body?.content !== "string") {
      json(res, 400, { error: "Content is required" });
      return;
    }

    const skillDir = resolve(runtime.workspace, "skills");
    const fullPath = resolve(skillDir, decodeURIComponent(filename));
    if (relative(skillDir, fullPath).startsWith("..")) {
      json(res, 403, { error: "Access denied" });
      return;
    }

    mkdirSync(skillDir, { recursive: true });
    writeFileSync(fullPath, body.content, "utf-8");
    json(res, 200, { ok: true });
  });

  // ── Agents ──────────────────────────────────────────────────────────────

  router.add("GET", "/api/agents", async (_req, res) => {
    const agentsDir = resolve(runtime.workspace, "agents");
    let files: string[] = [];
    try {
      files = readdirSync(agentsDir)
        .filter((f) => f.endsWith(".md"))
        .sort();
    } catch {
      /* no agents dir */
    }

    const agents = files.map((filename) => {
      let title = filename.replace(/\.md$/, "");
      let lines = 0;
      let description = "";
      try {
        const content = readFileSync(resolve(agentsDir, filename), "utf-8");
        const titleMatch = content.match(/^#\s+(.+)/m);
        if (titleMatch) title = titleMatch[1]!;
        lines = content.split("\n").length;
        const descLine = content
          .split("\n")
          .find((l) => l.trim().length > 0 && !l.trim().startsWith("#"));
        if (descLine) description = descLine.trim().slice(0, 160);
      } catch {
        /* keep filename as title */
      }
      return { filename, title, lines, description };
    });
    json(res, 200, agents);
  });

  router.add("GET", "/api/agents/:filename", async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const filename = extractParam(url.pathname, "/api/agents/:filename");
    if (!filename || !filename.endsWith(".md")) {
      json(res, 400, { error: "Invalid agent filename" });
      return;
    }

    const agentsDir = resolve(runtime.workspace, "agents");
    const fullPath = resolve(agentsDir, decodeURIComponent(filename));
    if (relative(agentsDir, fullPath).startsWith("..")) {
      json(res, 403, { error: "Access denied" });
      return;
    }

    try {
      const content = readFileSync(fullPath, "utf-8");
      json(res, 200, { filename, content });
    } catch {
      json(res, 404, { error: "Agent not found" });
    }
  });

  router.add("PUT", "/api/agents/:filename", async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const filename = extractParam(url.pathname, "/api/agents/:filename");
    if (!filename || !filename.endsWith(".md")) {
      json(res, 400, { error: "Invalid agent filename" });
      return;
    }

    const body = (await parseJSON(req)) as { content?: string };
    if (typeof body?.content !== "string") {
      json(res, 400, { error: "Content is required" });
      return;
    }

    const agentsDir = resolve(runtime.workspace, "agents");
    const fullPath = resolve(agentsDir, decodeURIComponent(filename));
    if (relative(agentsDir, fullPath).startsWith("..")) {
      json(res, 403, { error: "Access denied" });
      return;
    }

    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(fullPath, body.content, "utf-8");
    json(res, 200, { ok: true });
  });

  router.add("DELETE", "/api/agents/:filename", async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const filename = extractParam(url.pathname, "/api/agents/:filename");
    if (!filename || !filename.endsWith(".md")) {
      json(res, 400, { error: "Invalid agent filename" });
      return;
    }

    const agentsDir = resolve(runtime.workspace, "agents");
    const fullPath = resolve(agentsDir, decodeURIComponent(filename));
    if (relative(agentsDir, fullPath).startsWith("..")) {
      json(res, 403, { error: "Access denied" });
      return;
    }

    try {
      unlinkSync(fullPath);
      json(res, 200, { ok: true });
    } catch {
      json(res, 404, { error: "Agent not found" });
    }
  });

  router.add("GET", "/api/memory", async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const query = url.searchParams.get("q");

    if (query) {
      const { createEmbeddingProvider } = await import("../lib/embedding.js");
      const embedding = createEmbeddingProvider();
      const vec = await embedding.embed(query);
      const matches = runtime.memory.search(vec, { k: 20, minScore: 0.05, includeGlobal: true });
      json(res, 200, { memories: matches, total: matches.length, query: true });
    } else {
      const all = runtime.memory.list();
      const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
      const total = sorted.length;
      const page = sorted.slice(0, 200);
      json(res, 200, { memories: page, total, query: false });
    }
  });

  router.add("DELETE", "/api/memory/:id", (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const id = extractParam(url.pathname, "/api/memory/:id");
    if (!id) {
      json(res, 400, { error: "Invalid memory ID" });
      return;
    }
    runtime.memory.delete(id);
    json(res, 200, { ok: true });
  });

  router.add("GET", "/api/secrets", (_req, res) => {
    const keys = runtime.secrets.keys();
    json(
      res,
      200,
      keys.map((k) => ({ key: k, configured: true })),
    );
  });

  // ── Settings ─────────────────────────────────────────────────────────────

  router.add("GET", "/api/settings", async (_req, res) => {
    const {
      PROVIDERS,
      PROVIDER_IDS,
      getModelsForProvider,
      getApiKey,
      isProviderActive,
      detectProviderByModel,
    } = await import("chatoyant");
    const { KNOWN_KEYS } = await import("../core/secrets.js");
    const { loadConfig } = await import("../core/config.js");

    const config = await loadConfig(runtime.workspace);
    const currentModel = runtime.model;
    const currentProvider = detectProviderByModel(currentModel);
    const allSecretKeys = runtime.secrets.keys();

    async function fetchLiveModels(id: string): Promise<string[] | null> {
      try {
        const apiKey = getApiKey(id as "openai" | "anthropic" | "xai");
        if (id === "openai") {
          const { listModelIds } = await import("chatoyant/providers/openai");
          return await listModelIds({ apiKey, timeout: 8000 });
        }
        if (id === "xai") {
          const { getLanguageModelList } = await import("chatoyant/providers/xai");
          const lms = await getLanguageModelList({ apiKey, timeout: 8000 });
          return lms.map((m) => m.id);
        }
      } catch {
        /* fall back to hardcoded */
      }
      return null;
    }

    const providers = await Promise.all(
      PROVIDER_IDS.map(async (id) => {
        const meta = PROVIDERS[id];
        const active = isProviderActive(id);
        const fallback = Array.from(getModelsForProvider(id));
        const live = active ? await fetchLiveModels(id) : null;
        const models = live ?? fallback;
        return {
          id,
          name: meta.name,
          envKey: meta.envKey,
          active,
          isCurrent: currentProvider === id,
          currentModel: currentProvider === id ? currentModel : (models[0] ?? ""),
          models,
          live: !!live,
        };
      }),
    );

    const secrets = allSecretKeys.map((k) => {
      const known = KNOWN_KEYS.find((kk) => kk.canonical === k);
      const val = runtime.secrets.get(k);
      return {
        key: k,
        category: known?.category ?? "custom",
        label: known?.label ?? k,
        length: val?.length ?? 0,
        configured: !!val,
      };
    });

    const knownUnconfigured = KNOWN_KEYS.filter((kk) => !allSecretKeys.includes(kk.canonical)).map(
      (kk) => ({
        key: kk.canonical,
        category: kk.category,
        label: kk.label,
        length: 0,
        configured: false,
      }),
    );

    json(res, 200, {
      model: currentModel,
      config: { costControls: config.costControls },
      providers,
      secrets: [...secrets, ...knownUnconfigured],
    });
  });

  router.add("PUT", "/api/settings/model", async (req, res) => {
    const body = (await parseJSON(req)) as { model?: string };
    const newModel = body?.model;
    if (typeof newModel !== "string" || !newModel.trim()) {
      json(res, 400, { error: "Model name is required" });
      return;
    }

    const { saveConfig, loadConfig } = await import("../core/config.js");
    const config = await loadConfig(runtime.workspace);
    runtime.setModel(newModel.trim());
    config.models.default = newModel.trim();
    saveConfig(runtime.workspace, config);

    json(res, 200, { model: runtime.model });
  });

  router.add("PUT", "/api/settings/secrets/:key", async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const rawKey = extractParam(url.pathname, "/api/settings/secrets/:key");
    if (!rawKey) {
      json(res, 400, { error: "Invalid key" });
      return;
    }
    const key = decodeURIComponent(rawKey);

    const body = (await parseJSON(req)) as { value?: string };
    if (typeof body?.value !== "string") {
      json(res, 400, { error: "Value is required" });
      return;
    }

    const result = runtime.secrets.set(key, body.value);
    if (!result.value) {
      json(res, 400, { error: result.warning ?? "Empty value" });
      return;
    }
    json(res, 200, { key, warning: result.warning });
  });

  router.add("DELETE", "/api/settings/secrets/:key", (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const rawKey = extractParam(url.pathname, "/api/settings/secrets/:key");
    if (!rawKey) {
      json(res, 400, { error: "Invalid key" });
      return;
    }
    const key = decodeURIComponent(rawKey);
    runtime.secrets.delete(key);
    json(res, 200, { deleted: key });
  });

  // ── Training ──────────────────────────────────────────────────────────────

  let trainingInProgress = false;

  router.add("GET", "/api/train/status", async (_req, res) => {
    const { countUnabsorbedSessions } = await import("../core/absorb.js");

    let totalSkills = 0;
    try {
      const skillDir = resolve(runtime.workspace, "skills");
      totalSkills = readdirSync(skillDir).filter((f) => f.endsWith(".md")).length;
    } catch {
      /* no skills dir */
    }

    json(res, 200, {
      unabsorbed: countUnabsorbedSessions(runtime.sessions),
      totalSkills,
      running: trainingInProgress,
    });
  });

  router.add("POST", "/api/train", async (req, res) => {
    if (trainingInProgress) {
      json(res, 409, { error: "Training is already in progress" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    let clientDisconnected = false;
    req.on("close", () => {
      clientDisconnected = true;
    });

    function send(data: unknown) {
      if (!clientDisconnected) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    }

    trainingInProgress = true;
    try {
      const { runTrain } = await import("../core/reflect.js");
      const result = await runTrain(runtime.workspace, (phase) => {
        send({ type: "phase", phase });
      });

      send({
        type: "result",
        absorbed: result.absorbed,
        memoriesCreated: result.memoriesCreated,
        skippedAbsorb: result.skippedAbsorb,
        tidied: result.tidied,
        totalSkills: result.totalSkills,
        changes: result.changes.map((c) => ({
          type: c.type,
          filename: c.filename,
          title: c.title,
          rank: c.rank,
          description: c.description,
        })),
      });
    } catch (err) {
      send({ type: "error", message: (err as Error).message });
    } finally {
      trainingInProgress = false;
      res.end();
    }
  });

  // ── Scouting ────────────────────────────────────────────────────────────────

  let scoutInProgress = false;

  router.add("GET", "/api/scout/status", async (_req, res) => {
    let totalSkills = 0;
    try {
      const skillDir = resolve(runtime.workspace, "skills");
      totalSkills = readdirSync(skillDir).filter((f) => f.endsWith(".md")).length;
    } catch {
      /* no skills dir */
    }

    json(res, 200, {
      memoryCount: runtime.memory.count(),
      skillCount: totalSkills,
      running: scoutInProgress,
    });
  });

  router.add("POST", "/api/scout", async (req, res) => {
    if (scoutInProgress) {
      json(res, 409, { error: "Scouting is already in progress" });
      return;
    }

    let direction: string | undefined;
    try {
      const raw = await readBody(req);
      if (raw.trim()) {
        const body = JSON.parse(raw) as { direction?: string };
        if (body.direction && typeof body.direction === "string" && body.direction.trim()) {
          direction = body.direction.trim().slice(0, 200);
        }
      }
    } catch {
      /* empty body is fine — means friction mining */
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    let clientDisconnected = false;
    req.on("close", () => {
      clientDisconnected = true;
    });

    function send(data: unknown) {
      if (!clientDisconnected) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    }

    scoutInProgress = true;
    try {
      const { runScout } = await import("../core/scout.js");

      if (!direction) {
        send({ type: "phase", phase: "mining" });
        const result = await runScout(runtime.workspace);
        send({
          type: "trails",
          trails: (result.trails ?? []).map((t) => ({ title: t.title, why: t.why })),
        });
      } else {
        send({ type: "phase", phase: "researching" });
        const result = await runScout(runtime.workspace, direction);
        send({
          type: "report",
          direction: result.direction,
          report: result.report ?? "",
        });
      }
    } catch (err) {
      send({ type: "error", message: (err as Error).message });
    } finally {
      scoutInProgress = false;
      res.end();
    }
  });
}
