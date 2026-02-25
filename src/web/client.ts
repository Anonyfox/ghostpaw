let _markedJS = "";
try {
  // @ts-expect-error — resolved by esbuild text-asset plugin at build time
  const m = await import("text-asset:marked/lib/marked.umd.js");
  _markedJS = m.default;
} catch {
  // Not available in test environment (tsx) — empty JS is fine for tests
}

export const markedJS: string = _markedJS;

export const clientJS = /* javascript */ `
"use strict";

// ── State ───────────────────────────────────────────────────────────────────

let currentView = "chat";
let currentSessionKey = null;
let sessions = [];
let isStreaming = false;

// ── API helpers ─────────────────────────────────────────────────────────────

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res;
}

async function apiJSON(path, opts) {
  const res = await api(path, opts);
  return res ? res.json() : null;
}

// ── Mobile drawer ───────────────────────────────────────────────────────────

const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebarBackdrop");

function openDrawer() {
  sidebar.classList.add("open");
  backdrop.classList.add("visible");
}

function closeDrawer() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("visible");
}

document.getElementById("btnMenu")?.addEventListener("click", openDrawer);
backdrop?.addEventListener("click", closeDrawer);

function handleMobileNav() {
  if (window.innerWidth <= 768) closeDrawer();
}

// ── Navigation ──────────────────────────────────────────────────────────────

const views = ["chat", "dashboard", "sessions", "skills", "agents", "memory", "train", "scout", "settings"];
const viewEls = {};
views.forEach(v => { viewEls[v] = document.getElementById("view" + v.charAt(0).toUpperCase() + v.slice(1)); });

document.querySelectorAll("[data-view]").forEach(el => {
  el.addEventListener("click", () => {
    switchView(el.dataset.view);
    handleMobileNav();
  });
});

function switchView(view) {
  currentView = view;
  views.forEach(v => {
    viewEls[v].classList.toggle("d-none", v !== view);
  });
  document.querySelectorAll("[data-view]").forEach(el => {
    el.classList.toggle("active", el.dataset.view === view);
  });
  const isChat = view === "chat";
  document.getElementById("sessionList").style.display = isChat ? "" : "none";
  document.getElementById("btnNewChat").style.display = isChat ? "" : "none";
  if (view === "dashboard") loadDashboard();
  if (view === "sessions") loadSessionsView();
  if (view === "skills") loadSkills();
  if (view === "agents") loadAgents();
  if (view === "memory") loadMemory();
  if (view === "train") loadTrain();
  if (view === "scout") loadScout();
  if (view === "settings") loadSettings();
}

// ── Sessions ────────────────────────────────────────────────────────────────

async function loadSessions() {
  sessions = await apiJSON("/api/sessions") || [];
  renderSessionList();
}

function renderSessionList() {
  const el = document.getElementById("sessionList");
  const webSessions = sessions
    .filter(s => s.key.startsWith("web:"))
    .sort((a, b) => b.lastActive - a.lastActive);

  if (!webSessions.length) {
    el.innerHTML = '<div class="gp-text-muted" style="padding:.5rem;font-size:.8rem">No sessions yet</div>';
    return;
  }

  el.innerHTML = webSessions.map(s => {
    const label = s.key.replace("web:", "") || "default";
    const active = s.key === currentSessionKey ? " active" : "";
    const date = new Date(s.lastActive).toLocaleDateString();
    const tokens = formatNumber(s.tokensIn + s.tokensOut);
    const cost = formatCost(s.costUsd);
    return '<div class="gp-session-item' + active + '" data-session-key="' + escapeAttr(s.key) + '">'
      + '<div class="gp-session-label">' + escapeHtml(label) + '</div>'
      + '<div class="gp-session-meta">'
      + '<span>' + date + '</span>'
      + '<span>' + tokens + ' tok' + (cost ? ' · ' + cost : '') + '</span>'
      + '</div></div>';
  }).join("");

  el.querySelectorAll("[data-session-key]").forEach(item => {
    item.addEventListener("click", () => {
      if (currentView !== "chat") switchView("chat");
      selectSession(item.dataset.sessionKey);
      handleMobileNav();
    });
  });
}

async function selectSession(key) {
  currentSessionKey = key;
  renderSessionList();
  await loadMessages();
}

async function createSession() {
  const name = "chat-" + Date.now();
  const data = await apiJSON("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (data) {
    await loadSessions();
    await selectSession(data.key);
  }
}

async function loadMessages() {
  if (!currentSessionKey) return;
  const el = document.getElementById("chatMessages");
  const messages = await apiJSON("/api/sessions/" + encodeURIComponent(currentSessionKey) + "/messages");
  if (!messages) return;

  const visible = messages.filter(m => !m.isCompaction);
  if (!visible.length) {
    el.innerHTML = '<div class="gp-empty" id="chatEmpty"><div class="gp-empty-icon"></div>'
      + '<div><div style="font-size:1.1rem;color:var(--gp-text);margin-bottom:.25rem">Start a conversation</div>'
      + '<div style="font-size:.85rem">Type a message below</div></div></div>';
    return;
  }

  el.innerHTML = visible.map(m => renderMessage(m.role, m.content || "")).join("");
  addCopyButtons();
  el.scrollTop = el.scrollHeight;
}

// ── Chat ────────────────────────────────────────────────────────────────────

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const btnSend = document.getElementById("btnSend");

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + "px";
});

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || isStreaming) return;

  if (!currentSessionKey) await createSession();
  if (!currentSessionKey) return;

  hideEmptyState();
  appendMessage("user", text);
  chatInput.value = "";
  chatInput.style.height = "auto";
  isStreaming = true;
  btnSend.disabled = true;

  const messagesEl = document.getElementById("chatMessages");
  const assistantEl = document.createElement("div");
  assistantEl.className = "gp-msg gp-msg-assistant";
  messagesEl.appendChild(assistantEl);

  const typingEl = document.createElement("div");
  typingEl.className = "gp-typing";
  typingEl.innerHTML = "<span></span><span></span><span></span>";
  assistantEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  let accumulated = "";

  try {
    const res = await fetch("/api/sessions/" + encodeURIComponent(currentSessionKey) + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (res.status === 401) { window.location.href = "/login"; return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "chunk") {
            if (typingEl.parentNode) typingEl.remove();
            accumulated += evt.text;
            assistantEl.innerHTML = renderMarkdown(accumulated);
            assistantEl.classList.add("gp-cursor");
            messagesEl.scrollTop = messagesEl.scrollHeight;
          } else if (evt.type === "error") {
            if (typingEl.parentNode) typingEl.remove();
            assistantEl.classList.remove("gp-cursor");
            assistantEl.innerHTML = '<div class="gp-text-danger">' + escapeHtml(evt.message) + '</div>';
          }
        } catch { /* skip malformed events */ }
      }
    }

    assistantEl.classList.remove("gp-cursor");
    if (!accumulated && typingEl.parentNode) {
      typingEl.remove();
      assistantEl.innerHTML = '<span class="gp-text-muted">(no response)</span>';
    }
    addCopyButtons();
  } catch (err) {
    if (typingEl.parentNode) typingEl.remove();
    assistantEl.classList.remove("gp-cursor");
    assistantEl.innerHTML = '<div class="gp-text-danger">Connection error</div>';
  } finally {
    isStreaming = false;
    btnSend.disabled = false;
    chatInput.focus();
  }
});

function hideEmptyState() {
  const empty = document.getElementById("chatEmpty");
  if (empty) empty.remove();
}

function appendMessage(role, content) {
  hideEmptyState();
  const el = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = "gp-msg gp-msg-" + role;
  div.innerHTML = role === "user" ? escapeHtml(content) : renderMarkdown(content);
  el.appendChild(div);
  if (role !== "user") addCopyButtons();
  el.scrollTop = el.scrollHeight;
}

function renderMessage(role, content) {
  const cls = "gp-msg gp-msg-" + role;
  const inner = role === "user" ? escapeHtml(content) : renderMarkdown(content);
  return '<div class="' + cls + '">' + inner + '</div>';
}

// ── Copy buttons on code blocks ─────────────────────────────────────────────

function addCopyButtons() {
  document.querySelectorAll(".gp-msg-assistant pre").forEach(pre => {
    if (pre.querySelector(".gp-copy-btn")) return;
    const btn = document.createElement("button");
    btn.className = "gp-copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", () => {
      const code = pre.querySelector("code");
      const text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "Copied!";
        btn.style.color = "var(--gp-success)";
        setTimeout(() => { btn.textContent = "Copy"; btn.style.color = ""; }, 1500);
      });
    });
    pre.appendChild(btn);
  });
}

// ── Markdown rendering (with XSS prevention) ───────────────────────────────

if (typeof marked !== "undefined") {
  const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];
  marked.use({
    renderer: {
      html(token) { return escapeHtml(token.text || token.raw || ""); },
      link(token) {
        try {
          const proto = new URL(token.href, "https://x").protocol;
          if (!SAFE_PROTOCOLS.includes(proto)) return escapeHtml(token.text || token.href);
        } catch { return escapeHtml(token.text || token.href); }
        const title = token.title ? ' title="' + escapeAttr(token.title) + '"' : "";
        return '<a href="' + escapeAttr(token.href) + '"' + title + ' rel="noopener noreferrer" target="_blank">' + escapeHtml(token.text || token.href) + '</a>';
      },
      image(token) {
        try {
          const proto = new URL(token.href, "https://x").protocol;
          if (!SAFE_PROTOCOLS.includes(proto)) return escapeHtml(token.text || "");
        } catch { return escapeHtml(token.text || ""); }
        return '<img src="' + escapeAttr(token.href) + '" alt="' + escapeAttr(token.text || "") + '" style="max-width:100%">';
      },
    },
  });
}

function renderMarkdown(text) {
  if (typeof marked === "undefined") return escapeHtml(text);
  try {
    return marked.parse(text, { breaks: true, gfm: true });
  } catch {
    return escapeHtml(text);
  }
}

// ── Dashboard ───────────────────────────────────────────────────────────────

const STAT_ICONS = { Model: "\\u2728", Sessions: "\\uD83D\\uDCC4", Skills: "\\u26A1", Souls: "\\uD83D\\uDC65", Memories: "\\uD83E\\uDDE0", "Tokens In": "\\u2B07\\uFE0F", "Tokens Out": "\\u2B06\\uFE0F" };

async function loadDashboard() {
  const data = await apiJSON("/api/status");
  if (!data) return;
  const el = document.getElementById("dashboardStats");
  const stats = [
    { label: "Model", value: data.model || "\\u2014" },
    { label: "Sessions", value: data.sessions },
    { label: "Skills", value: data.skills },
    { label: "Souls", value: data.agents ?? 0 },
    { label: "Memories", value: data.memories },
    { label: "Tokens In", value: formatNumber(data.tokens.in) },
    { label: "Tokens Out", value: formatNumber(data.tokens.out) },
  ];
  el.innerHTML = stats.map(s =>
    '<div class="col-6 col-md-4 col-lg-3"><div class="gp-surface p-3 gp-stat">'
    + '<div class="gp-stat-icon">' + (STAT_ICONS[s.label] || "") + '</div>'
    + '<div class="gp-stat-value">' + escapeHtml(String(s.value)) + '</div>'
    + '<div class="gp-stat-label">' + escapeHtml(s.label) + '</div>'
    + '</div></div>'
  ).join("");
  document.getElementById("footerModel").textContent = data.model || "";
}

// ── Sessions view ───────────────────────────────────────────────────────────

let sessAllSessions = [];
let sessActiveChannel = "all";
let sessExpandedId = "";

function sessionsIntroHTML() {
  return '<div class="gp-sess-intro">'
    + '<div class="gp-sess-intro-heading">Conversation sessions</div>'
    + '<p>Every conversation your agent has \u2014 via chat, Telegram, scouting, or internal tasks \u2014 is a session. '
    + 'Sessions capture the full dialogue and token usage, then get absorbed during training to distill learnings into memories and skills.</p>'
    + '<div class="gp-sess-lifecycle">'
    + '<span class="gp-sess-lifecycle-step">\uD83D\uDCAC Conversation</span>'
    + '<span class="gp-sess-lifecycle-arrow">\u2192</span>'
    + '<span class="gp-sess-lifecycle-step">\uD83E\uDDEA Absorption</span>'
    + '<span class="gp-sess-lifecycle-arrow">\u2192</span>'
    + '<span class="gp-sess-lifecycle-step">\uD83E\uDDE0 Memories</span>'
    + '<span class="gp-sess-lifecycle-arrow">\u2192</span>'
    + '<span class="gp-sess-lifecycle-step">\u2B50 Skills</span>'
    + '</div></div>';
}

function channelOf(key) {
  if (key.startsWith("web:")) return "web";
  if (key.startsWith("telegram:")) return "telegram";
  if (key.startsWith("agent-") || key.startsWith("scout-craft-")) return "agent";
  return "other";
}

function channelLabel(key) {
  const ch = channelOf(key);
  if (ch === "web") return key.replace("web:", "") || "default";
  if (ch === "telegram") return key.replace("telegram:", "") || "default";
  if (ch === "agent") return key.replace("agent-", "").replace("scout-craft-", "scout\u00B7");
  return key;
}

function channelBadge(channel) {
  const labels = { web: "Web", telegram: "Telegram", agent: "Agent", other: "Other" };
  return '<span class="gp-sess-channel-badge gp-sess-channel-' + channel + '">' + (labels[channel] || "Other") + '</span>';
}

function sessStatusBadge(s) {
  if (s.absorbedAt) return '<span class="gp-sess-status gp-sess-status-absorbed">Absorbed</span>';
  if (s.messageCount === 0) return '<span class="gp-sess-status gp-sess-status-new">Empty</span>';
  return '<span class="gp-sess-status gp-sess-status-unabsorbed">Unabsorbed</span>';
}

function renderSessionStats(sessions) {
  const total = sessions.length;
  const tokensTotal = sessions.reduce((a, s) => a + s.tokensIn + s.tokensOut, 0);
  const costTotal = sessions.reduce((a, s) => a + (s.costUsd || 0), 0);
  const absorbed = sessions.filter(s => s.absorbedAt).length;
  const unabsorbed = sessions.filter(s => !s.absorbedAt && s.messageCount > 0).length;
  const costDisplay = costTotal > 0 ? formatCost(costTotal) : "$0";
  return '<div class="gp-sess-stats">'
    + '<div class="gp-sess-stat"><div class="gp-sess-stat-value">' + total + '</div><div class="gp-sess-stat-label">Sessions</div></div>'
    + '<div class="gp-sess-stat"><div class="gp-sess-stat-value">' + formatNumber(tokensTotal) + '</div><div class="gp-sess-stat-label">Total Tokens</div></div>'
    + '<div class="gp-sess-stat"><div class="gp-sess-stat-value">' + costDisplay + '</div><div class="gp-sess-stat-label">Total Cost</div></div>'
    + '<div class="gp-sess-stat"><div class="gp-sess-stat-value">' + unabsorbed + '</div><div class="gp-sess-stat-label">Unabsorbed</div></div>'
    + '</div>';
}

function renderChannelTabs(sessions) {
  const counts = { all: sessions.length, web: 0, telegram: 0, agent: 0, other: 0 };
  for (const s of sessions) counts[channelOf(s.key)] = (counts[channelOf(s.key)] || 0) + 1;
  const tabs = [
    { id: "all", label: "All" },
    { id: "web", label: "Web" },
    { id: "telegram", label: "Telegram" },
    { id: "agent", label: "Agent" },
    { id: "other", label: "Other" },
  ].filter(t => t.id === "all" || counts[t.id] > 0);
  return '<div class="gp-sess-tabs">'
    + tabs.map(t =>
      '<span class="gp-sess-tab' + (sessActiveChannel === t.id ? ' active' : '') + '" data-sess-channel="' + t.id + '">'
      + escapeHtml(t.label)
      + '<span class="gp-sess-tab-count">' + counts[t.id] + '</span>'
      + '</span>'
    ).join("")
    + '</div>';
}

function renderSessionCard(s) {
  const ch = channelOf(s.key);
  const label = channelLabel(s.key);
  const tokens = formatNumber(s.tokensIn + s.tokensOut);
  const cost = formatCost(s.costUsd);
  const sid = String(s.id);
  const expanded = sessExpandedId === sid;

  let actions = '';
  if (ch === "web") {
    actions += '<button class="gp-sess-action-btn primary" data-sess-open="' + escapeAttr(s.key) + '">Open in Chat</button>';
  }
  if (s.messageCount > 0) {
    actions += '<button class="gp-sess-action-btn" data-sess-view="' + escapeAttr(sid) + '" data-sess-key="' + escapeAttr(s.key) + '">'
      + (expanded ? 'Hide Transcript' : 'View Transcript') + '</button>';
  }

  let html = '<div class="gp-sess-card" data-sess-card-id="' + sid + '">'
    + '<div class="gp-sess-card-top">'
    + '<div class="gp-sess-card-info">'
    + '<div class="gp-sess-card-title">' + escapeHtml(label) + '</div>';
  if (s.preview) {
    html += '<div class="gp-sess-card-preview">\u201C' + escapeHtml(s.preview) + (s.preview.length >= 120 ? '\u2026' : '') + '\u201D</div>';
  }
  html += '</div>'
    + '<div class="gp-sess-card-actions">' + actions + '</div>'
    + '</div>'
    + '<div class="gp-sess-card-meta">'
    + channelBadge(ch)
    + sessStatusBadge(s)
    + '<span class="gp-sess-meta-item">\uD83D\uDCDD ' + s.messageCount + ' msgs</span>'
    + '<span class="gp-sess-meta-item">\u26A1 ' + tokens + ' tok' + (cost ? ' · ' + cost : '') + '</span>'
    + '<span class="gp-sess-meta-item">\uD83D\uDD52 ' + timeAgo(s.lastActive) + '</span>'
    + '</div>';
  if (expanded) {
    html += '<div class="gp-sess-transcript" id="sessTranscript-' + sid + '"><div class="gp-text-muted" style="font-size:.8rem">Loading transcript\u2026</div></div>';
  }
  html += '</div>';
  return html;
}

function renderSessViewList(el, items) {
  const filtered = sessActiveChannel === "all"
    ? items
    : items.filter(s => channelOf(s.key) === sessActiveChannel);
  const sorted = filtered.sort((a, b) => b.lastActive - a.lastActive);

  if (!sorted.length) {
    el.innerHTML = '<div class="gp-sess-empty">'
      + '<span class="gp-sess-empty-icon">\uD83D\uDCAC</span>'
      + 'No sessions in this channel yet.'
      + '</div>';
    return;
  }
  el.innerHTML = '<div class="gp-sess-list">' + sorted.map(renderSessionCard).join("") + '</div>';
  wireSessionActions(el);
}

function wireSessionActions(container) {
  container.querySelectorAll("[data-sess-open]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = btn.dataset.sessOpen;
      selectSession(key);
      switchView("chat");
    });
  });
  container.querySelectorAll("[data-sess-view]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.sessView;
      const key = btn.dataset.sessKey;
      if (sessExpandedId === id) {
        sessExpandedId = "";
      } else {
        sessExpandedId = id;
      }
      const listEl = document.getElementById("sessList");
      renderSessViewList(listEl, sessAllSessions);
      if (sessExpandedId === id) {
        await loadTranscript(id, key);
      }
    });
  });
}

async function loadTranscript(sessionId, key) {
  const el = document.getElementById("sessTranscript-" + sessionId);
  if (!el) return;
  const messages = await apiJSON("/api/sessions/" + encodeURIComponent(key) + "/messages");
  if (!messages || !messages.length) {
    el.innerHTML = '<div class="gp-text-muted" style="font-size:.8rem">No messages in this session.</div>';
    return;
  }
  const visible = messages.filter(m => !m.isCompaction && (m.role === "user" || m.role === "assistant"));
  el.innerHTML = visible.map(m => {
    const roleLabel = m.role === "user" ? "You" : "Agent";
    const roleCls = m.role === "user" ? "gp-sess-transcript-user" : "gp-sess-transcript-assistant";
    const content = m.role === "user" ? escapeHtml(m.content) : renderMarkdown(m.content);
    return '<div class="gp-sess-transcript-msg ' + roleCls + '">'
      + '<div class="gp-sess-transcript-role">' + roleLabel + '</div>'
      + content
      + '</div>';
  }).join("");
}

function wireChannelTabs() {
  document.querySelectorAll("[data-sess-channel]").forEach(tab => {
    tab.addEventListener("click", () => {
      sessActiveChannel = tab.dataset.sessChannel;
      sessExpandedId = "";
      renderSessionPage();
    });
  });
}

function renderSessionPage() {
  const root = document.getElementById("sessionsContent");
  if (!root) return;
  let html = sessionsIntroHTML();
  html += renderSessionStats(sessAllSessions);
  html += renderChannelTabs(sessAllSessions);
  html += '<div id="sessList"></div>';
  root.innerHTML = html;
  wireChannelTabs();
  const listEl = document.getElementById("sessList");
  renderSessViewList(listEl, sessAllSessions);
}

async function loadSessionsView() {
  const data = await apiJSON("/api/sessions");
  if (!data) return;
  sessAllSessions = data;
  sessActiveChannel = "all";
  sessExpandedId = "";
  renderSessionPage();
}

// ── Skills ──────────────────────────────────────────────────────────────────

let editingSkill = null;

function skillsIntroHTML() {
  return '<div class="gp-skills-intro">'
    + '<div class="gp-skills-intro-heading">Your skill library</div>'
    + '<p>Skills are the procedural memory of your agent\\u2009\\u2014\\u2009step-by-step playbooks it follows for tasks it has learned. '
    + 'Each skill is a markdown file that gets sharper over time through training. '
    + 'Higher ranks mean more training iterations and refinement.</p>'
    + '<div class="gp-skills-legend">'
    + '<span class="gp-skills-legend-item"><span class="gp-rank-dot gp-rank-new"></span> New \\u2014 untrained</span>'
    + '<span class="gp-skills-legend-item"><span class="gp-rank-dot gp-rank-low"></span> Rank 1\\u20132 \\u2014 early draft</span>'
    + '<span class="gp-skills-legend-item"><span class="gp-rank-dot gp-rank-mid"></span> Rank 3\\u20135 \\u2014 practiced</span>'
    + '<span class="gp-skills-legend-item"><span class="gp-rank-dot gp-rank-high"></span> Rank 6+ \\u2014 battle-tested</span>'
    + '</div>'
    + '</div>';
}

function rankBadgeHTML(rank) {
  let cls = "gp-rank-badge ";
  let label;
  if (rank === 0) { cls += "gp-rank-badge-new"; label = "New"; }
  else if (rank <= 2) { cls += "gp-rank-badge-low"; label = "Rank " + rank; }
  else if (rank <= 5) { cls += "gp-rank-badge-mid"; label = "Rank " + rank; }
  else { cls += "gp-rank-badge-high"; label = "Rank " + rank; }
  return '<span class="' + cls + '">' + label + '</span>';
}

function rankBarHTML(rank) {
  const maxPips = 8;
  const filled = Math.min(rank, maxPips);
  let pips = "";
  for (let i = 0; i < maxPips; i++) {
    const active = i < filled;
    let cls = "gp-rank-pip";
    if (active) {
      if (rank <= 2) cls += " gp-rank-pip-low";
      else if (rank <= 5) cls += " gp-rank-pip-mid";
      else cls += " gp-rank-pip-high";
    }
    pips += '<span class="' + cls + '"></span>';
  }
  return '<div class="gp-rank-bar" title="Rank ' + rank + '">' + pips + '</div>';
}

async function loadSkills() {
  const el = document.getElementById("skillsContent");
  el.innerHTML = '<div class="gp-skills-hint">Loading\\u2026</div>';

  const data = await apiJSON("/api/skills");
  if (!data) return;

  let html = skillsIntroHTML();

  const totalSkills = data.length;
  const avgRank = totalSkills > 0
    ? Math.round(data.reduce((s, sk) => s + sk.rank, 0) / totalSkills * 10) / 10
    : 0;
  const totalLines = data.reduce((s, sk) => s + (sk.lines || 0), 0);

  html += '<div class="gp-skills-stats">'
    + '<div class="gp-skills-stat"><div class="gp-skills-stat-value">' + totalSkills + '</div><div class="gp-skills-stat-label">Skills</div></div>'
    + '<div class="gp-skills-stat"><div class="gp-skills-stat-value">' + avgRank + '</div><div class="gp-skills-stat-label">Avg Rank</div></div>'
    + '<div class="gp-skills-stat"><div class="gp-skills-stat-value">' + totalLines + '</div><div class="gp-skills-stat-label">Total Lines</div></div>'
    + '</div>';

  if (!data.length) {
    html += '<div class="gp-skills-empty">'
      + '<span class="gp-skills-empty-icon">\\u26A1</span>'
      + '<div style="color:var(--gp-text);font-weight:500;margin-bottom:.35rem">No skills yet</div>'
      + '<div>Your agent will create skills as it learns from conversations. '
      + 'Use <strong>Train</strong> to turn recent experience into skills, '
      + 'or <strong>Scout</strong> to discover new skill ideas.</div>'
      + '</div>';
    el.innerHTML = html;
    return;
  }

  html += '<div class="gp-skills-list">';
  html += data.map(s => {
    const desc = s.description
      ? '<div class="gp-skills-card-desc">' + escapeHtml(s.description) + '</div>'
      : '';
    return '<div class="gp-skills-card">'
      + '<div class="gp-skills-card-main">'
      + '<div class="gp-skills-card-top">'
      + '<div class="gp-skills-card-info">'
      + '<div class="gp-skills-card-title">' + escapeHtml(s.title) + '</div>'
      + '<div class="gp-skills-card-meta">' + escapeHtml(s.filename) + ' \\u00B7 ' + s.lines + ' lines</div>'
      + '</div>'
      + '<div class="gp-skills-card-actions">'
      + rankBadgeHTML(s.rank)
      + '<button class="gp-skills-edit-btn" data-edit-skill="' + escapeAttr(s.filename) + '">Edit</button>'
      + '</div>'
      + '</div>'
      + desc
      + rankBarHTML(s.rank)
      + '</div>'
      + '</div>';
  }).join("");
  html += '</div>';

  el.innerHTML = html;

  el.querySelectorAll("[data-edit-skill]").forEach(btn => {
    btn.addEventListener("click", () => openSkillEditor(btn.dataset.editSkill));
  });
}

async function openSkillEditor(filename) {
  const data = await apiJSON("/api/skills/" + encodeURIComponent(filename));
  if (!data) return;
  editingSkill = filename;
  document.getElementById("skillEditorTitle").textContent = filename;
  document.getElementById("skillContent").value = data.content;
  document.getElementById("skillEditor").classList.remove("d-none");
  document.getElementById("skillsContent").classList.add("d-none");
}

document.getElementById("btnSaveSkill").addEventListener("click", async () => {
  if (!editingSkill) return;
  const content = document.getElementById("skillContent").value;
  await api("/api/skills/" + encodeURIComponent(editingSkill), {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
  document.getElementById("skillEditor").classList.add("d-none");
  document.getElementById("skillsContent").classList.remove("d-none");
  editingSkill = null;
  await loadSkills();
});

document.getElementById("btnCancelSkill").addEventListener("click", () => {
  document.getElementById("skillEditor").classList.add("d-none");
  document.getElementById("skillsContent").classList.remove("d-none");
  editingSkill = null;
});

// ── Agents ──────────────────────────────────────────────────────────────────

let editingAgent = null;
let isNewAgent = false;

function levelPipsHTML(level) {
  const maxPips = 10;
  const filled = Math.min(level, maxPips);
  let pips = '';
  for (let i = 0; i < maxPips; i++) {
    pips += '<span class="gp-agents-pip' + (i < filled ? ' gp-agents-pip-filled' : '') + '"></span>';
  }
  return '<div class="gp-agents-level-bar">' + pips
    + (level > maxPips ? '<span class="gp-agents-pip-overflow">+' + (level - maxPips) + '</span>' : '')
    + '</div>';
}

var pendingRefineResult = null;

function clearRefinePanel(card) {
  var old = card.querySelector(".gp-refine-panel");
  if (old) old.remove();
}

async function readSSE(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  var buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\\n\\n");
    buffer = parts.pop() || "";
    for (const chunk of parts) {
      if (!chunk.startsWith("data: ")) continue;
      try { onEvent(JSON.parse(chunk.slice(6))); } catch {}
    }
  }
}

async function triggerRefine(filename, btn) {
  btn.disabled = true;
  btn.textContent = "Analyzing\\u2026";
  const card = btn.closest(".gp-agents-card");
  if (card) card.classList.add("gp-agents-card-refining");
  clearRefinePanel(card);

  var panel = document.createElement("div");
  panel.className = "gp-refine-panel";
  panel.innerHTML = '<div class="gp-refine-status">Analyzing performance\\u2026</div>';
  card.appendChild(panel);

  try {
    const res = await fetch("/api/agents/" + encodeURIComponent(filename) + "/refine/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Discovery failed");
    }

    var trails = [];
    await readSSE(res, function(evt) {
      if (evt.type === "phase") {
        var labels = { reviewing: "Reviewing delegation history\\u2026", analyzing: "Identifying improvements\\u2026" };
        var statusEl = panel.querySelector(".gp-refine-status");
        if (statusEl) statusEl.textContent = labels[evt.phase] || evt.phase;
      } else if (evt.type === "trails") {
        trails = evt.trails || [];
      } else if (evt.type === "error") {
        throw new Error(evt.message);
      }
    });

    if (!trails.length) {
      panel.innerHTML = '<div class="gp-refine-status">No improvement suggestions found.</div>';
      btn.disabled = false;
      btn.textContent = "Refine";
      if (card) card.classList.remove("gp-agents-card-refining");
      return;
    }

    renderTrailCards(panel, filename, trails, card, btn);
  } catch (err) {
    panel.innerHTML = '<div class="gp-refine-status gp-text-danger">' + escapeHtml(err.message || "Discovery failed") + '</div>';
    btn.disabled = false;
    btn.textContent = "Refine";
    if (card) card.classList.remove("gp-agents-card-refining");
  }
}

function renderTrailCards(panel, filename, trails, card, btn) {
  var html = '<div class="gp-refine-trails-header">Suggested improvements</div>';
  html += '<div class="gp-refine-trails">';
  trails.forEach(function(t, i) {
    html += '<div class="gp-refine-trail" data-trail-idx="' + i + '">'
      + '<div class="gp-refine-trail-title">' + escapeHtml(t.title) + '</div>'
      + '<div class="gp-refine-trail-why">' + escapeHtml(t.why) + '</div>'
      + '</div>';
  });
  html += '</div>';
  html += '<div class="gp-refine-guidance">'
    + '<input type="text" class="gp-refine-notes-input" placeholder="Optional: add your own guidance\\u2026" />'
    + '</div>';
  html += '<div class="gp-refine-hint">Click a suggestion to apply it</div>';
  panel.innerHTML = html;

  panel.querySelectorAll(".gp-refine-trail").forEach(function(el) {
    el.addEventListener("click", function() {
      var idx = parseInt(el.dataset.trailIdx, 10);
      var trail = trails[idx];
      var notes = panel.querySelector(".gp-refine-notes-input").value || "";
      applyRefine(panel, filename, trail, notes, card, btn);
    });
  });
}

async function applyRefine(panel, filename, trail, notes, card, btn) {
  panel.innerHTML = '<div class="gp-refine-status">Applying: ' + escapeHtml(trail.title) + '\\u2026</div>';

  try {
    const res = await fetch("/api/agents/" + encodeURIComponent(filename) + "/refine/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: trail, notes: notes || undefined }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Refinement failed");
    }

    var refineResult = null;
    await readSSE(res, function(evt) {
      if (evt.type === "phase") {
        var labels = {
          reviewing: "Gathering evidence\\u2026",
          refining: "Refining soul\\u2026",
          committing: "Committing\\u2026",
          summarizing: "Summarizing changes\\u2026"
        };
        var statusEl = panel.querySelector(".gp-refine-status");
        if (statusEl) statusEl.textContent = labels[evt.phase] || evt.phase;
      } else if (evt.type === "result") {
        refineResult = evt;
      } else if (evt.type === "error") {
        throw new Error(evt.message);
      }
    });

    if (refineResult) {
      pendingRefineResult = { filename: filename, result: refineResult };
    }
    await loadAgents();
  } catch (err) {
    panel.innerHTML = '<div class="gp-refine-status gp-text-danger">' + escapeHtml(err.message || "Refinement failed") + '</div>';
    btn.disabled = false;
    btn.textContent = "Refine";
    if (card) card.classList.remove("gp-agents-card-refining");
  }
}

function showRefineResult(card, result) {
  clearRefinePanel(card);

  if (!result.revised) {
    showToast(result.summary || "No changes needed", "success");
    return;
  }

  var panel = document.createElement("div");
  panel.className = "gp-refine-panel";

  var header = '<div class="gp-refine-result-header">'
    + '<span class="gp-refine-result-badge">Level ' + (result.level || "?") + '</span>'
    + '<span class="gp-refine-result-title">' + escapeHtml(result.summary) + '</span>'
    + '<button class="gp-refine-result-close">\\u2715</button>'
    + '</div>';

  var changelog = result.changelog
    ? '<div class="gp-refine-changelog">' + renderSimpleMarkdown(result.changelog) + '</div>'
    : '';

  panel.innerHTML = header + changelog;
  card.appendChild(panel);

  panel.querySelector(".gp-refine-result-close").addEventListener("click", function() {
    panel.remove();
  });
}

function renderSimpleMarkdown(text) {
  return text
    .split("\\n")
    .map(function(line) {
      var trimmed = line.trim();
      if (!trimmed) return "";
      if (/^[-*]\\s/.test(trimmed)) {
        return '<div class="gp-refine-bullet">' + escapeHtml(trimmed.slice(2)) + '</div>';
      }
      if (/^\\d+\\.\\s/.test(trimmed)) {
        return '<div class="gp-refine-bullet">' + escapeHtml(trimmed.replace(/^\\d+\\.\\s*/, "")) + '</div>';
      }
      return '<div>' + escapeHtml(trimmed) + '</div>';
    })
    .filter(function(l) { return l; })
    .join("");
}

function agentsIntroHTML() {
  return '<div class="gp-agents-intro">'
    + '<div class="gp-agents-intro-heading">Agent souls</div>'
    + '<p>Your main agent\\u2019s identity lives in SOUL.md. These are the souls of its specialists\\u2009\\u2014\\u2009each one defines who a sub-agent is, '
    + 'what it knows, and how it behaves. When a task matches a specialist\\u2019s domain, delegation happens automatically.</p>'
    + '<p>Each soul is a markdown file: human-readable, agent-writable, versioned with git. More souls, sharper delegation.</p>'
    + '</div>';
}

async function loadAgents() {
  const el = document.getElementById("agentsContent");
  el.innerHTML = '<div class="gp-agents-hint">Loading\\u2026</div>';

  const data = await apiJSON("/api/agents");
  if (!data) return;

  let html = agentsIntroHTML();

  const totalAgents = data.length;
  const totalLines = data.reduce((s, a) => s + (a.lines || 0), 0);
  const totalLevels = data.reduce((s, a) => s + (a.level || 0), 0);

  html += '<div class="gp-agents-stats">'
    + '<div class="gp-agents-stat"><div class="gp-agents-stat-value">' + totalAgents + '</div><div class="gp-agents-stat-label">Souls</div></div>'
    + '<div class="gp-agents-stat"><div class="gp-agents-stat-value">' + totalLevels + '</div><div class="gp-agents-stat-label">Total Levels</div></div>'
    + '<div class="gp-agents-stat"><div class="gp-agents-stat-value">' + totalLines + '</div><div class="gp-agents-stat-label">Total Lines</div></div>'
    + '</div>';

  html += '<div class="gp-agents-toolbar">'
    + '<div style="color:#94a3b8;font-size:.85rem">' + totalAgents + ' soul' + (totalAgents === 1 ? '' : 's') + ' defined</div>'
    + '<button class="gp-agents-create-btn" id="btnCreateAgent">+ New Soul</button>'
    + '</div>';

  if (!data.length) {
    html += '<div class="gp-agents-empty">'
      + '<span class="gp-agents-empty-icon">\\uD83D\\uDC65</span>'
      + '<div style="color:var(--gp-text);font-weight:500;margin-bottom:.35rem">No souls yet</div>'
      + '<div>Define a specialist soul to expand what your agent can handle. '
      + 'Give it a clear role, domain expertise, and constraints\\u2009\\u2014\\u2009delegation takes care of the rest.</div>'
      + '</div>';
    el.innerHTML = html;
    wireCreateAgentBtn();
    return;
  }

  html += '<div class="gp-agents-list">';
  html += data.map(a => {
    const desc = a.description
      ? '<div class="gp-agents-card-desc">' + escapeHtml(a.description) + '</div>'
      : '';
    const lvl = a.level || 0;
    const levelBadge = '<span class="gp-agents-level-badge">Lv ' + lvl + '</span>';
    const levelPips = levelPipsHTML(lvl);
    return '<div class="gp-agents-card">'
      + '<div class="gp-agents-card-top">'
      + '<div class="gp-agents-card-info">'
      + '<div class="gp-agents-card-title">' + escapeHtml(a.title) + '</div>'
      + '<div class="gp-agents-card-meta">' + escapeHtml(a.filename) + ' \\u00B7 ' + a.lines + ' lines</div>'
      + '</div>'
      + '<div class="gp-agents-card-actions">'
      + levelBadge
      + '<button class="gp-agents-refine-btn" data-refine-agent="' + escapeAttr(a.filename) + '">Refine</button>'
      + '<button class="gp-agents-edit-btn" data-edit-agent="' + escapeAttr(a.filename) + '">Edit</button>'
      + '</div>'
      + '</div>'
      + levelPips
      + desc
      + '</div>';
  }).join("");
  html += '</div>';

  el.innerHTML = html;
  wireCreateAgentBtn();

  el.querySelectorAll("[data-edit-agent]").forEach(btn => {
    btn.addEventListener("click", () => openAgentEditor(btn.dataset.editAgent));
  });

  el.querySelectorAll("[data-refine-agent]").forEach(btn => {
    btn.addEventListener("click", () => triggerRefine(btn.dataset.refineAgent, btn));
  });

  if (pendingRefineResult) {
    const fn = pendingRefineResult.filename;
    const res = pendingRefineResult.result;
    pendingRefineResult = null;
    const targetBtn = el.querySelector('[data-refine-agent="' + escapeAttr(fn) + '"]');
    if (targetBtn) {
      const targetCard = targetBtn.closest(".gp-agents-card");
      if (targetCard) showRefineResult(targetCard, res);
    }
  }
}

function wireCreateAgentBtn() {
  const btn = document.getElementById("btnCreateAgent");
  if (btn) btn.addEventListener("click", () => openNewAgentEditor());
}

function openNewAgentEditor() {
  editingAgent = null;
  isNewAgent = true;
  document.getElementById("agentEditorTitle").textContent = "New Soul";
  document.getElementById("agentFilename").value = "";
  document.getElementById("agentFilename").disabled = false;
  document.getElementById("agentContent").value = "# Name\\n\\nDefine this specialist\\u2019s role, domain expertise, and behavioral constraints.\\n";
  document.getElementById("agentEditor").classList.remove("d-none");
  document.getElementById("agentsContent").classList.add("d-none");
  document.getElementById("btnDeleteAgent").classList.add("d-none");
  document.getElementById("agentFilename").focus();
}

async function openAgentEditor(filename) {
  const data = await apiJSON("/api/agents/" + encodeURIComponent(filename));
  if (!data) return;
  editingAgent = filename;
  isNewAgent = false;
  document.getElementById("agentEditorTitle").textContent = filename;
  document.getElementById("agentFilename").value = filename;
  document.getElementById("agentFilename").disabled = true;
  document.getElementById("agentContent").value = data.content;
  document.getElementById("agentEditor").classList.remove("d-none");
  document.getElementById("agentsContent").classList.add("d-none");
  document.getElementById("btnDeleteAgent").classList.remove("d-none");
}

function closeAgentEditor() {
  document.getElementById("agentEditor").classList.add("d-none");
  document.getElementById("agentsContent").classList.remove("d-none");
  editingAgent = null;
  isNewAgent = false;
}

document.getElementById("btnSaveAgent").addEventListener("click", async () => {
  let filename;
  if (isNewAgent) {
    filename = document.getElementById("agentFilename").value.trim();
    if (!filename) { showToast("Filename is required", "error"); return; }
    if (!filename.endsWith(".md")) filename += ".md";
    if (!/^[a-zA-Z0-9_-]+\\.md$/.test(filename)) {
      showToast("Filename must contain only letters, numbers, hyphens, and underscores", "error");
      return;
    }
  } else {
    filename = editingAgent;
  }
  if (!filename) return;

  const content = document.getElementById("agentContent").value;
  if (!content.trim()) { showToast("Content cannot be empty", "error"); return; }

  try {
    await api("/api/agents/" + encodeURIComponent(filename), {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    showToast(isNewAgent ? "Soul created" : "Soul saved", "success");
    closeAgentEditor();
    await loadAgents();
  } catch (err) {
    showToast(err.message || "Failed to save", "error");
  }
});

document.getElementById("btnCancelAgent").addEventListener("click", () => {
  closeAgentEditor();
});

document.getElementById("btnDeleteAgent").addEventListener("click", async () => {
  if (!editingAgent) return;
  if (!confirm("Delete " + editingAgent + "? This cannot be undone.")) return;

  try {
    await api("/api/agents/" + encodeURIComponent(editingAgent), { method: "DELETE" });
    showToast(editingAgent + " deleted", "success");
    closeAgentEditor();
    await loadAgents();
  } catch (err) {
    showToast(err.message || "Failed to delete", "error");
  }
});

// ── Memory ──────────────────────────────────────────────────────────────────

let memAllMemories = [];
let memActiveSource = "all";
let memSearchTimeout = null;
let memCurrentQuery = "";

function memoryIntroHTML() {
  return '<div class="gp-mem-intro">'
    + '<div class="gp-mem-intro-heading">Your agent\\u2019s memory</div>'
    + '<p>Memories are facts and learnings your agent stores permanently. Unlike skills (which are step-by-step playbooks), '
    + 'memories are atomic pieces of knowledge\\u2009\\u2014\\u2009preferences, corrections, discoveries, and context from past conversations. '
    + 'Search uses <strong>semantic matching</strong> (by meaning, not keywords).</p>'
    + '<div class="gp-mem-source-legend">'
    + '<span class="gp-mem-source-legend-item"><span class="gp-mem-source-badge gp-mem-source-agent">Agent</span> created during conversation</span>'
    + '<span class="gp-mem-source-legend-item"><span class="gp-mem-source-badge gp-mem-source-absorbed">Absorbed</span> extracted during training</span>'
    + '<span class="gp-mem-source-legend-item"><span class="gp-mem-source-badge gp-mem-source-manual">Manual</span> added by other means</span>'
    + '</div></div>';
}

function timeAgo(ts) {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks + "w ago";
  const months = Math.floor(days / 30);
  if (months < 12) return months + "mo ago";
  return Math.floor(months / 12) + "y ago";
}

function memTimeGroup(ts) {
  const now = new Date();
  const d = new Date(ts);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - (now.getDay() * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (ts >= todayStart) return "Today";
  if (ts >= weekStart) return "This Week";
  if (ts >= monthStart) return "This Month";
  return "Older";
}

function memSourceBadge(source) {
  const s = (source || "manual").toLowerCase();
  const cls = s === "agent" ? "gp-mem-source-agent"
    : s === "absorbed" ? "gp-mem-source-absorbed"
    : "gp-mem-source-manual";
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return '<span class="gp-mem-source-badge ' + cls + '">' + escapeHtml(label) + '</span>';
}

function renderMemoryStats(memories) {
  const total = memories.length;
  const bySource = { agent: 0, absorbed: 0, manual: 0 };
  for (const m of memories) {
    const s = (m.source || "manual").toLowerCase();
    if (s === "agent") bySource.agent++;
    else if (s === "absorbed") bySource.absorbed++;
    else bySource.manual++;
  }
  let span = "\\u2014";
  if (total > 0) {
    const oldest = memories[memories.length - 1];
    span = timeAgo(oldest.createdAt);
  }
  return '<div class="gp-mem-stats">'
    + '<div class="gp-mem-stat"><div class="gp-mem-stat-value">' + total + '</div><div class="gp-mem-stat-label">Total</div></div>'
    + '<div class="gp-mem-stat"><div class="gp-mem-stat-value">' + bySource.agent + '</div><div class="gp-mem-stat-label">Agent</div></div>'
    + '<div class="gp-mem-stat"><div class="gp-mem-stat-value">' + bySource.absorbed + '</div><div class="gp-mem-stat-label">Absorbed</div></div>'
    + '<div class="gp-mem-stat"><div class="gp-mem-stat-value">' + bySource.manual + '</div><div class="gp-mem-stat-label">Manual</div></div>'
    + '<div class="gp-mem-stat"><div class="gp-mem-stat-value">' + span + '</div><div class="gp-mem-stat-label">Span</div></div>'
    + '</div>';
}

function renderMemoryTabs(memories) {
  const counts = { all: memories.length, agent: 0, absorbed: 0, manual: 0 };
  for (const m of memories) {
    const s = (m.source || "manual").toLowerCase();
    if (s === "agent") counts.agent++;
    else if (s === "absorbed") counts.absorbed++;
    else counts.manual++;
  }
  const tabs = [
    { id: "all", label: "All", count: counts.all },
    { id: "agent", label: "Agent", count: counts.agent },
    { id: "absorbed", label: "Absorbed", count: counts.absorbed },
    { id: "manual", label: "Manual", count: counts.manual },
  ];
  return '<div class="gp-mem-tabs">'
    + tabs.map(t =>
      '<span class="gp-mem-tab' + (memActiveSource === t.id ? ' active' : '') + '" data-mem-source="' + t.id + '">'
      + escapeHtml(t.label)
      + '<span class="gp-mem-tab-count">' + t.count + '</span>'
      + '</span>'
    ).join("")
    + '</div>';
}

function renderMemoryCard(m, isSearch) {
  const content = m.content || "";
  const displayContent = !isSearch && content.length > 200
    ? content.slice(0, 200) + "\\u2026"
    : content;
  let html = '<div class="gp-mem-card">'
    + '<div class="gp-mem-card-top">'
    + '<div class="gp-mem-card-content">' + escapeHtml(displayContent) + '</div>'
    + '<button class="gp-mem-delete" data-delete-memory="' + escapeAttr(m.id) + '" title="Delete">\\u00D7</button>'
    + '</div>'
    + '<div class="gp-mem-card-meta">'
    + memSourceBadge(m.source)
    + '<span class="gp-mem-time">' + timeAgo(m.createdAt) + '</span>'
    + '</div>';
  if (isSearch && m.score != null) {
    const pct = Math.round(m.score * 100);
    html += '<div class="gp-mem-relevance"><div class="gp-mem-relevance-fill" style="width:' + pct + '%"></div></div>';
  }
  html += '</div>';
  return html;
}

function filterMemories(memories, source) {
  if (source === "all") return memories;
  return memories.filter(m => (m.source || "manual").toLowerCase() === source);
}

function renderMemoryList(el, memories, isSearch) {
  const filtered = filterMemories(memories, memActiveSource);

  if (!filtered.length) {
    el.innerHTML = '<div class="gp-mem-empty">'
      + '<span class="gp-mem-empty-icon">\\uD83E\\uDDE0</span>'
      + '<div style="color:var(--gp-text);font-weight:500;margin-bottom:.35rem">'
      + (isSearch ? 'No matching memories' : 'No memories yet') + '</div>'
      + '<div>' + (isSearch
        ? 'Try a different search query\\u2009\\u2014\\u2009semantic search matches by meaning, not exact keywords.'
        : 'Your agent will create memories as it learns from conversations. Chat some more and come back!')
      + '</div></div>';
    wireDeleteButtons(el);
    return;
  }

  let html = "";

  if (isSearch) {
    html += '<div class="gp-mem-search-hint">Ranked by semantic similarity\\u2009\\u2014\\u2009results closest in meaning to your query appear first.</div>';
    html += filtered.map(m => renderMemoryCard(m, true)).join("");
  } else {
    let currentGroup = "";
    for (const m of filtered) {
      const group = memTimeGroup(m.createdAt);
      if (group !== currentGroup) {
        currentGroup = group;
        html += '<div class="gp-mem-group-header">' + escapeHtml(group) + '</div>';
      }
      html += renderMemoryCard(m, false);
    }
  }

  el.innerHTML = html;
  wireDeleteButtons(el);
}

function wireDeleteButtons(container) {
  container.querySelectorAll("[data-delete-memory]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.deleteMemory;
      await api("/api/memory/" + encodeURIComponent(id), { method: "DELETE" });
      memAllMemories = memAllMemories.filter(m => m.id !== id);
      if (memCurrentQuery) {
        memSearchAndRender(memCurrentQuery);
      } else {
        renderMemoryPage();
      }
    });
  });
}

function renderMemoryPage() {
  const root = document.getElementById("memoryContent");
  const listEl = document.getElementById("memList");

  const statsHTML = renderMemoryStats(memAllMemories);
  const tabsHTML = renderMemoryTabs(memAllMemories);
  document.getElementById("memStatsArea").innerHTML = statsHTML + tabsHTML;

  renderMemoryList(listEl, memAllMemories, false);
  wireSourceTabs();
}

function wireSourceTabs() {
  document.querySelectorAll("[data-mem-source]").forEach(tab => {
    tab.addEventListener("click", () => {
      memActiveSource = tab.dataset.memSource;
      if (memCurrentQuery) {
        memSearchAndRender(memCurrentQuery);
      } else {
        renderMemoryPage();
      }
    });
  });
}

async function memSearchAndRender(query) {
  const listEl = document.getElementById("memList");
  if (!listEl) return;
  listEl.innerHTML = '<div class="gp-mem-search-hint">Searching\\u2026</div>';
  try {
    const data = await apiJSON("/api/memory?q=" + encodeURIComponent(query));
    if (!data) return;
    const memories = data.memories || [];
    renderMemoryList(listEl, memories, true);
    wireSourceTabs();
  } catch {
    listEl.innerHTML = '<div class="gp-text-danger">Search failed</div>';
  }
}

async function loadMemory() {
  const root = document.getElementById("memoryContent");
  root.innerHTML = '<div class="gp-mem-search-hint" style="text-align:center;padding:1rem">Loading\\u2026</div>';

  memCurrentQuery = "";
  memActiveSource = "all";

  let data;
  try {
    data = await apiJSON("/api/memory");
    if (!data) return;
  } catch {
    root.innerHTML = '<div class="gp-text-danger">Failed to load memories</div>';
    return;
  }

  memAllMemories = data.memories || [];
  const total = data.total || memAllMemories.length;

  let html = memoryIntroHTML();
  html += '<div id="memStatsArea"></div>';
  html += '<div class="gp-mem-toolbar">'
    + '<input type="text" class="gp-mem-search" id="memSearch" placeholder="Search memories by meaning\\u2026">'
    + '</div>';
  html += '<div id="memList"></div>';
  if (total > memAllMemories.length) {
    html += '<div class="gp-mem-search-hint" style="text-align:center;margin-top:.75rem">'
      + 'Showing ' + memAllMemories.length + ' of ' + total + ' memories. Use search to find specific ones.'
      + '</div>';
  }

  root.innerHTML = html;
  renderMemoryPage();

  document.getElementById("memSearch").addEventListener("input", (e) => {
    clearTimeout(memSearchTimeout);
    const q = e.target.value.trim();
    memSearchTimeout = setTimeout(() => {
      memCurrentQuery = q;
      if (q) {
        memSearchAndRender(q);
      } else {
        renderMemoryPage();
      }
    }, 350);
  });
}

// ── Train ──────────────────────────────────────────────────────────────

const PHASES = [
  { id: "absorb", icon: "\\uD83D\\uDCE5", label: "Absorb",  hint: "Extracting learnings from conversations" },
  { id: "train",  icon: "\\uD83C\\uDFAF", label: "Train",   hint: "Refining skills from accumulated experience" },
  { id: "tidy",   icon: "\\u2728",         label: "Tidy",    hint: "Cleaning up old processed sessions" },
];

function renderPhaseSteps(activePhase, donePhases) {
  return '<div class="gp-phase-steps">' + PHASES.map(p => {
    let cls = "gp-phase-step";
    if (donePhases.includes(p.id)) cls += " done";
    else if (p.id === activePhase) cls += " active";
    const icon = donePhases.includes(p.id) ? "\\u2705" : p.icon;
    return '<div class="' + cls + '">'
      + '<span class="gp-phase-icon">' + icon + '</span> '
      + escapeHtml(p.label)
      + '</div>';
  }).join("") + '</div>'
  + (activePhase ? '<div class="gp-train-hint text-center">' + escapeHtml(PHASES.find(p => p.id === activePhase)?.hint || "") + '\\u2026</div>' : '');
}

function trainIntroHTML() {
  return '<div class="gp-train-intro">'
    + '<div class="gp-train-intro-heading">What does training do?</div>'
    + '<p>Training turns your raw conversations into permanent skills. '
    + 'Ghostpaw reviews what you talked about, extracts key learnings, and sharpens its procedural knowledge\\u2009\\u2014\\u2009so it gets better the more you use it.</p>'
    + '<div class="gp-train-phases-explain">'
    + '<span class="gp-train-phase-pill"><span class="gp-pill-icon">\\uD83D\\uDCE5</span> <strong>Absorb</strong> \\u2014 scans sessions, extracts learnings as memories</span>'
    + '<span class="gp-train-phase-pill"><span class="gp-pill-icon">\\uD83C\\uDFAF</span> <strong>Train</strong> \\u2014 creates or refines skills from those memories</span>'
    + '<span class="gp-train-phase-pill"><span class="gp-pill-icon">\\u2728</span> <strong>Tidy</strong> \\u2014 cleans up old sessions, keeps memories</span>'
    + '</div></div>';
}

async function loadTrain() {
  const el = document.getElementById("trainContent");
  el.innerHTML = '<div class="gp-train-hint">Loading\\u2026</div>';

  let status;
  try {
    status = await apiJSON("/api/train/status");
    if (!status) return;
  } catch {
    el.innerHTML = '<div class="gp-text-danger">Failed to load training status</div>';
    return;
  }

  let html = trainIntroHTML();

  html += '<div class="gp-train-preflight">'
    + '<div class="row g-3 mb-3">'
    + '<div class="col-4"><div class="gp-train-stat">'
    + '<div class="gp-train-stat-value">' + status.unabsorbed + '</div>'
    + '<div class="gp-train-stat-label">Unabsorbed</div></div></div>'
    + '<div class="col-4"><div class="gp-train-stat">'
    + '<div class="gp-train-stat-value">' + status.totalSkills + '</div>'
    + '<div class="gp-train-stat-label">Skills</div></div></div>'
    + '<div class="col-4"><div class="gp-train-stat">'
    + '<div class="gp-train-stat-value">' + (status.running ? "\\uD83D\\uDD04" : (status.unabsorbed > 0 ? "\\uD83D\\uDFE2" : "\\u2714\\uFE0F")) + '</div>'
    + '<div class="gp-train-stat-label">Status</div></div></div>'
    + '</div>';

  const canTrain = !status.running && status.unabsorbed > 0;
  const btnLabel = status.running ? "Training in Progress\\u2026" : "Start Training";
  html += '<div class="text-center"><button class="gp-train-btn" id="btnStartTrain"'
    + (canTrain ? '' : ' disabled')
    + '>' + btnLabel + '</button>';

  if (status.running) {
    html += '<div class="gp-train-hint">Training is already running in another session. Refresh to check progress.</div>';
  } else if (status.unabsorbed === 0) {
    html += '<div class="gp-train-hint">All caught up! Chat some more and come back when there are new sessions to absorb.</div>';
  } else {
    html += '<div class="gp-train-hint">' + status.unabsorbed + ' session' + (status.unabsorbed === 1 ? '' : 's')
      + ' ready to absorb. This may take a minute or two.</div>';
  }

  html += '</div></div><div id="trainProgress"></div><div id="trainResult"></div>';
  el.innerHTML = html;

  if (canTrain) {
    document.getElementById("btnStartTrain").addEventListener("click", startTraining);
  }
}

async function startTraining() {
  const btn = document.getElementById("btnStartTrain");
  btn.disabled = true;
  btn.textContent = "Training\\u2026";

  const progressEl = document.getElementById("trainProgress");
  const resultEl = document.getElementById("trainResult");
  resultEl.innerHTML = "";

  const donePhases = [];
  let activePhase = null;
  progressEl.innerHTML = renderPhaseSteps(null, []);

  try {
    const res = await fetch("/api/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (res.status === 409) {
      progressEl.innerHTML = '<div class="gp-train-hint mt-3 text-center">Training is already in progress. Please wait and refresh.</div>';
      btn.textContent = "Training in Progress\\u2026";
      return;
    }
    if (res.status === 401) { window.location.href = "/login"; return; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      progressEl.innerHTML = '<div class="gp-text-danger mt-3">' + escapeHtml(err.error || "Request failed") + '</div>';
      btn.textContent = "Start Training";
      btn.disabled = false;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "phase") {
            if (activePhase) donePhases.push(activePhase);
            activePhase = evt.phase;
            progressEl.innerHTML = renderPhaseSteps(activePhase, donePhases);
          } else if (evt.type === "result") {
            if (activePhase) donePhases.push(activePhase);
            activePhase = null;
            progressEl.innerHTML = renderPhaseSteps(null, donePhases);
            renderTrainResult(resultEl, evt);
          } else if (evt.type === "error") {
            progressEl.innerHTML += '<div class="gp-text-danger mt-3">' + escapeHtml(evt.message) + '</div>';
          }
        } catch { /* skip malformed */ }
      }
    }
  } catch (err) {
    progressEl.innerHTML += '<div class="gp-text-danger mt-3">Connection error</div>';
  } finally {
    btn.textContent = "Start Training";
    btn.disabled = false;
  }
}

function renderTrainResult(el, result) {
  let html = '';

  html += '<div class="gp-train-summary">'
    + summaryItem(result.absorbed ?? 0, "Absorbed", "\\uD83D\\uDCE5")
    + summaryItem(result.memoriesCreated ?? 0, "Memories", "\\uD83E\\uDDE0")
    + summaryItem(result.tidied ?? 0, "Tidied", "\\uD83E\\uDDF9")
    + summaryItem(result.totalSkills ?? 0, "Total Skills", "\\u26A1")
    + '</div>';

  const changes = result.changes || [];
  if (changes.length > 0) {
    html += '<div class="gp-levelup-heading">\\u2B06\\uFE0F Level Up! \\u2014 ' + changes.length + ' skill' + (changes.length === 1 ? '' : 's') + ' changed</div>';
    html += changes.map(c => {
      const badgeCls = c.type === "created" ? "gp-skill-badge-created" : "gp-skill-badge-updated";
      const badgeLabel = c.type === "created" ? "\\u2728 New" : "\\u2191 Updated";
      const rankText = c.rank ? ' \\u2022 Rank ' + c.rank : '';
      const desc = c.description ? '<div class="gp-skill-desc">' + escapeHtml(c.description) + '</div>' : '';
      return '<div class="gp-skill-card">'
        + '<div class="gp-skill-card-header">'
        + '<div><div class="gp-skill-title">' + escapeHtml(c.title || c.filename) + '</div>'
        + '<div class="gp-skill-rank">' + escapeHtml(c.filename) + rankText + '</div></div>'
        + '<span class="' + badgeCls + '">' + badgeLabel + '</span>'
        + '</div>'
        + desc
        + '</div>';
    }).join("");
  } else {
    html += '<div class="gp-no-changes">\\u2714\\uFE0F All skills are up to date \\u2014 no changes this round.</div>';
  }

  el.innerHTML = html;
}

function summaryItem(value, label, icon) {
  return '<div class="gp-train-summary-item">'
    + '<div class="gp-summary-val">' + (icon || '') + ' ' + value + '</div>'
    + '<div class="gp-summary-label">' + escapeHtml(label) + '</div>'
    + '</div>';
}

// ── Scout ──────────────────────────────────────────────────────────────

let lastTrails = [];

function scoutIntroHTML() {
  return '<div class="gp-scout-intro">'
    + '<div class="gp-scout-intro-heading">What does scouting do?</div>'
    + '<p>Scouting discovers what your agent should learn next. It mines your conversations, '
    + 'memories, and workspace for friction signals\\u2009\\u2014\\u2009things you do repeatedly, struggle with, '
    + 'or could automate but haven\\u2019t thought to ask for.</p>'
    + '<p>You can let it discover trails automatically, or point it at a specific direction you\\u2019re curious about. '
    + 'Each trail comes with a deep research report you can turn into a skill.</p>'
    + '</div>';
}

async function loadScout() {
  const el = document.getElementById("scoutContent");
  el.innerHTML = '<div class="gp-scout-hint">Loading\\u2026</div>';

  let status;
  try {
    status = await apiJSON("/api/scout/status");
    if (!status) return;
  } catch {
    el.innerHTML = '<div class="gp-text-danger">Failed to load scout status</div>';
    return;
  }

  let html = scoutIntroHTML();

  html += '<div class="gp-scout-preflight">';
  html += '<div class="row g-3 mb-3">'
    + '<div class="col-6"><div class="gp-train-stat">'
    + '<div class="gp-train-stat-value">' + status.memoryCount + '</div>'
    + '<div class="gp-train-stat-label">Memories</div></div></div>'
    + '<div class="col-6"><div class="gp-train-stat">'
    + '<div class="gp-train-stat-value">' + status.skillCount + '</div>'
    + '<div class="gp-train-stat-label">Skills</div></div></div>'
    + '</div>';

  if (status.running) {
    html += '<div class="gp-scout-hint text-center">Scouting is running in another session. Refresh to check.</div>';
    html += '</div>';
  } else {
    html += '<div class="gp-scout-actions">'
      + '<input type="text" class="gp-scout-input" id="scoutDirection" placeholder="Type a direction, or leave empty to auto-discover\\u2026">'
      + '<button class="gp-scout-btn" id="btnScout">Discover Trails</button>'
      + '</div>';
    html += '<div class="gp-scout-hint">Runs an AI analysis of your workspace context. Takes 15\\u201360 seconds.</div>';
    html += '</div>';
  }

  html += '<div id="scoutProgress"></div><div id="scoutResult"></div>';
  el.innerHTML = html;

  if (!status.running) {
    const input = document.getElementById("scoutDirection");
    const btn = document.getElementById("btnScout");

    input.addEventListener("input", () => {
      btn.textContent = input.value.trim() ? "Scout This" : "Discover Trails";
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); startScout(); }
    });
    btn.addEventListener("click", startScout);
  }
}

function startScout() {
  const input = document.getElementById("scoutDirection");
  const direction = input ? input.value.trim() : "";
  if (direction) {
    startDeepScout(direction);
  } else {
    startDiscovery();
  }
}

async function startDiscovery() {
  const btn = document.getElementById("btnScout");
  const input = document.getElementById("scoutDirection");
  btn.disabled = true;
  input.disabled = true;
  btn.textContent = "Discovering\\u2026";

  const progressEl = document.getElementById("scoutProgress");
  const resultEl = document.getElementById("scoutResult");
  resultEl.innerHTML = "";

  progressEl.innerHTML = '<div class="gp-scout-progress">'
    + '<span class="gp-scout-progress-icon">\\uD83D\\uDC3E</span>'
    + '<div class="gp-scout-progress-label">Sniffing out trails\\u2026</div>'
    + '<div class="gp-scout-progress-sub">Analyzing your memories, skills, and sessions for friction signals</div>'
    + '</div>';

  try {
    const res = await fetch("/api/scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (res.status === 409) {
      progressEl.innerHTML = '<div class="gp-scout-hint text-center mt-3">Scouting is already in progress. Please wait.</div>';
      return;
    }
    if (res.status === 401) { window.location.href = "/login"; return; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      progressEl.innerHTML = '<div class="gp-text-danger mt-3">' + escapeHtml(err.error || "Request failed") + '</div>';
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "trails") {
            progressEl.innerHTML = "";
            renderTrails(resultEl, evt.trails || []);
          } else if (evt.type === "error") {
            progressEl.innerHTML = '<div class="gp-text-danger mt-3">' + escapeHtml(evt.message) + '</div>';
          }
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    progressEl.innerHTML = '<div class="gp-text-danger mt-3">Connection error</div>';
  } finally {
    btn.disabled = false;
    input.disabled = false;
    btn.textContent = "Discover Trails";
  }
}

function renderTrails(el, trails) {
  lastTrails = trails;

  if (!trails.length) {
    el.innerHTML = '<div class="gp-scout-empty">'
      + '<span class="gp-scout-empty-icon">\\uD83D\\uDD2D</span>'
      + '<div style="color:var(--gp-text);font-weight:500;margin-bottom:.35rem">No trails found yet</div>'
      + '<div>Not enough conversation history to detect patterns. Chat more and scout again later, '
      + 'or type a specific direction above to research something directly.</div>'
      + '</div>';
    return;
  }

  let html = '<div class="gp-trails-heading">\\uD83D\\uDC3E Trails Discovered</div>'
    + '<div class="gp-trails-subheading">Click a trail to start a deep research dive, or type your own direction above.</div>'
    + '<div class="gp-trail-cards">';

  html += trails.map((t, i) => {
    return '<div class="gp-trail-card" data-trail-idx="' + i + '">'
      + '<div class="gp-trail-card-header">'
      + '<span class="gp-trail-card-number">' + (i + 1) + '</span>'
      + '<span class="gp-trail-card-title">' + escapeHtml(t.title) + '</span>'
      + '<span class="gp-trail-card-arrow">\\u2192</span>'
      + '</div>'
      + '<div class="gp-trail-card-why">' + escapeHtml(t.why) + '</div>'
      + '</div>';
  }).join("");

  html += '</div>';
  el.innerHTML = html;

  el.querySelectorAll("[data-trail-idx]").forEach(card => {
    card.addEventListener("click", () => {
      const idx = parseInt(card.dataset.trailIdx, 10);
      const trail = lastTrails[idx];
      if (trail) startDeepScout(trail.title);
    });
  });
}

async function startDeepScout(direction) {
  const btn = document.getElementById("btnScout");
  const input = document.getElementById("scoutDirection");
  if (btn) btn.disabled = true;
  if (input) input.disabled = true;

  const progressEl = document.getElementById("scoutProgress");
  const resultEl = document.getElementById("scoutResult");
  resultEl.innerHTML = "";

  progressEl.innerHTML = '<div class="gp-scout-progress">'
    + '<span class="gp-scout-progress-icon">\\uD83E\\uDDED</span>'
    + '<div class="gp-scout-progress-label">Researching: ' + escapeHtml(direction) + '</div>'
    + '<div class="gp-scout-progress-sub">Running a full agent investigation with tools. This may take 1\\u20135 minutes.</div>'
    + '</div>';

  try {
    const res = await fetch("/api/scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });

    if (res.status === 409) {
      progressEl.innerHTML = '<div class="gp-scout-hint text-center mt-3">Scouting is already in progress. Please wait.</div>';
      return;
    }
    if (res.status === 401) { window.location.href = "/login"; return; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      progressEl.innerHTML = '<div class="gp-text-danger mt-3">' + escapeHtml(err.error || "Request failed") + '</div>';
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "report") {
            progressEl.innerHTML = "";
            renderScoutReport(resultEl, evt.direction || direction, evt.report || "");
          } else if (evt.type === "error") {
            progressEl.innerHTML = '<div class="gp-text-danger mt-3">' + escapeHtml(evt.message) + '</div>';
          }
        } catch { /* skip */ }
      }
    }
  } catch (err) {
    progressEl.innerHTML = '<div class="gp-text-danger mt-3">Connection error</div>';
  } finally {
    if (btn) btn.disabled = false;
    if (input) input.disabled = false;
    if (btn) btn.textContent = input && input.value.trim() ? "Scout This" : "Discover Trails";
  }
}

let lastScoutDirection = "";
let lastScoutReport = "";

function renderScoutReport(el, direction, report) {
  lastScoutDirection = direction;
  lastScoutReport = report;

  let html = '<div class="gp-scout-report">'
    + '<div class="gp-scout-report-header">'
    + '<span class="gp-scout-report-badge">Scout Report</span>'
    + '<span class="gp-scout-report-title">' + escapeHtml(direction) + '</span>'
    + '</div>'
    + '<div class="gp-scout-report-body">' + renderMarkdown(report) + '</div>'
    + '</div>';

  html += '<div class="gp-scout-bottom-actions">'
    + '<button class="gp-scout-btn" id="btnCraftSkill">\\u2728 Craft This Skill</button>'
    + '<button class="gp-scout-btn-outline" id="btnScoutAgain">Discover More Trails</button>'
    + '<button class="gp-scout-btn-outline" id="btnBackToTrails" style="' + (lastTrails.length ? '' : 'display:none') + '">Back to Trails</button>'
    + '</div>'
    + '<div class="gp-scout-hint" id="craftHint">Creates a new chat session and asks your agent to turn this report into a skill.</div>';

  el.innerHTML = html;
  addCopyButtons();

  document.getElementById("btnCraftSkill").addEventListener("click", () => craftFromScout());
  document.getElementById("btnScoutAgain").addEventListener("click", () => {
    document.getElementById("scoutDirection").value = "";
    document.getElementById("btnScout").textContent = "Discover Trails";
    document.getElementById("scoutResult").innerHTML = "";
    startDiscovery();
  });
  document.getElementById("btnBackToTrails").addEventListener("click", () => {
    document.getElementById("scoutProgress").innerHTML = "";
    renderTrails(document.getElementById("scoutResult"), lastTrails);
  });
}

async function craftFromScout() {
  const btn = document.getElementById("btnCraftSkill");
  btn.disabled = true;
  btn.textContent = "Creating session\\u2026";

  const name = "scout-craft-" + Date.now();
  const data = await apiJSON("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  if (!data) {
    btn.disabled = false;
    btn.textContent = "\\u2728 Craft This Skill";
    return;
  }

  await loadSessions();
  await selectSession(data.key);
  switchView("chat");
  handleMobileNav();

  const craftPrompt = "I just scouted a new direction: \\"" + lastScoutDirection + "\\". "
    + "Here is the full scout report:\\n\\n"
    + lastScoutReport + "\\n\\n"
    + "Please craft this into a concrete, actionable skill now. Follow the skill-craft playbook:\\n\\n"
    + "1. Write the skill markdown to skills/ with clear steps, failure paths, and verification.\\n"
    + "2. If this skill involves API calls, data transformation, or multi-step automation, "
    + "write a companion .mjs script — see the Companion Scripts section of skill-craft for conventions.\\n"
    + "3. Test everything by running it. Fix any issues.\\n"
    + "4. Remember what you created via the memory tool.";

  chatInput.value = craftPrompt;
  chatInput.dispatchEvent(new Event("input"));
  chatForm.dispatchEvent(new Event("submit"));
}

// ── Logout ──────────────────────────────────────────────────────────────────

document.getElementById("btnLogout").addEventListener("click", async (e) => {
  e.preventDefault();
  await api("/logout", { method: "POST" });
  window.location.href = "/login";
});

// ── New chat ────────────────────────────────────────────────────────────────

document.getElementById("btnNewChat").addEventListener("click", () => {
  createSession();
  handleMobileNav();
});
document.getElementById("btnNewChatMobile")?.addEventListener("click", createSession);

// ── Settings view ───────────────────────────────────────────────────────────

let settingsData = null;
let settingsEditingKey = "";

function settingsIntroHTML() {
  return '<div class="gp-set-intro">'
    + '<p>Configure LLM providers, API keys, and model selection. '
    + 'Changes take effect immediately \u2014 no restart needed.</p>'
    + '</div>';
}

function showToast(message, type) {
  const existing = document.querySelector(".gp-set-toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "gp-set-toast " + type;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function renderProviders(data) {
  let html = '<div class="gp-set-section">'
    + '<div class="gp-set-section-title">LLM Providers</div>'
    + '<div class="gp-set-provider-grid">';

  for (const p of data.providers) {
    const cardCls = "gp-set-provider-card"
      + (p.isCurrent ? " is-current" : "")
      + (!p.active ? " is-inactive" : "");

    let statusHTML;
    if (p.isCurrent) {
      statusHTML = '<span class="gp-set-provider-status current">\u2713 Active</span>';
    } else if (p.active) {
      statusHTML = '<span class="gp-set-provider-status active">\u2022 Ready</span>';
    } else {
      statusHTML = '<span class="gp-set-provider-status inactive">\u2013 No Key</span>';
    }

    html += '<div class="' + cardCls + '">'
      + '<div class="gp-set-provider-header">'
      + '<span class="gp-set-provider-name">' + escapeHtml(p.name) + '</span>'
      + statusHTML
      + '</div>';

    if (p.active) {
      const sourceTag = p.live
        ? '<span class="gp-set-model-source live">live from API</span>'
        : '<span class="gp-set-model-source static">known models</span>';
      html += '<div class="gp-set-model-row">'
        + '<select class="gp-set-model-select" data-provider-id="' + escapeAttr(p.id) + '">';
      for (const m of p.models) {
        const sel = m === data.model ? ' selected' : '';
        html += '<option value="' + escapeAttr(m) + '"' + sel + '>' + escapeHtml(m) + '</option>';
      }
      html += '</select>';

      if (p.isCurrent) {
        html += '<button class="gp-set-activate-btn is-active" disabled>Current</button>';
      } else {
        html += '<button class="gp-set-activate-btn" data-activate-provider="' + escapeAttr(p.id) + '">Use This</button>';
      }
      html += '</div>'
        + '<div class="gp-set-model-meta">'
        + sourceTag
        + '<span class="gp-set-model-count">' + p.models.length + ' models</span>'
        + '</div>';
    } else {
      html += '<div class="gp-set-provider-hint">Set the ' + escapeHtml(p.envKey) + ' secret below to enable.</div>';
    }

    html += '</div>';
  }

  html += '</div></div>';
  return html;
}

function renderSecrets(data) {
  const llm = data.secrets.filter(s => s.category === "llm");
  const search = data.secrets.filter(s => s.category === "search");
  const custom = data.secrets.filter(s => s.category === "custom");

  let html = '';

  function secretGroup(title, items) {
    if (!items.length) return '';
    let g = '<div class="gp-set-section">'
      + '<div class="gp-set-section-title">' + escapeHtml(title) + '</div>'
      + '<div class="gp-set-secret-list">';

    for (const s of items) {
      const indCls = s.configured ? "gp-set-secret-indicator configured" : "gp-set-secret-indicator missing";
      const indText = s.configured ? s.length + " chars" : "Not set";
      const isEditing = settingsEditingKey === s.key;

      g += '<div class="gp-set-secret-row">'
        + '<div class="gp-set-secret-info">'
        + '<div class="gp-set-secret-key">' + escapeHtml(s.key) + '</div>';
      if (s.label !== s.key) {
        g += '<div class="gp-set-secret-label">' + escapeHtml(s.label) + '</div>';
      }
      g += '</div>'
        + '<span class="' + indCls + '">' + indText + '</span>'
        + '<div class="gp-set-secret-actions">'
        + '<button class="gp-set-secret-btn" data-edit-secret="' + escapeAttr(s.key) + '">' + (isEditing ? 'Cancel' : 'Update') + '</button>';
      if (s.configured) {
        g += '<button class="gp-set-secret-btn danger" data-delete-secret="' + escapeAttr(s.key) + '">Delete</button>';
      }
      g += '</div>';

      if (isEditing) {
        g += '<div class="gp-set-secret-input-row">'
          + '<input type="password" class="gp-set-secret-input" id="secretInput-' + escapeAttr(s.key) + '" placeholder="Paste new value\u2026" autocomplete="off">'
          + '<button class="gp-set-secret-btn" data-save-secret="' + escapeAttr(s.key) + '">Save</button>'
          + '</div>';
      }

      g += '</div>';
    }

    g += '</div></div>';
    return g;
  }

  html += secretGroup("LLM Provider Keys", llm);
  html += secretGroup("Search Provider Keys", search);
  html += secretGroup("Custom Secrets", custom);

  html += '<div class="gp-set-section">'
    + '<div class="gp-set-section-title">Add New Secret</div>'
    + '<div class="gp-set-add-form">'
    + '<input type="text" id="newSecretKey" placeholder="KEY_NAME" style="flex:1;min-width:120px">'
    + '<input type="password" id="newSecretValue" placeholder="value" style="flex:2;min-width:150px" autocomplete="off">'
    + '<button id="btnAddSecret">Add</button>'
    + '</div></div>';

  return html;
}

function renderSettingsPage() {
  const root = document.getElementById("settingsContent");
  if (!root || !settingsData) return;

  let html = settingsIntroHTML();
  html += renderProviders(settingsData);
  html += renderSecrets(settingsData);
  root.innerHTML = html;
  wireSettingsActions();
}

function wireSettingsActions() {
  document.querySelectorAll("[data-activate-provider]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const providerId = btn.dataset.activateProvider;
      const select = document.querySelector('select[data-provider-id="' + providerId + '"]');
      const model = select ? select.value : "";
      if (!model) return;
      btn.disabled = true;
      btn.textContent = "Saving\u2026";
      try {
        await apiJSON("/api/settings/model", {
          method: "PUT",
          body: JSON.stringify({ model }),
        });
        document.getElementById("footerModel").textContent = model;
        showToast("Switched to " + model, "success");
        await loadSettings();
      } catch (err) {
        showToast(err.message || "Failed to switch model", "error");
        btn.disabled = false;
        btn.textContent = "Use This";
      }
    });
  });

  document.querySelectorAll(".gp-set-model-select").forEach(select => {
    select.addEventListener("change", async () => {
      const providerId = select.dataset.providerId;
      const provider = settingsData?.providers?.find(p => p.id === providerId);
      if (!provider?.isCurrent) return;
      const model = select.value;
      try {
        await apiJSON("/api/settings/model", {
          method: "PUT",
          body: JSON.stringify({ model }),
        });
        document.getElementById("footerModel").textContent = model;
        showToast("Model changed to " + model, "success");
        await loadSettings();
      } catch (err) {
        showToast(err.message || "Failed to change model", "error");
      }
    });
  });

  document.querySelectorAll("[data-edit-secret]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.editSecret;
      settingsEditingKey = settingsEditingKey === key ? "" : key;
      renderSettingsPage();
      if (settingsEditingKey) {
        const input = document.getElementById("secretInput-" + key);
        if (input) input.focus();
      }
    });
  });

  document.querySelectorAll("[data-save-secret]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.saveSecret;
      const input = document.getElementById("secretInput-" + key);
      if (!input || !input.value.trim()) return;
      btn.disabled = true;
      btn.textContent = "Saving\u2026";
      try {
        const result = await apiJSON("/api/settings/secrets/" + encodeURIComponent(key), {
          method: "PUT",
          body: JSON.stringify({ value: input.value }),
        });
        settingsEditingKey = "";
        if (result.warning) {
          showToast("Saved with warning: " + result.warning, "error");
        } else {
          showToast(key + " updated", "success");
        }
        await loadSettings();
      } catch (err) {
        showToast(err.message || "Failed to save", "error");
        btn.disabled = false;
        btn.textContent = "Save";
      }
    });
  });

  document.querySelectorAll("[data-delete-secret]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.deleteSecret;
      if (!confirm("Delete secret " + key + "?")) return;
      btn.disabled = true;
      try {
        await apiJSON("/api/settings/secrets/" + encodeURIComponent(key), { method: "DELETE" });
        showToast(key + " deleted", "success");
        await loadSettings();
      } catch (err) {
        showToast(err.message || "Failed to delete", "error");
        btn.disabled = false;
      }
    });
  });

  const btnAdd = document.getElementById("btnAddSecret");
  if (btnAdd) {
    btnAdd.addEventListener("click", async () => {
      const keyInput = document.getElementById("newSecretKey");
      const valInput = document.getElementById("newSecretValue");
      const key = keyInput?.value?.trim();
      const value = valInput?.value;
      if (!key || !value) { showToast("Key and value are required", "error"); return; }
      btnAdd.disabled = true;
      try {
        const result = await apiJSON("/api/settings/secrets/" + encodeURIComponent(key), {
          method: "PUT",
          body: JSON.stringify({ value }),
        });
        if (result.warning) {
          showToast("Added with warning: " + result.warning, "error");
        } else {
          showToast(key + " added", "success");
        }
        keyInput.value = "";
        valInput.value = "";
        await loadSettings();
      } catch (err) {
        showToast(err.message || "Failed to add", "error");
        btnAdd.disabled = false;
      }
    });
  }
}

async function loadSettings() {
  const data = await apiJSON("/api/settings");
  if (!data) return;
  settingsData = data;
  renderSettingsPage();
}

// ── Utilities ───────────────────────────────────────────────────────────────

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function formatCost(usd) {
  if (!usd || usd <= 0) return "";
  if (usd >= 1) return "$" + usd.toFixed(2);
  if (usd >= 0.01) return "$" + usd.toFixed(3);
  return "$" + usd.toFixed(4);
}

// ── Init ────────────────────────────────────────────────────────────────────

(async () => {
  await loadSessions();
  await loadDashboard();
  if (sessions.some(s => s.key.startsWith("web:"))) {
    const latest = sessions
      .filter(s => s.key.startsWith("web:"))
      .sort((a, b) => b.lastActive - a.lastActive)[0];
    if (latest) await selectSession(latest.key);
  }
})();
`;
