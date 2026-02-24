import { BOOT_ID } from "./constants.js";

let _bootstrapCSS = "";
try {
  // @ts-expect-error — resolved by esbuild text-asset plugin at build time
  const m = await import("text-asset:bootstrap/dist/css/bootstrap.min.css");
  _bootstrapCSS = m.default;
} catch {
  // Not available in test environment (tsx) — empty CSS is fine for tests
}

export const bootstrapCSS: string = _bootstrapCSS;

export const customCSS = /* css */ `
:root {
  --gp-bg: #080c14;
  --gp-surface: #0f1520;
  --gp-surface-2: #151d2e;
  --gp-border: #1e293b;
  --gp-text: #e2e8f0;
  --gp-muted: #64748b;
  --gp-accent: #22d3ee;
  --gp-accent-dim: #22d3ee15;
  --gp-accent-2: #a78bfa;
  --gp-success: #34d399;
  --gp-danger: #f87171;
  --gp-gradient: linear-gradient(135deg, #22d3ee, #a78bfa);
  --gp-glow: 0 0 20px #22d3ee26;
  --gp-glass: rgba(15, 21, 32, 0.8);
}
*,*::before,*::after { box-sizing: border-box; }
body {
  background: var(--gp-bg);
  color: var(--gp-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  min-height: 100vh;
  margin: 0;
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--gp-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--gp-muted); }
.gp-gradient-text { background: var(--gp-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700; }
.gp-surface { background: var(--gp-glass); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--gp-border); border-radius: .75rem; transition: border-color .2s ease, box-shadow .2s ease; }
.gp-surface:hover { border-color: #22d3ee30; }

/* Layout: desktop */
.gp-layout { display: flex; height: 100dvh; overflow: hidden; }
.gp-sidebar {
  width: 280px; min-width: 280px;
  background: var(--gp-surface); border-right: 1px solid var(--gp-border);
  display: flex; flex-direction: column;
  z-index: 100; transition: transform .3s cubic-bezier(.4,0,.2,1);
}
.gp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.gp-topbar { display: none; }

/* Views: all share the same flex slot */
.gp-view { flex: 1; min-height: 0; overflow-y: auto; }
.gp-view-flex { flex: 1; min-height: 0; display: flex; flex-direction: column; }

/* Mobile nav */
@media (max-width: 768px) {
  .gp-topbar {
    display: flex; align-items: center; gap: .75rem;
    padding: .5rem .75rem; background: var(--gp-surface);
    border-bottom: 1px solid var(--gp-border); min-height: 48px;
    position: fixed; top: 0; left: 0; right: 0; z-index: 101;
  }
  .gp-layout { height: calc(100dvh - 48px); margin-top: 48px; }
  .gp-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0;
    width: 280px; min-width: 280px;
    transform: translateX(-100%); border-right: 1px solid var(--gp-border);
  }
  .gp-sidebar.open { transform: translateX(0); }
  .gp-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 99; }
  .gp-backdrop.visible { display: block; }
  .gp-msg { max-width: 95%; }
  .gp-chat-input { padding-bottom: calc(.75rem + env(safe-area-inset-bottom, 0px)); }
}

/* Chat */
.gp-chat-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 1rem; scroll-behavior: smooth; }
.gp-chat-input { border-top: 1px solid var(--gp-border); padding: .75rem 1rem; background: var(--gp-bg); flex-shrink: 0; }
.gp-msg { max-width: 80%; margin-bottom: .75rem; padding: .75rem 1rem; border-radius: .75rem; word-wrap: break-word; line-height: 1.55; transition: opacity .2s ease; }
.gp-msg-user { background: linear-gradient(135deg, #22d3ee18, #a78bfa18); border: 1px solid #22d3ee25; margin-left: auto; border-bottom-right-radius: .25rem; }
.gp-msg-assistant { background: var(--gp-surface); border: 1px solid var(--gp-border); border-bottom-left-radius: .25rem; }
.gp-msg-assistant pre { background: #0a0f1a; border: 1px solid var(--gp-border); border-radius: .5rem; padding: .75rem; overflow-x: auto; position: relative; margin: .5rem 0; }
.gp-msg-assistant pre:hover .gp-copy-btn { opacity: 1; }
.gp-msg-assistant code { font-size: .875em; }
.gp-msg-assistant p:last-child { margin-bottom: 0; }
.gp-msg-assistant a { color: var(--gp-accent); text-decoration: none; }
.gp-msg-assistant a:hover { text-decoration: underline; }
.gp-msg-assistant table { border-collapse: collapse; width: 100%; margin: .5rem 0; }
.gp-msg-assistant th, .gp-msg-assistant td { border: 1px solid var(--gp-border); padding: .35rem .65rem; font-size: .9em; }
.gp-msg-assistant th { background: var(--gp-surface-2); }
.gp-copy-btn { position: absolute; top: .4rem; right: .4rem; background: var(--gp-surface-2); border: 1px solid var(--gp-border); color: var(--gp-muted); font-size: .7rem; padding: .2rem .45rem; border-radius: .25rem; cursor: pointer; opacity: 0; transition: opacity .15s ease, color .15s ease; }
.gp-copy-btn:hover { color: var(--gp-accent); }

/* Streaming cursor */
.gp-cursor::after { content: "\\25AE"; color: var(--gp-accent); animation: gpBlink 1s step-end infinite; margin-left: 2px; }
@keyframes gpBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

/* Empty state */
.gp-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--gp-muted); gap: 1rem; text-align: center; padding: 2rem; }
.gp-empty-icon { width: 80px; height: 80px; border-radius: 50%; background: var(--gp-gradient); opacity: .15; }

/* Nav items */
.gp-nav-item { padding: .55rem .85rem; border-radius: .5rem; cursor: pointer; color: var(--gp-muted); transition: all .2s ease; display: flex; align-items: center; gap: .6rem; font-size: .9rem; user-select: none; }
.gp-nav-item:hover { background: var(--gp-accent-dim); color: var(--gp-text); }
.gp-nav-item.active { background: var(--gp-accent-dim); color: var(--gp-accent); box-shadow: var(--gp-glow); }
.gp-nav-icon { font-size: 1.05rem; width: 20px; text-align: center; flex-shrink: 0; }

/* Session list items */
.gp-session-item { padding: .5rem .75rem; border-radius: .5rem; cursor: pointer; color: var(--gp-muted); transition: all .2s ease; border-left: 3px solid transparent; margin-bottom: .15rem; }
.gp-session-item:hover { background: var(--gp-accent-dim); color: var(--gp-text); }
.gp-session-item.active { border-left-color: var(--gp-accent); color: var(--gp-accent); background: var(--gp-accent-dim); }
.gp-session-label { font-weight: 500; color: var(--gp-text); font-size: .85rem; }
.gp-session-meta { display: flex; justify-content: space-between; margin-top: .15rem; color: var(--gp-muted); font-size: .7rem; }

/* Badges */
.gp-badge { font-size: .7rem; padding: .15rem .45rem; border-radius: .25rem; background: var(--gp-accent-dim); color: var(--gp-accent); font-weight: 500; }

/* Typing dots */
.gp-typing { display: inline-flex; gap: 4px; align-items: center; padding: .5rem .75rem; }
.gp-typing span { width: 6px; height: 6px; border-radius: 50%; background: var(--gp-accent); opacity: .4; animation: gpBounce .6s infinite alternate; box-shadow: 0 0 8px var(--gp-accent-dim); }
.gp-typing span:nth-child(2) { animation-delay: .2s; }
.gp-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes gpBounce { to { opacity: 1; transform: translateY(-4px); } }

/* Stats */
.gp-stat { text-align: center; }
.gp-stat-icon { font-size: 1.5rem; margin-bottom: .35rem; }
.gp-stat-value { font-size: 1.4rem; font-weight: 700; background: var(--gp-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.gp-stat-label { font-size: .7rem; color: var(--gp-muted); text-transform: uppercase; letter-spacing: .06em; margin-top: .15rem; }

/* Form elements */
.gp-input { background: var(--gp-bg) !important; border: 1px solid var(--gp-border) !important; color: var(--gp-text) !important; resize: none; transition: border-color .2s ease, box-shadow .2s ease; }
.gp-input:focus { border-color: var(--gp-accent) !important; box-shadow: var(--gp-glow) !important; outline: none !important; }
.gp-input::placeholder { color: var(--gp-muted) !important; }
.btn-gp { background: var(--gp-gradient); color: #080c14; border: none; font-weight: 600; transition: all .2s ease; }
.btn-gp:hover { box-shadow: var(--gp-glow); transform: translateY(-1px); color: #080c14; }
.btn-gp:active { transform: translateY(0); }
.btn-gp:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-gp-outline { background: transparent; border: 1px solid var(--gp-accent); color: var(--gp-accent); transition: all .2s ease; }
.btn-gp-outline:hover { background: var(--gp-accent-dim); color: var(--gp-accent); box-shadow: var(--gp-glow); }

/* Hamburger */
.gp-hamburger { background: none; border: none; color: var(--gp-text); font-size: 1.3rem; cursor: pointer; padding: .25rem; line-height: 1; }

/* Table styling */
.gp-table { background: transparent; }
.gp-table th { color: var(--gp-muted); border-color: var(--gp-border); }
.gp-table td { border-color: var(--gp-border); }

/* Muted text helper */
.gp-text-muted { color: var(--gp-muted); }
.gp-text-danger { color: var(--gp-danger); }

/* ── Train page ────────────────────────────────────────────── */

.gp-train-intro {
  margin-bottom: 1.75rem;
  line-height: 1.7;
}
.gp-train-intro p {
  color: #cbd5e1;
  font-size: .95rem;
  margin-bottom: .5rem;
}
.gp-train-intro .gp-train-intro-heading {
  color: var(--gp-text);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: .5rem;
}
.gp-train-phases-explain {
  display: flex; gap: .75rem; flex-wrap: wrap;
  margin-top: .75rem;
}
.gp-train-phase-pill {
  display: inline-flex; align-items: center; gap: .35rem;
  background: var(--gp-surface-2);
  border: 1px solid var(--gp-border);
  border-radius: 2rem;
  padding: .3rem .75rem;
  font-size: .82rem;
  color: #94a3b8;
}
.gp-train-phase-pill .gp-pill-icon { font-size: .9rem; }

.gp-train-preflight {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.gp-train-stat { text-align: center; padding: .75rem; }
.gp-train-stat .gp-train-stat-value { font-size: 1.75rem; font-weight: 700; color: var(--gp-accent); }
.gp-train-stat .gp-train-stat-label { font-size: .8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }

.gp-phase-steps { display: flex; gap: 1rem; margin: 1.5rem 0; flex-wrap: wrap; }

.gp-phase-step {
  display: flex; align-items: center; gap: .5rem;
  padding: .6rem 1.1rem;
  border-radius: .5rem;
  border: 1px solid var(--gp-border);
  background: var(--gp-surface);
  color: #94a3b8;
  font-weight: 500;
  font-size: .9rem;
  transition: all .3s ease;
  flex: 1; min-width: 100px; justify-content: center;
}
.gp-phase-step .gp-phase-icon { font-size: 1.1rem; }
.gp-phase-step.active {
  border-color: var(--gp-accent);
  color: #e2e8f0;
  background: rgba(34, 211, 238, 0.06);
  box-shadow: var(--gp-glow);
  animation: gp-pulse 1.5s ease-in-out infinite;
}
.gp-phase-step.done {
  border-color: #22c55e;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.08);
}

@keyframes gp-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .6; }
}

.gp-skill-card {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: 1.1rem 1.25rem;
  margin-bottom: .75rem;
  transition: border-color .2s;
}
.gp-skill-card:hover { border-color: rgba(34, 211, 238, 0.3); }
.gp-skill-card-header {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
}
.gp-skill-card .gp-skill-title { font-weight: 600; color: var(--gp-text); font-size: .95rem; }
.gp-skill-card .gp-skill-rank { color: #94a3b8; font-size: .8rem; margin-top: .15rem; }
.gp-skill-card .gp-skill-desc {
  color: #94a3b8;
  font-size: .85rem;
  line-height: 1.5;
  margin-top: .5rem;
  padding-top: .5rem;
  border-top: 1px solid var(--gp-border);
}
.gp-skill-badge-created {
  background: rgba(34,197,94,.15);
  color: #4ade80;
  font-size: .72rem;
  font-weight: 600;
  padding: .25rem .65rem;
  border-radius: 2rem;
  white-space: nowrap;
  flex-shrink: 0;
}
.gp-skill-badge-updated {
  background: rgba(34,211,238,.12);
  color: #67e8f9;
  font-size: .72rem;
  font-weight: 600;
  padding: .25rem .65rem;
  border-radius: 2rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.gp-train-summary {
  display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.5rem 0;
}
.gp-train-summary-item {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: 1rem 1.25rem;
  flex: 1; min-width: 120px; text-align: center;
}
.gp-train-summary-item .gp-summary-val { font-size: 1.5rem; font-weight: 700; color: var(--gp-accent); }
.gp-train-summary-item .gp-summary-label { font-size: .8rem; color: #94a3b8; }

.gp-train-btn {
  background: linear-gradient(135deg, var(--gp-accent), var(--gp-accent-2));
  color: #0a0e17;
  border: none;
  border-radius: .5rem;
  padding: .65rem 2rem;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  letter-spacing: .02em;
  transition: box-shadow .2s, opacity .2s, transform .1s;
}
.gp-train-btn:hover:not(:disabled) { box-shadow: 0 0 24px #22d3ee40; transform: translateY(-1px); }
.gp-train-btn:disabled { opacity: .45; cursor: not-allowed; }

.gp-train-hint {
  color: #94a3b8;
  font-size: .85rem;
  margin-top: .65rem;
}

.gp-levelup-heading {
  font-size: 1.25rem; font-weight: 700;
  background: linear-gradient(90deg, var(--gp-accent), var(--gp-accent-2));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  margin-top: .5rem;
}

.gp-no-changes {
  text-align: center;
  color: #94a3b8;
  padding: 1.5rem;
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  margin-top: .5rem;
}

/* ── Sessions page ────────────────────────────────────────── */

.gp-sess-intro {
  margin-bottom: 1.75rem;
  line-height: 1.7;
}
.gp-sess-intro p {
  color: #cbd5e1;
  font-size: .95rem;
  margin-bottom: .5rem;
}
.gp-sess-intro-heading {
  color: var(--gp-text);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: .5rem;
}
.gp-sess-lifecycle {
  display: flex; gap: .5rem; align-items: center; flex-wrap: wrap;
  margin-top: .65rem;
  font-size: .82rem; color: #94a3b8;
}
.gp-sess-lifecycle-step {
  display: inline-flex; align-items: center; gap: .3rem;
  background: var(--gp-surface-2);
  border: 1px solid var(--gp-border);
  border-radius: 2rem;
  padding: .25rem .7rem;
}
.gp-sess-lifecycle-arrow { color: #475569; font-size: .75rem; }

.gp-sess-stats {
  display: flex; gap: 1rem; flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.gp-sess-stat {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: .85rem 1rem;
  flex: 1; min-width: 90px; text-align: center;
}
.gp-sess-stat-value {
  font-size: 1.35rem; font-weight: 700;
  background: var(--gp-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.gp-sess-stat-label {
  font-size: .75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em;
}

.gp-sess-tabs {
  display: flex; gap: .35rem; flex-wrap: wrap;
  margin-bottom: 1rem;
}
.gp-sess-tab {
  display: inline-flex; align-items: center; gap: .3rem;
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: 2rem;
  padding: .3rem .75rem;
  font-size: .8rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all .2s;
  user-select: none;
}
.gp-sess-tab:hover { border-color: rgba(34,211,238,.3); color: var(--gp-text); }
.gp-sess-tab.active {
  border-color: var(--gp-accent);
  color: var(--gp-accent);
  background: rgba(34,211,238,.08);
}
.gp-sess-tab-count {
  font-size: .7rem;
  background: rgba(100,116,139,.2);
  padding: .1rem .4rem;
  border-radius: 1rem;
  min-width: 1.1rem;
  text-align: center;
}
.gp-sess-tab.active .gp-sess-tab-count {
  background: rgba(34,211,238,.15);
}

.gp-sess-list {
  display: flex; flex-direction: column; gap: .6rem;
}

.gp-sess-card {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .65rem;
  padding: .85rem 1rem;
  transition: border-color .2s;
}
.gp-sess-card:hover { border-color: rgba(34,211,238,.2); }

.gp-sess-card-top {
  display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem;
}
.gp-sess-card-info { flex: 1; min-width: 0; }
.gp-sess-card-title {
  font-weight: 600; color: var(--gp-text); font-size: .92rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gp-sess-card-preview {
  color: #94a3b8; font-size: .82rem; line-height: 1.45;
  margin-top: .3rem;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.gp-sess-card-meta {
  display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  margin-top: .5rem;
}
.gp-sess-meta-item {
  color: #64748b; font-size: .75rem;
  display: inline-flex; align-items: center; gap: .2rem;
}

.gp-sess-channel-badge {
  font-size: .65rem;
  font-weight: 600;
  padding: .15rem .5rem;
  border-radius: 2rem;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: .03em;
}
.gp-sess-channel-web { background: rgba(34,211,238,.12); color: #67e8f9; }
.gp-sess-channel-telegram { background: rgba(167,139,250,.15); color: #c4b5fd; }
.gp-sess-channel-agent { background: rgba(52,211,153,.15); color: #6ee7b7; }
.gp-sess-channel-other { background: rgba(100,116,139,.15); color: #94a3b8; }

.gp-sess-status {
  font-size: .65rem;
  font-weight: 600;
  padding: .15rem .5rem;
  border-radius: 2rem;
  white-space: nowrap;
}
.gp-sess-status-absorbed { background: rgba(52,211,153,.15); color: #6ee7b7; }
.gp-sess-status-unabsorbed { background: rgba(251,191,36,.15); color: #fbbf24; }
.gp-sess-status-new { background: rgba(100,116,139,.12); color: #94a3b8; }

.gp-sess-card-actions {
  display: flex; gap: .4rem; flex-shrink: 0;
}
.gp-sess-action-btn {
  background: transparent;
  border: 1px solid var(--gp-border);
  color: var(--gp-muted);
  font-size: .72rem;
  padding: .2rem .55rem;
  border-radius: .35rem;
  cursor: pointer;
  transition: all .2s;
  white-space: nowrap;
}
.gp-sess-action-btn:hover {
  border-color: var(--gp-accent);
  color: var(--gp-accent);
}
.gp-sess-action-btn.primary {
  border-color: rgba(34,211,238,.3);
  color: var(--gp-accent);
}
.gp-sess-action-btn.primary:hover {
  background: rgba(34,211,238,.08);
}

.gp-sess-transcript {
  margin-top: .75rem;
  padding-top: .75rem;
  border-top: 1px solid var(--gp-border);
  max-height: 400px;
  overflow-y: auto;
}
.gp-sess-transcript-msg {
  padding: .4rem .6rem;
  border-radius: .4rem;
  margin-bottom: .35rem;
  font-size: .82rem;
  line-height: 1.5;
  word-break: break-word;
}
.gp-sess-transcript-user {
  background: rgba(34,211,238,.06);
  border-left: 2px solid var(--gp-accent);
  color: #cbd5e1;
}
.gp-sess-transcript-assistant {
  background: var(--gp-surface-2);
  border-left: 2px solid var(--gp-accent-2);
  color: #94a3b8;
}
.gp-sess-transcript-role {
  font-size: .7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: .15rem;
  color: #64748b;
}

.gp-sess-empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem 1rem;
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
}
.gp-sess-empty-icon {
  font-size: 2rem;
  margin-bottom: .75rem;
  display: block;
}

/* ── Memory page ──────────────────────────────────────────── */

.gp-mem-intro {
  margin-bottom: 1.75rem;
  line-height: 1.7;
}
.gp-mem-intro p {
  color: #cbd5e1;
  font-size: .95rem;
  margin-bottom: .5rem;
}
.gp-mem-intro-heading {
  color: var(--gp-text);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: .5rem;
}
.gp-mem-source-legend {
  display: flex; gap: .75rem; flex-wrap: wrap;
  margin-top: .5rem;
}
.gp-mem-source-legend-item {
  display: inline-flex; align-items: center; gap: .35rem;
  font-size: .8rem; color: #94a3b8;
}

.gp-mem-stats {
  display: flex; gap: 1rem; flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.gp-mem-stat {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: .85rem 1rem;
  flex: 1; min-width: 90px; text-align: center;
}
.gp-mem-stat-value {
  font-size: 1.35rem; font-weight: 700;
  background: var(--gp-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.gp-mem-stat-label {
  font-size: .75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em;
}

.gp-mem-toolbar {
  display: flex; gap: .75rem; align-items: stretch; flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.gp-mem-search {
  flex: 1; min-width: 180px;
  background: var(--gp-bg);
  border: 1px solid var(--gp-border);
  border-radius: .5rem;
  padding: .5rem .85rem;
  color: var(--gp-text);
  font-size: .9rem;
  outline: none;
  transition: border-color .2s;
}
.gp-mem-search:focus { border-color: var(--gp-accent); }
.gp-mem-search::placeholder { color: #64748b; }

.gp-mem-tabs {
  display: flex; gap: .35rem; flex-wrap: wrap;
  margin-bottom: 1rem;
}
.gp-mem-tab {
  display: inline-flex; align-items: center; gap: .3rem;
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: 2rem;
  padding: .3rem .75rem;
  font-size: .8rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all .2s;
  user-select: none;
}
.gp-mem-tab:hover { border-color: rgba(34,211,238,.3); color: var(--gp-text); }
.gp-mem-tab.active {
  border-color: var(--gp-accent);
  color: var(--gp-accent);
  background: rgba(34,211,238,.08);
}
.gp-mem-tab-count {
  font-size: .7rem;
  background: rgba(100,116,139,.2);
  padding: .1rem .4rem;
  border-radius: 1rem;
  min-width: 1.1rem;
  text-align: center;
}
.gp-mem-tab.active .gp-mem-tab-count {
  background: rgba(34,211,238,.15);
}

.gp-mem-search-hint {
  color: #64748b;
  font-size: .78rem;
  margin-bottom: 1rem;
  font-style: italic;
}

.gp-mem-group-header {
  color: #64748b;
  font-size: .75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .06em;
  padding: .75rem 0 .4rem;
  border-bottom: 1px solid var(--gp-border);
  margin-bottom: .6rem;
  margin-top: .5rem;
}
.gp-mem-group-header:first-child { margin-top: 0; }

.gp-mem-card {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .65rem;
  padding: .85rem 1rem;
  margin-bottom: .5rem;
  transition: border-color .2s;
  position: relative;
}
.gp-mem-card:hover { border-color: rgba(34,211,238,.2); }
.gp-mem-card-top {
  display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem;
}
.gp-mem-card-content {
  color: #cbd5e1;
  font-size: .88rem;
  line-height: 1.55;
  flex: 1; min-width: 0;
  word-break: break-word;
}
.gp-mem-card-meta {
  display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  margin-top: .45rem;
}
.gp-mem-time {
  color: #64748b;
  font-size: .75rem;
}
.gp-mem-source-badge {
  font-size: .65rem;
  font-weight: 600;
  padding: .15rem .5rem;
  border-radius: 2rem;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: .03em;
}
.gp-mem-source-agent { background: rgba(34,211,238,.12); color: #67e8f9; }
.gp-mem-source-absorbed { background: rgba(167,139,250,.15); color: #c4b5fd; }
.gp-mem-source-manual { background: rgba(100,116,139,.15); color: #94a3b8; }

.gp-mem-delete {
  background: none; border: none; color: #64748b;
  font-size: .85rem; cursor: pointer; padding: .15rem .35rem;
  border-radius: .25rem; transition: color .2s, background .2s;
  flex-shrink: 0; opacity: .5;
  line-height: 1;
}
.gp-mem-card:hover .gp-mem-delete { opacity: 1; }
.gp-mem-delete:hover { color: var(--gp-danger); background: rgba(248,113,113,.1); }

.gp-mem-relevance {
  height: 3px;
  border-radius: 2px;
  margin-top: .5rem;
  background: var(--gp-border);
  overflow: hidden;
}
.gp-mem-relevance-fill {
  height: 100%; border-radius: 2px;
  background: var(--gp-gradient);
  transition: width .3s ease;
}

.gp-mem-empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem 1rem;
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
}
.gp-mem-empty-icon {
  font-size: 2rem;
  margin-bottom: .75rem;
  display: block;
}

.gp-mem-show-more {
  display: block;
  width: 100%;
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .5rem;
  padding: .6rem;
  color: var(--gp-accent);
  font-size: .85rem;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  margin-top: .75rem;
  transition: background .2s, border-color .2s;
}
.gp-mem-show-more:hover { border-color: var(--gp-accent); background: rgba(34,211,238,.06); }

@media (max-width: 768px) {
  .gp-mem-delete { opacity: .8; }
}

/* ── Skills page ──────────────────────────────────────────── */

.gp-skills-intro {
  margin-bottom: 1.75rem;
  line-height: 1.7;
}
.gp-skills-intro p {
  color: #cbd5e1;
  font-size: .95rem;
  margin-bottom: .75rem;
}
.gp-skills-intro .gp-skills-intro-heading {
  color: var(--gp-text);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: .5rem;
}

.gp-skills-legend {
  display: flex; gap: .75rem; flex-wrap: wrap;
  margin-top: .5rem;
}
.gp-skills-legend-item {
  display: inline-flex; align-items: center; gap: .35rem;
  font-size: .8rem;
  color: #94a3b8;
}
.gp-rank-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.gp-rank-dot.gp-rank-new { background: #64748b; }
.gp-rank-dot.gp-rank-low { background: #22d3ee; }
.gp-rank-dot.gp-rank-mid { background: #a78bfa; }
.gp-rank-dot.gp-rank-high { background: #34d399; }

.gp-skills-stats {
  display: flex; gap: 1rem; flex-wrap: wrap;
  margin-bottom: 1.5rem;
}
.gp-skills-stat {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: 1rem 1.25rem;
  flex: 1; min-width: 100px; text-align: center;
}
.gp-skills-stat-value {
  font-size: 1.5rem; font-weight: 700;
  background: var(--gp-gradient); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.gp-skills-stat-label {
  font-size: .8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em;
}

.gp-skills-hint {
  color: #94a3b8; font-size: .85rem; text-align: center; padding: 1rem;
}

.gp-skills-empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem 1rem;
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
}
.gp-skills-empty-icon {
  font-size: 2rem;
  margin-bottom: .75rem;
  display: block;
}

.gp-skills-list {
  display: flex; flex-direction: column; gap: .75rem;
}

.gp-skills-card {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: 1rem 1.25rem;
  transition: border-color .2s, box-shadow .2s;
}
.gp-skills-card:hover {
  border-color: rgba(34, 211, 238, 0.25);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.06);
}
.gp-skills-card-top {
  display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem;
}
.gp-skills-card-info { flex: 1; min-width: 0; }
.gp-skills-card-title {
  font-weight: 600; color: var(--gp-text); font-size: .95rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gp-skills-card-meta {
  color: #64748b; font-size: .8rem; margin-top: .15rem;
}
.gp-skills-card-desc {
  color: #94a3b8; font-size: .85rem; line-height: 1.5;
  margin-top: .5rem;
}
.gp-skills-card-actions {
  display: flex; align-items: center; gap: .5rem; flex-shrink: 0;
}

.gp-skills-edit-btn {
  background: transparent;
  border: 1px solid var(--gp-border);
  color: var(--gp-muted);
  font-size: .75rem;
  padding: .25rem .6rem;
  border-radius: .35rem;
  cursor: pointer;
  transition: all .2s;
}
.gp-skills-edit-btn:hover {
  border-color: var(--gp-accent);
  color: var(--gp-accent);
}

.gp-rank-badge {
  font-size: .7rem;
  font-weight: 600;
  padding: .2rem .55rem;
  border-radius: 2rem;
  white-space: nowrap;
}
.gp-rank-badge-new { background: rgba(100,116,139,.15); color: #94a3b8; }
.gp-rank-badge-low { background: rgba(34,211,238,.12); color: #67e8f9; }
.gp-rank-badge-mid { background: rgba(167,139,250,.15); color: #c4b5fd; }
.gp-rank-badge-high { background: rgba(52,211,153,.15); color: #6ee7b7; }

.gp-rank-bar {
  display: flex; gap: 3px; margin-top: .6rem;
}
.gp-rank-pip {
  width: 100%; height: 3px;
  border-radius: 2px;
  background: var(--gp-border);
  transition: background .3s;
}
.gp-rank-pip.gp-rank-pip-low { background: var(--gp-accent); }
.gp-rank-pip.gp-rank-pip-mid { background: var(--gp-accent-2); }
.gp-rank-pip.gp-rank-pip-high { background: var(--gp-success); }

/* ── Scout page ────────────────────────────────────────────── */

.gp-scout-intro {
  margin-bottom: 1.75rem;
  line-height: 1.7;
}
.gp-scout-intro p {
  color: #cbd5e1;
  font-size: .95rem;
  margin-bottom: .5rem;
}
.gp-scout-intro .gp-scout-intro-heading {
  color: var(--gp-text);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: .5rem;
}

.gp-scout-preflight {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.gp-scout-actions {
  display: flex;
  gap: .75rem;
  align-items: stretch;
  flex-wrap: wrap;
}
.gp-scout-actions .gp-scout-input {
  flex: 1;
  min-width: 180px;
  background: var(--gp-bg);
  border: 1px solid var(--gp-border);
  border-radius: .5rem;
  padding: .55rem .85rem;
  color: var(--gp-text);
  font-size: .9rem;
  outline: none;
  transition: border-color .2s;
}
.gp-scout-actions .gp-scout-input:focus {
  border-color: var(--gp-accent);
}
.gp-scout-actions .gp-scout-input::placeholder {
  color: #64748b;
}

.gp-scout-btn {
  background: linear-gradient(135deg, var(--gp-accent-2), var(--gp-accent));
  color: #0a0e17;
  border: none;
  border-radius: .5rem;
  padding: .55rem 1.5rem;
  font-weight: 700;
  font-size: .95rem;
  cursor: pointer;
  white-space: nowrap;
  transition: box-shadow .2s, opacity .2s, transform .1s;
}
.gp-scout-btn:hover:not(:disabled) { box-shadow: 0 0 24px rgba(167,139,250,.35); transform: translateY(-1px); }
.gp-scout-btn:disabled { opacity: .45; cursor: not-allowed; }

.gp-scout-btn-outline {
  background: transparent;
  color: var(--gp-accent-2);
  border: 1px solid var(--gp-accent-2);
  border-radius: .5rem;
  padding: .55rem 1.5rem;
  font-weight: 600;
  font-size: .95rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background .2s, box-shadow .2s;
}
.gp-scout-btn-outline:hover:not(:disabled) { background: rgba(167,139,250,.1); }
.gp-scout-btn-outline:disabled { opacity: .45; cursor: not-allowed; }

.gp-scout-hint {
  color: #94a3b8;
  font-size: .85rem;
  margin-top: .65rem;
}

.gp-scout-progress {
  text-align: center;
  padding: 2rem 1rem;
  margin: 1.5rem 0;
}
.gp-scout-progress-icon {
  font-size: 2rem;
  animation: gp-pulse 1.5s ease-in-out infinite;
  display: block;
  margin-bottom: .75rem;
}
.gp-scout-progress-label {
  color: #cbd5e1;
  font-size: 1rem;
  font-weight: 500;
}
.gp-scout-progress-sub {
  color: #94a3b8;
  font-size: .85rem;
  margin-top: .35rem;
}

.gp-trail-cards {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  margin: 1.25rem 0;
}

.gp-trail-card {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: 1.1rem 1.25rem;
  cursor: pointer;
  transition: border-color .2s, box-shadow .2s, transform .15s;
}
.gp-trail-card:hover {
  border-color: rgba(167, 139, 250, 0.4);
  box-shadow: 0 0 16px rgba(167, 139, 250, 0.12);
  transform: translateY(-1px);
}
.gp-trail-card-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: rgba(167, 139, 250, 0.15);
  color: var(--gp-accent-2);
  font-size: .75rem;
  font-weight: 700;
  margin-right: .65rem;
  flex-shrink: 0;
}
.gp-trail-card-header {
  display: flex;
  align-items: center;
  margin-bottom: .4rem;
}
.gp-trail-card-title {
  font-weight: 600;
  color: var(--gp-text);
  font-size: .95rem;
}
.gp-trail-card-why {
  color: #94a3b8;
  font-size: .85rem;
  line-height: 1.5;
  padding-left: 2.15rem;
}
.gp-trail-card-arrow {
  margin-left: auto;
  color: #64748b;
  font-size: .85rem;
  transition: color .2s, transform .2s;
  flex-shrink: 0;
}
.gp-trail-card:hover .gp-trail-card-arrow {
  color: var(--gp-accent-2);
  transform: translateX(3px);
}

.gp-trails-heading {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--gp-text);
  margin-bottom: .5rem;
}
.gp-trails-subheading {
  color: #94a3b8;
  font-size: .85rem;
  margin-bottom: 1rem;
}

.gp-scout-report {
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
  padding: 1.5rem;
  margin: 1.25rem 0;
  color: #cbd5e1;
  line-height: 1.7;
  font-size: .92rem;
}
.gp-scout-report h1, .gp-scout-report h2, .gp-scout-report h3,
.gp-scout-report h4, .gp-scout-report h5 {
  color: var(--gp-text);
  margin-top: 1.25rem;
  margin-bottom: .5rem;
}
.gp-scout-report h1:first-child, .gp-scout-report h2:first-child {
  margin-top: 0;
}
.gp-scout-report code {
  background: var(--gp-surface-2);
  padding: .15rem .4rem;
  border-radius: .25rem;
  font-size: .85em;
}
.gp-scout-report pre {
  background: var(--gp-bg);
  border: 1px solid var(--gp-border);
  border-radius: .5rem;
  padding: 1rem;
  overflow-x: auto;
}
.gp-scout-report a { color: var(--gp-accent); }
.gp-scout-report ul, .gp-scout-report ol { padding-left: 1.25rem; }
.gp-scout-report li { margin-bottom: .3rem; }

.gp-scout-report-header {
  display: flex;
  align-items: center;
  gap: .75rem;
  margin-bottom: 1rem;
  padding-bottom: .75rem;
  border-bottom: 1px solid var(--gp-border);
}
.gp-scout-report-badge {
  background: rgba(167, 139, 250, 0.15);
  color: var(--gp-accent-2);
  font-size: .72rem;
  font-weight: 600;
  padding: .25rem .65rem;
  border-radius: 2rem;
  white-space: nowrap;
}
.gp-scout-report-title {
  font-weight: 600;
  color: var(--gp-text);
  font-size: 1rem;
}

.gp-scout-bottom-actions {
  display: flex;
  gap: .75rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.gp-scout-empty {
  text-align: center;
  color: #94a3b8;
  padding: 2rem 1rem;
  background: var(--gp-surface);
  border: 1px solid var(--gp-border);
  border-radius: .75rem;
}
.gp-scout-empty-icon {
  font-size: 2rem;
  margin-bottom: .75rem;
  display: block;
}
`;

