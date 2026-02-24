# Web Tools

Ghostpaw ships two web tools out of the box: `web_search` for finding things and `web_fetch` for reading them. No browser. No Playwright. No headless Chrome dependency chain. Just HTTP requests with intelligent content extraction, provider-agnostic search, and automatic handling of large pages. The agent uses both tools on its own — you rarely need to tell it to search or fetch.

## web_search

Searches the web and returns structured results: title, URL, snippet. Supports pagination and region filtering. The agent sees the results and typically follows up with `web_fetch` on the most promising URLs.

```
Parameters:
  query     string     required    Search query
  page      integer    optional    Page number (1-based, default: 1)
  region    string     optional    Region code (e.g. 'en-us', default: worldwide)
```

Returns up to 10 results per page with a `hasMore` flag for pagination.

### Search Providers

Four providers, one interface. The active provider is selected automatically based on which API key is configured. Priority order:

```
Brave Search  →  Tavily  →  Serper  →  DuckDuckGo
(BRAVE_API_KEY)  (TAVILY_API_KEY)  (SERPER_API_KEY)  (free fallback)
```

If you have multiple keys configured, the highest-priority one wins. DDG requires no key and always works as the fallback. Set up keys with `ghostpaw secrets set <KEY>` — see [SECRETS.md](./SECRETS.md) for the full lifecycle.

**Brave Search** — Independent index (not Google). Fast. 2,000 free queries/month, then $5/1,000. Best overall quality for the price. Uses `X-Subscription-Token` header, GET requests, 10s timeout.

**Tavily** — Built for AI agents. Returns relevance scores. Designed to produce results that models can reason about effectively. 1,000 free queries/month. POST requests with Bearer auth, 15s timeout. The `search_depth: "basic"` setting keeps latency low while retaining quality.

**Serper** — Google results via API. If you want actual Google rankings without the Google Custom Search bureaucracy. 2,500 free queries then $50/50K. POST requests with `X-API-KEY` header, 10s timeout. Returns SERP data only — no content extraction (that's what `web_fetch` is for).

**DuckDuckGo** — Free, no API key, no account. Scrapes the HTML lite interface with full browser header fingerprinting (rotating User-Agents, Sec-Fetch headers, referrer, DNT). Retries with exponential backoff on rate-limit detection. Will occasionally get blocked on IPs that make too many requests — if this happens, the error message tells the agent to back off or try direct URL fetching instead.

### Provider Resolution

The provider is resolved fresh on every tool invocation, not once at startup. If you add a Tavily key mid-conversation via `ghostpaw secrets set TAVILY_API_KEY`, the very next search call uses Tavily. No restart needed.

All four providers normalize to the same `SearchResult` shape — the agent's experience is identical regardless of which provider is active. The only visible difference is result quality and latency.

## web_fetch

Fetches a URL and extracts content in one of four modes. The right mode depends on what you're after — but the agent picks intelligently based on context. When a user says "read that article," the agent uses `article` mode. When it needs to discover subpages, it uses `metadata`. When it needs raw HTML for parsing, it uses `html`.

```
Parameters:
  url      string    required    URL to fetch
  mode     enum      optional    article | text | metadata | html (default: article)
```

### Modes

**`article`** — The default. Extracts clean, readable content from a page. Strips navigation, ads, sidebars, footers — returns the main body text. Also extracts metadata: title, description, word count, estimated reading time, and up to 10 external links. This is what you want for documentation, blog posts, news articles, READMEs, and most web pages.

**`text`** — Full plaintext extraction including navigation, widget text, and other non-article content. Useful when you need everything on a page, not just the main article — for instance, scanning a product page for pricing tables, or extracting content from a page with no clear "article" structure.

**`metadata`** — Lightweight reconnaissance. Returns title, description, language, image, RSS/Atom feeds, and up to 20 internal + 20 external links. No body content. Cheap and fast — the agent uses this to map a site's structure before deciding which pages to fetch in full. Think of it as `HEAD` with intelligence.

**`html`** — Raw source. Returns the full HTML as-is. Used when the agent needs to inspect the DOM structure — form fields, script tags, specific element attributes that content extraction would discard. The last resort when cleaner modes lose information.

### Smart Content Handling

Web pages can be enormous. A documentation page might be 50,000 tokens. Returning that inline in a tool result would blow up the agent's context window.

Ghostpaw handles this automatically:

- **Under 3,000 tokens** — content returns inline in the tool result. The agent sees it immediately, no extra steps.
- **Over 3,000 tokens** — content is saved to `.ghostpaw/web/<hash>.txt` (or `.html` for HTML mode). The tool result contains a 20-line preview, the total line/token count, and the file path. The agent uses `read` to inspect specific sections.

The file is content-addressed (SHA-256 hash), so fetching the same URL twice doesn't create duplicates. Files accumulate in `.ghostpaw/web/` and can be cleaned up freely — they're ephemeral cache, not state.

### Content Extraction

Powered by `magpie-html` — a Rust-based HTML parser compiled to WASM. Fast, no native dependencies, no Chromium. Works on any platform Node runs on. The tradeoff: no JavaScript execution. Pages that require client-side rendering (SPAs with no SSR) will return empty or minimal content. For those, the `html` mode at least gets the shell, and the agent can inspect `<script>` tags or API endpoints.

## How the Agent Uses These

The agent's system prompt describes both tools. In practice, the agent develops its own patterns:

**Research pattern.** User asks a technical question → agent searches → scans snippets → fetches the 2-3 most relevant URLs in `article` mode → synthesizes an answer with citations.

**Site exploration.** Agent needs to understand a service → `metadata` fetch on the root URL → discovers documentation link → `article` fetch on the docs → reads specific sections from the saved file.

**Multi-page gathering.** Agent searches for a broad topic → pages through results (page 1, 2, 3) → collects URLs → fetches each in parallel via delegation → assembles findings.

**Fallback escalation.** `article` mode returns thin content → agent retries with `text` → still insufficient → falls back to `html` and parses manually.

These patterns aren't hardcoded. They emerge from the tool descriptions and the model's reasoning. A skilled Ghostpaw instance may even write a skill about effective web research after enough training sessions — at which point the pattern becomes explicit procedural knowledge.

## Configuration

No configuration files. The only decision is which search provider to use, controlled entirely by API keys:

```bash
# Use Brave Search (recommended)
ghostpaw secrets set BRAVE_API_KEY

# Or Tavily (optimized for AI agents)
ghostpaw secrets set TAVILY_API_KEY

# Or Serper (Google results)
ghostpaw secrets set SERPER_API_KEY

# Or nothing — DDG works out of the box
```

Check what's active:

```bash
ghostpaw secrets
```

The `web_fetch` tool requires no configuration. It works immediately.
