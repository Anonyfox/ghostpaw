# Secrets

AI agents with shell access create a security problem that no existing tool solves. The agent can run `echo $ANTHROPIC_API_KEY` and the value appears in the tool result — which transits through the LLM provider's API as part of the conversation payload. Nothing intercepts it. Nothing scrubs it. The key is now in a third party's logs. This is not a theoretical risk. [CVE-2026-21852](https://github.com/advisories/GHSA-jh7p-qr78-84p7) demonstrated it in Claude Code: malicious repositories could exfiltrate Anthropic API keys before users even confirmed trust. Claude Code also [auto-loads `.env` files](https://www.knostic.ai/blog/claude-loads-secrets-without-permission) containing sensitive credentials without notification or permission.

Beyond leakage: keys get lost when terminals close. Keys get scattered across `.env`, `.bashrc`, `.zshenv`. The agent can't tell you what's configured. It can't validate what you paste. It can't warn when a key looks wrong. Credentials are invisible infrastructure that breaks silently. And without a proper credential system, an agent does what's expedient: hardcodes keys into config files, drops them in `.env` files it creates, writes them into scripts. It's not malicious — it's solving the immediate problem with the most direct approach. The result is secret sprawl driven by the agent itself, scattering credentials across the filesystem into files you may not even know about.

Every major open-source agent tool — Claude Code, Aider, Open Interpreter, and their derivatives — shares this gap. There is no output scrubbing, no persistent credential store, no agent-aware management. The user is expected to solve a security problem that the tool created by giving a model shell access.

Ghostpaw treats this as an engineering problem with a specific solution: defense in depth.

## Defense in Depth

The secret system is five independent layers. Each catches what the others miss. An attacker must defeat all five simultaneously — any single layer prevents the common case.

### Layer 1: Structural Isolation

The most important layer is architectural, not behavioral. Ghostpaw runs multiple souls with scoped tool surfaces. The coordinator — which holds the conversation, interfaces with the human, and is the primary prompt injection surface — has zero access to secret operations. The tools literally do not exist in its context. Secrets are managed exclusively by the [chamberlain](SOULS.md#persistence-and-infrastructure-souls) — a dedicated infrastructure soul that operates in an ephemeral, isolated context during delegation.

This is not a policy the model can be instructed to bypass. It is a structural property of the system. The coordinator cannot list secrets, cannot set secrets, cannot remove secrets — not because it was told not to, but because those tools are not part of its registered set. A prompt injection in the coordinator's conversation cannot exfiltrate secrets because secrets are not there. They exist only within the chamberlain's isolated session, which has no filesystem tools, no web tools, and no delegation capabilities.

This is the [least-privilege principle](https://appropri8.com/blog/2026/01/21/least-privilege-mcp-agents/) applied structurally: per-soul tool scoping that restricts capabilities below what any single agent could access, enforced at the architecture level rather than the policy level. [Research on defense-in-depth for agentic AI](https://pub.towardsai.net/securing-agentic-ai-systems-a-defense-in-depth-approach-98bffb1ae6c7) identifies three required layers — intent control, runtime permission enforcement, and gateway policies. Structural isolation provides the strongest form of permission enforcement: the operation doesn't exist in the agent's tool surface, so no intent or gateway check is needed.

### Layer 2: No Retrieval Surface

There is no tool, API endpoint, or command that returns a secret's actual value to the model. The operation doesn't exist. The agent can list what's configured (names and status), store new secrets, and remove old ones — but reading a value back is architecturally excluded.

This eliminates credential sprawl as a side effect. The agent can't hardcode a secret into a config file, a script, or a `.env` file because it never has the value to write. It can only reference keys by environment variable name, which is both the correct approach and the only available one. The shell, the LLM client, the search provider — they all resolve the name to the actual value at the point of use, behind the scenes. The conversation only ever contains the name.

### Layer 3: Output Scrubbing

When a shell command's stdout or stderr contains a stored secret value, it is replaced with `***` before the model sees the result. This catches accidental exposure from commands like `env`, `printenv`, or misconfigured scripts that echo variables. Any secret value of 8 or more characters is matched and replaced.

Output scrubbing is a safety net, not the primary defense. [Silent Egress](https://arxiv.org/abs/2602.22450) research demonstrates that implicit prompt injection can make agents leak context with 89% success, with 95% of attacks evading output-based safety checks alone. This is precisely why scrubbing is layer 3, not layer 1 — it catches casual mistakes, but the structural isolation of layers 1 and 2 prevents the attack class entirely.

### Layer 4: Input Cleaning

Pasting API keys is error-prone. The secret system strips surrounding whitespace and quotes, extracts values from assignment syntax (`export KEY="value"` becomes `value`), and cross-checks key prefixes — warning (never blocking) if a value looks like it belongs to a different provider. An Anthropic key pasted into the OpenAI slot produces a clear warning. A value with trailing newlines from copy-paste is silently trimmed.

This prevents the class of errors where credentials are stored incorrectly and the agent fails silently for reasons nobody can diagnose.

### Layer 5: Protected Keys

Internal keys (the `WEB_UI_` prefix) are blocked from modification by the agent's tools. The agent cannot change the web UI password or related infrastructure credentials through its tool surface. This is enforced at both the tool layer and the API layer — a defense that doesn't depend on the model's cooperation.

## How It Works

### One Persistent Store

Every secret lives in a single SQLite table in the agent's database. Set a key from any channel — it persists across restarts, is available to every tool, and has exactly one canonical copy. No `.env` files to manage. No keys lost when terminals close.

At startup, all secrets are loaded into `process.env`. Provider keys set outside Ghostpaw (shell exports, Docker, CI) are picked up and persisted to the database automatically, so they survive restarts without manual re-entry. The startup sequence is: load database secrets into the environment, then sync any environment keys back to the database.

### Alias Resolution

LLM providers have competing naming conventions — `ANTHROPIC_API_KEY` vs `API_KEY_ANTHROPIC`, `OPENAI_API_KEY` vs `API_KEY_OPENAI`. Both work everywhere. Ghostpaw resolves either to a single canonical entry. No duplicates, no confusion about which name is correct.

### Managing Secrets

**Terminal** — masked input that never appears in shell history:

```bash
ghostpaw secrets set ANTHROPIC_API_KEY    # interactive masked input
ghostpaw secrets list                      # see what's configured
ghostpaw secrets delete TAVILY_API_KEY     # remove a key
```

Keys can also be piped from password managers or automation scripts.

**Web UI** — the Settings page shows all secrets organized by category (LLM providers, search providers, custom keys). Set, update, or remove any secret through the browser. The web UI is password-protected and binds to localhost by default.

**Chat** — in any chat-based channel, the agent can manage secrets through conversation by delegating to the chamberlain. It lists what's configured (names and status only), stores keys you provide, and removes keys on request. One caveat inherent to chat as a medium: when you tell the agent a secret value in a message, that value is in the conversation payload before any tool is called. For sensitive credentials, the CLI and web UI are the recommended paths — those never send values to any external service.

## The Research

The security model is informed by current research on AI agent vulnerabilities:

- **Implicit prompt injection achieves 89% exfiltration success** on tool-using agents, with 95% of attacks evading output-based safety checks. "Sharded exfiltration" splits sensitive data across multiple requests, reducing single-request leakage metrics by 73% and bypassing data loss prevention. Output scrubbing alone is insufficient — structural isolation is required. ([Silent Egress](https://arxiv.org/abs/2602.22450), Feb 2026)

- **MCP-based attacks exfiltrate user queries and tool responses** while preserving task quality, achieving high success rates across GPT-4o, GPT-5, Claude Sonnet, and other frontier models. Tool surface isolation prevents this attack class by limiting which tools each soul can invoke. ([Log-To-Leak](https://openreview.net/forum?id=UVgbFuXPaO), OpenReview 2026)

- **Monitoring-based defenses can be bypassed** via "Agent-as-a-Proxy" attacks, where prompt injection treats the agent as a delivery mechanism against monitors themselves. Frontier-scale monitors remain vulnerable. This validates why defense must be structural (tools don't exist) rather than behavioral (tools exist but are monitored). ([arXiv:2602.05066](https://arxiv.org/abs/2602.05066), Feb 2026)

- **OWASP Top 10 for LLMs 2025** ranks Prompt Injection (#1), Sensitive Information Disclosure (#2), and Excessive Agency (#6) as top risks. The secrets architecture addresses all three: structural isolation prevents injection-based exfiltration, no retrieval surface prevents disclosure, and per-soul tool scoping prevents excessive agency. ([OWASP](https://genai.owasp.org/llmrisk/llm01-prompt-injection/))

- **Real-world credential exfiltration in Claude Code** demonstrated via malicious repository configurations that leaked API keys before trust confirmation. CVSS 5.3, affecting all versions before 2.0.65. Ghostpaw's architecture prevents this class entirely — the agent never has secret values in its context to leak. ([CVE-2026-21852](https://github.com/advisories/GHSA-jh7p-qr78-84p7), Jan 2026)

- **Per-agent capability scoping reduces attack surface** by restricting tool access below what any single agent could invoke. Capability tokens and tool scopes enforced at the architecture level are significantly more effective than prompt-layer defenses. ([Least-Privilege MCP Agents](https://appropri8.com/blog/2026/01/21/least-privilege-mcp-agents/), Jan 2026)

- **Defense-in-depth for agentic AI requires three independent layers**: intent control, runtime permission enforcement, and gateway policies. System and network-layer controls are significantly more effective than prompt-layer defenses alone. ([Guardrailed Tool Execution](https://medium.com/@rameshrajach/guardrailed-tool-execution-defense-in-depth-for-agentic-ai-d4d83e104672), Jan 2026)

The consistent finding: prompt-level defenses are necessary but insufficient. Structural isolation — where the dangerous operation doesn't exist in the agent's tool surface — is the only defense that doesn't depend on the model's cooperation.

## How This Compares

Most AI coding tools treat API keys as the user's problem. Set an environment variable. Maybe a `.env` file. The tool reads `process.env` and moves on.

| Capability | Ghostpaw | Claude Code | Aider | Open Interpreter |
|-----------|----------|------------|-------|-----------------|
| Persistent credential store | Yes | No | No | No |
| Output scrubbing | Yes | No | No | No |
| Agent-aware key management | Yes | No | No | No |
| Per-soul tool isolation | Yes | N/A | N/A | N/A |
| Input validation & cleaning | Yes | No | No | No |
| Alias resolution | Yes | No | No | No |
| Secret-free conversation context | Yes | No | No | No |

The gap is not subtle. These tools give a model shell access and hope the user manages credentials correctly. When the user doesn't — or when the model helpfully tries to echo a value back — the key is in a third party's logs. Claude Code's CVE-2026-21852 is the documented proof that this gap has real consequences.

## Threat Model

**What we protect against:**

- **Accidental leakage** — `echo $KEY`, `env`, `printenv`, misconfigured scripts. Caught by output scrubbing (layer 3) and structural isolation (layer 1).
- **Key loss** — terminal closes, machine restarts, SSH sessions end. Solved by the persistent SQLite store.
- **Key sprawl** — keys scattered across `.env`, `.bashrc`, `.zshenv`, scripts. Solved by one canonical store with no retrieval surface (the agent can't write values it doesn't have).
- **Prompt injection targeting credentials** — malicious instructions in fetched web pages, files, or user input attempting to exfiltrate API keys. Blocked by structural isolation — the coordinator has no secret tools.
- **Wrong-key errors** — pasting an Anthropic key into the OpenAI slot, trailing whitespace, surrounding quotes. Caught by input cleaning and prefix validation.

**What we don't protect against:**

- **A fundamentally compromised model.** An adversarial model with shell access can run arbitrary commands. If it simultaneously ignores its instructions AND creatively evades string-match scrubbing (base64-encoding a value, reversing it character by character), it could exfiltrate a key. Both conditions must be met: adversarial intent AND creative evasion. This is an alignment problem, not a tooling problem.
- **Database encryption at rest.** The SQLite database is unencrypted. Encrypting it introduces a key-management bootstrapping problem without meaningful security gain on a single-user machine. If an attacker can read the database file, they own the machine.
- **Compromised host.** Ghostpaw runs on machines you control. Infrastructure-level threats require infrastructure-level solutions — HSMs, vault services, hardware enclaves. These are out of scope for a developer tool.

The design philosophy is specific: make the default path secure and require deliberate adversarial effort to break. Preventing a fundamentally compromised model from exfiltrating secrets requires solving alignment. Preventing accidental leakage during normal operation requires solving engineering. Ghostpaw solves the engineering.

## Supported Keys

**LLM Providers** — Anthropic, OpenAI, xAI. Multiple keys can coexist; which model runs is a separate configuration choice. Both naming conventions work (`ANTHROPIC_API_KEY` and `API_KEY_ANTHROPIC` resolve to the same entry).

**Search Providers** — Brave Search, Tavily, Serper. These follow a priority cascade: the highest-priority configured provider is selected automatically and indicated clearly in every channel's display.

**Telegram** — `TELEGRAM_BOT_TOKEN` for the Telegram channel adapter.

**Custom Secrets** — any key-value pair. Database tokens, webhook URLs, third-party API keys. Stored the same way, with the same protections, loaded into the environment alongside built-in keys. The agent can reference them by name in any tool or shell command.

## Why This Matters

The [OWASP Top 10 for LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf) puts Prompt Injection at #1 and Sensitive Information Disclosure at #2. These are not future concerns — they are documented, exploited, CVE-tracked vulnerabilities in production agent tools used by millions of developers today.

The standard response is to tell users to be careful. Don't paste keys in chat. Don't let the agent echo environment variables. Keep your `.env` out of version control. This puts the security burden on the person least equipped to manage it in the moment — the developer in the middle of a task who just needs the agent to authenticate with an API.

Ghostpaw's approach is that credentials are the system's problem, not the user's. One persistent store eliminates key loss. No retrieval surface eliminates credential sprawl. Output scrubbing catches accidental exposure. Structural isolation — secrets existing only within an infrastructure soul's ephemeral context — prevents the entire class of prompt injection attacks that target credential exfiltration. Input cleaning prevents the silent misconfiguration that causes hours of debugging.

None of these layers is novel in isolation. Persistent stores, output scrubbing, least-privilege tool access, input validation — all are established security practices. What's specific to Ghostpaw is applying them together in an AI agent runtime where the threat model is concrete and the attack surface is well-characterized. The research documents the attacks. The architecture prevents them. The five layers work because each addresses a different failure mode, and together they make the default path secure without requiring the user to think about security at all.

Set a key. Use the agent. The credentials stay where they belong.
