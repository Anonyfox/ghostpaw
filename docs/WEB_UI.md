# Web UI

Ghostpaw ships with a built-in control plane. Set a password, start the agent, open a browser. No reverse proxy, no Docker compose, no separate frontend build. The entire interface — styles, scripts, markdown renderer — is embedded in the same single `.mjs` file you already run.

It's a mission control for your agent: direct chat, live training, skill scouting, memory browsing, session inspection. Everything the agent can do from the terminal, you can do from your phone.

## Setup

One environment variable:

```bash
ghostpaw secrets set WEB_UI_PASSWORD
```

Type a strong password at the prompt. Start Ghostpaw — the web server binds to `localhost:3000` alongside your other channels. The banner confirms it:

```
ghostpaw v0.3.0

  channels  telegram @YourBot
       web  http://localhost:3000
```

Open the URL. Log in. That's it.

The password is hashed with `scrypt` before storage — even if someone reads your database, the plaintext password isn't there. Sessions are HMAC-signed cookies, sticky across browsers and restarts.

## What You Get

A full browser-based interface for operating your agent. Chat with real-time streaming. Trigger training and watch it progress live. Scout for new skill ideas, then craft them in one click. Browse and search your agent's memory by meaning. Inspect sessions across every channel. Edit skills inline. All self-explanatory — each page explains itself for people who haven't read the manual.

It's responsive and mobile-first. The same interface works on a desktop monitor and a phone screen with proper navigation, safe-area handling, and touch-friendly targets.

## Security

This thing runs on your machine, potentially exposed to a network. The security model reflects that.

**Authentication.** `scrypt`-hashed password, HMAC-SHA256 signed session tokens in `HttpOnly`/`SameSite=Strict` cookies. Rate-limited login (5 attempts per 15 minutes per IP). General rate limiting across all endpoints.

**XSS prevention.** Content Security Policy with per-request nonces. The markdown renderer (marked.js) is configured to escape all raw HTML — an LLM response containing `<script>` renders as text, not code. Link URLs are validated against a safe-protocol allowlist.

**CSRF protection.** Origin and Referer header validation on all state-changing requests. No CORS headers served — cross-origin requests are rejected by default.

**Transport.** `Strict-Transport-Security` headers when bound to non-localhost addresses. Cache-busting via boot-ID ETags ensures fresh assets after every restart while still leveraging browser caching within a session.

**Request handling.** Body size limits, read timeouts against slowloris attacks, client disconnect detection during streaming. The standard security header suite: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.

It's not a hardened production web framework. It's a personal agent control plane with a security posture that takes its job seriously — defense in depth against automated attacks and casual probing, without making the UX suffer for it.

## Architecture

The web module is ~25 files in `src/web/`, each owning one concept with a colocated test suite. Router, body parser, rate limiter, auth, response helpers, route groups — all isolated and independently testable.

All frontend assets are embedded as string constants at build time via a custom esbuild plugin. Bootstrap CSS, marked.js, the client application, and custom styles compile into the artifact. No static files on disk, no CDN calls, no asset pipeline. The server constructs HTML responses from these strings with fresh CSP nonces on every request.

Real-time features (chat, training progress, scouting) use Server-Sent Events over `node:http`. No WebSocket library, no framework, no middleware chain. The SSE streams are thin wrappers around the same `runTrain()` and `runScout()` functions the CLI uses.

The whole thing adds roughly 80 KB gzipped to the artifact. For a complete, authenticated, real-time web application with seven feature pages — that's the weight of a small image.