const GP_FAVICON = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient></defs><circle cx="32" cy="28" r="18" fill="none" stroke="url(#g)" stroke-width="3" opacity=".8"/><ellipse cx="24" cy="24" rx="3" ry="4" fill="url(#g)" opacity=".9"/><ellipse cx="40" cy="24" rx="3" ry="4" fill="url(#g)" opacity=".9"/><path d="M18 44c2-4 6-3 8 0s4 8 6 8 4-4 6-8 6-4 8 0" stroke="url(#g)" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/></svg>')}" type="image/svg+xml">`;

export function loginPage(nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Ghostpaw — Login</title>
  ${GP_FAVICON}
  <link rel="stylesheet" href="/assets/style.css?v=${BOOT_ID}">
</head>
<body style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%, #22d3ee08 0%, var(--gp-bg) 70%)">
  <div class="gp-surface p-4 p-sm-5" style="width:100%;max-width:400px;margin:1rem">
    <h3 class="mb-1 text-center gp-gradient-text">Ghostpaw</h3>
    <p class="text-center mb-4 gp-text-muted" style="font-size:.85rem">Sign in to your agent</p>
    <div id="error" class="alert alert-danger d-none small" style="background:var(--gp-danger);color:#fff;border:none;border-radius:.5rem"></div>
    <form id="loginForm">
      <div class="mb-3 position-relative">
        <input type="password" id="password" class="form-control gp-input" placeholder="Password" autofocus required style="padding-right:2.5rem">
        <button type="button" id="togglePw" style="position:absolute;right:.6rem;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--gp-muted);cursor:pointer;font-size:.9rem;padding:0" tabindex="-1">&#128065;</button>
      </div>
      <button type="submit" class="btn btn-gp w-100" style="padding:.6rem">Sign in</button>
    </form>
  </div>
  <script nonce="${nonce}">
    document.getElementById('togglePw').addEventListener('click', () => {
      const pw = document.getElementById('password');
      pw.type = pw.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type=submit]');
      const pw = document.getElementById('password').value;
      const errEl = document.getElementById('error');
      errEl.classList.add('d-none');
      btn.disabled = true;
      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw }),
        });
        if (res.ok) {
          window.location.href = '/';
        } else {
          const data = await res.json();
          errEl.textContent = data.error || 'Login failed';
          errEl.classList.remove('d-none');
        }
      } catch {
        errEl.textContent = 'Connection failed';
        errEl.classList.remove('d-none');
      } finally {
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

export function appShell(nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Ghostpaw</title>
  ${GP_FAVICON}
  <link rel="stylesheet" href="/assets/style.css?v=${BOOT_ID}">
</head>
<body>
  <!-- Mobile top bar -->
  <div class="gp-topbar">
    <button class="gp-hamburger" id="btnMenu" aria-label="Menu">&#9776;</button>
    <span class="gp-gradient-text" style="font-size:1rem">Ghostpaw</span>
    <span style="flex:1"></span>
    <button id="btnNewChatMobile" class="btn btn-sm btn-gp-outline" style="font-size:.75rem;padding:.2rem .5rem">+ New</button>
  </div>

  <!-- Backdrop for mobile drawer -->
  <div class="gp-backdrop" id="sidebarBackdrop"></div>

  <div class="gp-layout">
    <!-- Sidebar / Drawer -->
    <nav class="gp-sidebar" id="sidebar">
      <div style="padding:1rem 1rem .5rem">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="mb-0 gp-gradient-text" style="font-size:1.15rem">Ghostpaw</h5>
          <button id="btnNewChat" class="btn btn-sm btn-gp-outline" title="New chat" style="font-size:.75rem;padding:.2rem .5rem">+ New</button>
        </div>
        <div class="mb-2">
          <div class="gp-nav-item active" data-view="chat"><span class="gp-nav-icon">&#128172;</span> Chat</div>
          <div class="gp-nav-item" data-view="dashboard"><span class="gp-nav-icon">&#9638;</span> Dashboard</div>
          <div class="gp-nav-item" data-view="sessions"><span class="gp-nav-icon">&#128196;</span> Sessions</div>
          <div class="gp-nav-item" data-view="skills"><span class="gp-nav-icon">&#9889;</span> Skills</div>
          <div class="gp-nav-item" data-view="memory"><span class="gp-nav-icon">&#129504;</span> Memory</div>
          <div class="gp-nav-item" data-view="train"><span class="gp-nav-icon">&#127891;</span> Train</div>
          <div class="gp-nav-item" data-view="scout"><span class="gp-nav-icon">&#129517;</span> Scout</div>
        </div>
      </div>

      <div id="sessionList" style="flex:1;min-height:0;overflow-y:auto;padding:0 .75rem;font-size:.85rem"></div>

      <div style="padding:.75rem 1rem;border-top:1px solid var(--gp-border);flex-shrink:0">
        <div class="d-flex justify-content-between align-items-center" style="font-size:.78rem;color:var(--gp-muted)">
          <span id="footerModel"></span>
          <a href="#" id="btnLogout" style="color:var(--gp-muted);text-decoration:none;transition:color .15s">Logout</a>
        </div>
      </div>
    </nav>

    <!-- Main content -->
    <main class="gp-main">
      <!-- Chat view -->
      <div id="viewChat" class="gp-view-flex">
        <div id="chatMessages" class="gp-chat-messages">
          <div class="gp-empty" id="chatEmpty">
            <div class="gp-empty-icon"></div>
            <div>
              <div style="font-size:1.1rem;color:var(--gp-text);margin-bottom:.25rem">Start a conversation</div>
              <div style="font-size:.85rem">Type a message or create a new chat session</div>
            </div>
          </div>
        </div>
        <div class="gp-chat-input">
          <form id="chatForm" class="d-flex gap-2 align-items-end">
            <textarea id="chatInput" class="form-control gp-input" rows="1"
              placeholder="Type a message…" style="min-height:42px;max-height:200px;transition:height .15s ease"></textarea>
            <button type="submit" class="btn btn-gp" id="btnSend" style="width:42px;height:42px;padding:0;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0" title="Send">&#10148;</button>
          </form>
        </div>
      </div>

      <!-- Dashboard view -->
      <div id="viewDashboard" class="gp-view p-4 d-none">
        <h4 class="mb-4 gp-gradient-text">Dashboard</h4>
        <div class="row g-3" id="dashboardStats"></div>
      </div>

      <!-- Sessions view -->
      <div id="viewSessions" class="gp-view p-4 d-none">
        <h4 class="mb-4 gp-gradient-text">Sessions</h4>
        <div id="sessionsContent"></div>
      </div>

      <!-- Skills view -->
      <div id="viewSkills" class="gp-view p-4 d-none">
        <h4 class="mb-4 gp-gradient-text">Skills</h4>
        <div id="skillsContent"></div>
        <div id="skillEditor" class="d-none mt-3">
          <h5 id="skillEditorTitle" style="color:var(--gp-accent)"></h5>
          <textarea id="skillContent" class="form-control gp-input font-monospace" rows="20"></textarea>
          <div class="mt-2 d-flex gap-2">
            <button id="btnSaveSkill" class="btn btn-gp btn-sm">Save</button>
            <button id="btnCancelSkill" class="btn btn-sm btn-gp-outline">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Memory view -->
      <div id="viewMemory" class="gp-view p-4 d-none">
        <h4 class="mb-4 gp-gradient-text">Memory</h4>
        <div id="memoryContent"></div>
      </div>

      <!-- Train view -->
      <div id="viewTrain" class="gp-view p-4 d-none">
        <h4 class="mb-4 gp-gradient-text">Train</h4>
        <div id="trainContent"></div>
      </div>

      <!-- Scout view -->
      <div id="viewScout" class="gp-view p-4 d-none">
        <h4 class="mb-4 gp-gradient-text">Scout</h4>
        <div id="scoutContent"></div>
      </div>
    </main>
  </div>

  <script src="/assets/marked.js?v=${BOOT_ID}" nonce="${nonce}"></script>
  <script src="/assets/app.js?v=${BOOT_ID}" nonce="${nonce}"></script>
</body>
</html>`;
}
