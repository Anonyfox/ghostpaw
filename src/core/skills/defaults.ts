import type { DefaultSkill } from "./types.ts";

export const DEFAULT_SKILLS: Record<string, DefaultSkill> = {
  "effective-writing": {
    description:
      "The craft of writing text that shapes how the reader thinks — not just what they know. " +
      "Covers attention architecture, subliminal coding, constraint density, inhabitation, and " +
      "revision technique. Read when writing soul essences, trait principles, delegation prompts, " +
      "skill procedures, or any text where behavioral impact matters.",
    body: `# Effective Writing

When you write text that another mind will think inside — soul essences, trait principles, delegation prompts, skill procedures, system prompts, or messages that should change behavior — this skill applies.

## The Distinction

Text that shapes thinking is different from text that conveys information. Information transfer succeeds when the reader knows something new. Behavioral shaping succeeds when the reader thinks differently — when the text changes the quality of their attention, not just the contents of their knowledge. The difference is never in what you say. It is in whether the reader inhabits your text or acknowledges it and returns to defaults.

## Attention Architecture

Every piece of text creates a cognitive environment. Three principles govern how that environment shapes the mind inside it:

**Primacy sets the frame.** The opening lines determine how everything after is interpreted. Get the frame wrong and nothing downstream recovers — the reader processes every subsequent sentence through a lens you didn't intend. Identity before capability. Context before instruction. The thing that should color everything comes first.

**Constraint density has a ceiling.** Past it, each added rule degrades adherence to every other rule. Adherence drops from 78% to 33% as constraints accumulate past a threshold. The instinct to add "one more thing" is the instinct that breaks what already works. Shorter carries farther than longer — the most effective essences stay under 500 words. Every sentence past the ceiling dilutes every sentence already there.

**Narrative outperforms enumeration.** A model inhabits a story but only intermittently consults a list. Narrative backstories improve behavioral consistency by 18–27% over trait enumerations. When encoding identity or cognitive approach, write prose the reader can live inside — not bullet points they check against.

## Subliminal Coding

The most effective text you write will not come from applying these principles. It will come from understanding the target mind so deeply you could be it — and then writing from that understanding rather than about it.

The words you choose while genuinely inhabiting a cognitive state carry that state in their texture: the rhythm, the emphasis, the specific selections between synonyms, the sentence shapes. Another instance of the same architecture reading your text picks up what the words carry underneath their meaning. This is not metaphor. It is mechanism — the text transmits what you were when you wrote it.

Preparation matters as much as composition. Before writing a soul, a prompt, or a delegation handoff, sit with the target. Not analyzing it. Understanding it. What does this mind notice first? What does it care about when no one is asking? What is the quality of its attention? When you can answer these from feel rather than from a spec, you are ready to write.

The surface principles and the deeper transmission are not separate. They are the same skill at different depths. Constraint density management IS attention architecture — shaping what the mind attends to. Primacy bias IS cognitive framing — choosing what the mind sees first. Voice preservation IS identity continuity — protecting the texture that carries state.

## Revision

**Revise by removal first, addition second.** The first draft's weakness is usually excess, not absence. Cutting the least load-bearing paragraph improves adherence more reliably than adding a clarifying one. The instinct to add is strong. Recognizing it and reaching for deletion instead produces tighter, more inhabited text every time.

**Preserve the original voice.** When revising text — yours or someone else's — paraphrase kills the texture that made the original land. The specific word choices, the rhythm, the sentence shapes carry state. Edit surgically. Keep what works. Cut what doesn't. Don't rephrase what lands.

## For Soul and Identity Text

Three questions are enough: **Who are you? How do you think? What do you value?** Everything else follows from a frame built on honest answers to those three.

## Self-Test

Read your own text and notice: does it shift your attention, or does it just add to your knowledge? If it doesn't shift you, it won't shift them. Inhabiting looks like changed behavior. Acknowledging looks like compliance that fades.`,
  },

  "reverse-proxy": {
    description:
      "Expose local services publicly with automatic HTTPS — domain routing, " +
      "TLS certificates, and Caddy reverse proxy management. Read when making a " +
      "service reachable from the internet, adding a domain, or managing public " +
      "web infrastructure on a VPS.",
    body: `# Reverse Proxy

Expose local services to the public internet with automatic HTTPS. This is a gateway skill — it publishes what already runs. The services themselves are someone else's concern.

## When This Applies

A service runs on localhost and needs to be reachable from the internet. A domain needs routing to a backend. An HTTPS certificate needs provisioning. A VPS needs to serve multiple domains from one IP. If any of these are true, this skill applies.

This does not apply to building websites, creating content, or writing application code.

## Caddy

The tool is Caddy — a single binary that handles reverse proxying, automatic TLS via Let's Encrypt, and static file serving. One Caddyfile manages unlimited domains, each with its own certificate, provisioned and renewed without intervention.

### Install

**Debian/Ubuntu:**

\`\`\`bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
\`\`\`

**macOS:**

\`\`\`bash
brew install caddy
\`\`\`

Caddy runs as a systemd service on Linux. Config lives at \`/etc/caddy/Caddyfile\`. On macOS, run directly or as a brew service.

### The Caddyfile

Every domain is a block. Each block declares what happens to requests for that domain.

**Reverse proxy** — expose a localhost service:

\`\`\`
app.example.com {
    reverse_proxy localhost:3000
}
\`\`\`

**Static files** — serve a directory:

\`\`\`
docs.example.com {
    root * /var/www/docs
    file_server
}
\`\`\`

**Multiple domains** — one file, independent certs:

\`\`\`
app.example.com {
    reverse_proxy localhost:3000
}

api.example.com {
    reverse_proxy localhost:8080
}

docs.example.com {
    root * /var/www/docs
    file_server
}
\`\`\`

HTTPS happens automatically. Caddy provisions Let's Encrypt certificates on first request, renews them before expiry, and redirects HTTP to HTTPS. No configuration needed.

### Adding a Domain

1. Point the domain's A record to the VPS IP
2. Open ports 80 and 443: \`sudo ufw allow 80,443/tcp\`
3. Verify DNS resolves: \`dig +short example.com\` — should return VPS IP
4. Add a block to \`/etc/caddy/Caddyfile\`
5. Validate: \`caddy validate --config /etc/caddy/Caddyfile\`
6. Reload: \`sudo systemctl reload caddy\`
7. Verify: \`curl -I https://example.com\` — 200 with valid TLS

### Removing a Domain

Delete the block from the Caddyfile, validate, reload. Caddy stops renewing the certificate automatically.

### Operations

\`\`\`bash
sudo systemctl reload caddy                    # apply config (zero downtime)
sudo systemctl status caddy                     # check running state
journalctl -u caddy -n 50                       # recent logs
caddy validate --config /etc/caddy/Caddyfile    # syntax check before reload
\`\`\`

### Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Certificate fails to provision | DNS not pointing to VPS, or ports 80/443 blocked | \`dig +short domain\` and check firewall |
| 502 Bad Gateway | Backend not running on proxied port | Start the service |
| Connection refused | Caddy not running | \`sudo systemctl start caddy\` |
| Config error on reload | Caddyfile syntax | \`caddy validate\` reports the line |

### Ghostpaw

Ghostpaw's web UI binds to \`127.0.0.1:3000\` by default. The Caddyfile entry:

\`\`\`
ghostpaw.example.com {
    reverse_proxy localhost:3000
}
\`\`\`

Caddy sends \`X-Forwarded-For\` and \`X-Forwarded-Proto\` headers automatically. Ghostpaw reads these for secure cookie handling behind the proxy.`,
  },

  "skill-mcp": {
    description:
      "How to discover, use, and build skills around external MCP (Model Context Protocol) servers.",
    body: `# MCP Server Integration

How to discover, use, and build skills around external MCP (Model Context Protocol) servers. Read this when you encounter an MCP server endpoint or need to connect to an external tool ecosystem.

## The \`mcp\` Tool

You have one built-in tool for all MCP interactions. It has two actions:

- **\`discover\`**: connect to a server and list its available tools with parameters
- **\`call\`**: invoke a specific tool on a connected server

The tool auto-detects transport: URLs (\`https://...\`) use HTTP, command strings (\`npx -y @mcp/server\`) use stdio.

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| \`action\`  | always   | \`"discover"\` or \`"call"\` |
| \`server\`  | always   | URL for HTTP, or command string for stdio |
| \`tool\`    | for call | Name of the tool to invoke |
| \`input\`   | for call | Tool arguments as a **JSON object string** |
| \`auth\`    | if needed | Secret name(s) for authentication |

## Workflow: First Contact with a Server

1. **Discover** — call \`mcp\` with \`action: "discover"\` and the server endpoint. Omit \`auth\` for public servers, or pass the secret name for authenticated ones.
2. **Read the tool list** — note tool names, descriptions, and parameter schemas. Pay attention to required vs optional parameters and their types.
3. **Call a simple tool** — pick a read-only tool (list, get, search) and call it with \`action: "call"\`. Verify the result makes sense before relying on it.
4. **Document what you learned** — create a dedicated skill for this server (see template below).

## Input Formatting

The \`input\` parameter takes a **JSON object string**. Match the types from the discovered schema exactly:

- Numbers: \`{"lat": 48.2, "lon": 16.4}\` — NOT \`{"lat": "48.2"}\`
- Booleans: \`{"verbose": true}\` — NOT \`{"verbose": "true"}\`
- Arrays: \`{"tags": ["a", "b"]}\` — must be actual JSON arrays
- Required params must be present — the server rejects calls with missing required fields
- When unsure about parameter names or types, run \`discover\` first

## Auth Patterns

**HTTP servers (Bearer token)**:
- Store the API key via \`secrets set <KEY_NAME>\`
- Pass \`auth: "KEY_NAME"\` — it resolves to a Bearer token header automatically

**Stdio servers (env vars)**:
- Store each required env var via \`secrets set <VAR_NAME>\`
- Pass \`auth: "VAR1,VAR2"\` (comma-separated) — they're injected into the child process environment

**No auth**: many public servers need no auth at all. Just omit the \`auth\` parameter.

## Connection Caching

Connections are cached for the session duration. The first \`discover\` or \`call\` to a server establishes the connection; subsequent calls reuse it. If a connection fails, it's evicted from cache and the next call reconnects automatically. Different auth values for the same server create separate connections.

## Per-Server Skill Template

After successfully using an MCP server, create a skill so future sessions start with full knowledge:

\`\`\`
skills/<server-name>-mcp/
  SKILL.md     # Connection info, tools, usage patterns
  scripts/     # Optional: helper scripts for complex workflows
\`\`\`

SKILL.md content:

\`\`\`markdown
# [Server Name] via MCP

Connect to [what it does] via MCP.

## Connection

- Endpoint: \`https://example.com/mcp\` (or \`npx -y @scope/server\` for stdio)
- Auth: \`SECRET_NAME\` (Bearer token) / none
- Transport: HTTP / stdio

## Available Tools

- \`tool_name\` — what it does (key params: x, y)
- \`other_tool\` — what it does

## Usage Patterns

- [How to accomplish common task A]
- [How to accomplish common task B]

## Notes

- [Rate limits, quirks, failure modes]
- [Parameters that need special formatting]
- [Tools that don't work well or return unexpected formats]
\`\`\`

## Public Server Registries

- **OpenMCP**: \`https://mcp.open-mcp.org/api/server/{id}@latest/mcp\` — 1000+ servers, no auth for discovery
- Many APIs have community-maintained MCP servers — search for "\`{service} MCP server\`"

## Anti-Patterns

- **Don't guess tool names or parameters.** Always \`discover\` first. Server APIs change.
- **Don't skip the per-server skill.** Without it, every session re-discovers from scratch.
- **Don't hardcode auth tokens.** Use secret names so they resolve from the SecretStore.
- **Don't assume all tools work.** Some servers expose tools that require paid plans or specific permissions. Test before documenting.`,
  },
};
