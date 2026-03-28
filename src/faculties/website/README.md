# Website

Lean static site builder optimized for LLM-driven lifecycle management. The fitness system is the product — the build pipeline exists to serve it. Every rendered page produces structured, machine-actionable quality data across SEO, GEO, content intelligence, and voice compliance. An LLM can own the full create-edit-check-fix cycle without ever seeing a browser.

No admin UI. No framework. No plugin system. No database. One runtime dependency (`marked`). Everything is files on disk, managed exclusively through the read/write API surface.

## Content Model

```
project/
  site.json              # global config + metadata
  DOMAIN.md              # what this site is about (token-efficient LLM context)
  PERSONA.md             # voice, tone, style guide (pure markdown)
  assets/                # pass-through → dist/ as-is, root-mounted
    css/
      style.css          # → dist/css/style.css
    images/              # → dist/images/*
    fonts/               # → dist/fonts/*
    js/                  # → dist/js/*
    robots.txt           # → dist/robots.txt (root)
    favicon.svg          # → dist/favicon.svg (root)
    menu.pdf             # → dist/menu.pdf (root, any arbitrary file)
  templates/             # HTML component snippets
    base.html            # root layout (has {{{ content }}})
    page.html            # standard page layout (extends base)
    post.html            # blog post layout (extends base)
    faq.html             # FAQ component (Schema.org baked in)
    table.html           # data table component
    breadcrumb.html      # breadcrumb nav (Schema.org baked in)
  content/               # markdown + frontmatter → pages
    index.md             # → /index.html
    about.md             # → /about/index.html
    blog/
      _index.md          # → /blog/index.html (listing page)
      first-post.md      # → /blog/first-post/index.html
  data/                  # shared structured JSON
    nav.json             # navigation structure
    team.json            # reusable across pages
    site-links.json      # footer links, etc.
  dist/                  # build output (shippable)
```

### Routing

File path equals URL path. `content/about.md` becomes `/about/`. `content/blog/first-post.md` becomes `/blog/first-post/`. `_index.md` files become the directory's own index page.

### Asset Mounting

Every file in `assets/` maps 1:1 to `dist/` preserving its relative path. Files at the `assets/` root land at the `dist/` root — `assets/robots.txt` becomes `dist/robots.txt`, `assets/menu.pdf` becomes `dist/menu.pdf`. Subdirectories preserve structure. Any file type is valid: CSS, JS, images, fonts, PDFs, SVGs, JSON manifests, whatever the site needs.

### Ownership Principle

The system owns all files. Zero manual file intervention is assumed. All changes go through the read/write API surfaces. The scaffold creates the initial structure; after that, every modification — content, templates, data, assets, config, DOMAIN, PERSONA — happens through API calls. The system can detect and reconcile external changes by checking timestamps, but the canonical workflow is API-only. This makes the full lifecycle mechanically auditable and LLM-compatible.

---

## DOMAIN.md — Site Context

A brief (500–800 words) evergreen markdown document at the project root. Answers six questions:

1. **What is this website about?** — core topic, industry, niche
2. **Who is it for?** — target audience, their problems, their goals
3. **What is the value proposition?** — why this site exists, what it offers
4. **What are the main content areas?** — topics, sections, content types
5. **What distinguishes it?** — competitive angle, unique perspective, expertise
6. **What is the primary action?** — what visitors should do: buy, contact, subscribe, learn

Any LLM reads DOMAIN.md once and understands the entire site without reading all content pages. This is always the first context injected for any tool call — generation, editing, fitness interpretation, or planning. Roughly 1000 tokens replaces 50,000+ tokens of raw content scanning.

The fitness system checks that DOMAIN.md exists, is non-trivial (>200 words), and is not stale (warn if >6 months unmodified).

For humans, it serves as the orientation brief for any writer, designer, or collaborator who joins the project.

---

## PERSONA.md — Voice & Style Guide

A markdown document at the project root defining how all content on this site should sound. Serves dual duty:

1. **For humans**: a style guide any writer can follow
2. **For LLMs**: injected as-is into context for all write/edit operations so generated content matches the brand voice

### Recommended Structure

```markdown
# Voice

## Archetype

[Concrete behavioral identity, not vague adjectives.
e.g., "Experienced craftsman explaining their trade to a curious friend"
NOT "professional yet approachable"]

## Tone Dimensions

Funny ←→ Serious: [1-5]
Formal ←→ Casual: [1-5]
Respectful ←→ Irreverent: [1-5]
Enthusiastic ←→ Matter-of-fact: [1-5]

## Vocabulary

### Preferred Terms

[Words and phrases that define the brand voice]

### Banned Terms

[Words and phrases to never use]

### Jargon Policy

[Whether technical terms are OK, whether to define them on first use]

## Sentence Style

- Target readability: [Flesch-Kincaid grade range, e.g., "8-10"]
- Contractions: [yes/no/sometimes]
- Active voice: [preferred/required/no preference]
- Sentence variety: [target burstiness — "mix short punchy with longer explanatory"]
- Addressing: [you/we/one/they — how to refer to the reader]

## Formatting

- Lists: [when to use, bullet vs. numbered]
- Bold/italic: [policy]
- Emoji: [never/sparingly/freely]
- Headers: [style — question format, statement, noun phrase]

## Examples

### Good

[2-3 short passages (50-100 words each) that nail the voice]

### Bad

[1-2 short passages showing what to avoid]
```

### PERSONA.md Is Not Parsed

PERSONA.md is a markdown file. It is never parsed into structured data. It is injected as-is into LLM context for write/edit operations, and read by humans as a style guide.

The **mechanical enforcement** of voice quality (banned word scanning, readability thresholds, burstiness checks) lives in `site.json` under `fitness.voice`. This cleanly separates concerns: PERSONA.md tells the LLM and human *how* to write; `site.json` tells the fitness system *what* to check mechanically. The default `fitness.voice` config ships with sensible language-specific defaults that the operator can customize.

### Context Assembly for LLM Tool Calls

When an LLM calls any tool:

```
Always injected:  DOMAIN.md (~1000 tokens)
Write operations: + PERSONA.md (~800 tokens)
Page editing:     + target page source + its fitness issues
Site planning:    + getStructure() compact output
Fitness check:    returns structured data (not prose)
```

Total context overhead for a write operation: ~1800 tokens. The transparency principle: **everything the LLM sees, the human can see.** Both files are plain markdown on disk. There is no hidden prompt injection — the operator controls every word of context.

---

## Scaffold

A `scaffold(dir)` function bootstraps a new website folder from scratch — minimal but immediately buildable and passing basic fitness checks.

```
project/
  site.json              # name, url (localhost default), language
  DOMAIN.md              # template with 6 question prompts to fill in
  PERSONA.md             # template with recommended structure
  assets/
    css/
      style.css          # clean minimal stylesheet (modern reset, variables, responsive)
    images/
    robots.txt           # allows all crawlers, references sitemap
    favicon.svg          # placeholder
  templates/
    base.html            # HTML5 shell: doctype, head (meta, OG, canonical slots), body, {{{content}}}
    page.html            # extends base, wraps content in <main> with <h1>
    post.html            # extends base, Article schema, author byline, date, <article> wrapper
    nav.html             # partial: renders data.nav as <nav> with links
    footer.html          # partial: site name, year, nav links
  content/
    index.md             # homepage: title, description, layout: page
    about.md             # about page: layout: page
  data/
    nav.json             # [ { "label": "Home", "href": "/" }, { "label": "About", "href": "/about/" } ]
```

Immediately after scaffold, `build()` produces a working `dist/` with two pages, correct meta tags, canonical URLs, OG tags, auto-generated sitemap.xml, and the robots.txt from assets. Fitness score should be >80 out of the box — only gaps are DOMAIN.md and PERSONA.md still having placeholder content (info-level issues, not errors).

The scaffold is the only way to create the initial structure. After that, all modifications go through the API.

---

## Template Engine

Custom, zero-dep, Mustache-inspired. Minimal surface, fully sufficient:

- `{{ var }}` — HTML-escaped interpolation
- `{{{ var }}}` — raw HTML (rendered markdown, pre-built components)
- `{{> "partial.html" }}` — include a template snippet
- `{{#each items as item}} ... {{/each}}` — iteration with scoped binding
- `{{#if condition}} ... {{else}} ... {{/if}}` — conditional
- Dot notation: `{{ site.name }}`, `{{ page.title }}`, `{{ data.team }}`

**Layout chain**: Frontmatter `layout: "page.html"` → page.html declares `layout: "base.html"` → base.html is the root. Each layout has `{{{ content }}}` where child output slots in. Chain resolves bottom-up.

**Template context** merges in priority order:

1. Page frontmatter (highest priority)
2. Data files (`data.*`)
3. Site config (`site.*`)
4. Computed values: `page.url`, `page.path`, `page.collection`, `build.timestamp`, auto-generated `collections.*`

---

## YAML Frontmatter Parser

Custom subset parser for the frontmatter use case only. Supports:

- Scalars: strings (quoted/unquoted), numbers, booleans, null
- Arrays: `- item` block syntax and `[inline]` syntax
- Nested objects: indented key-value pairs
- Multiline strings: `|` (literal) and `>` (folded)

Does NOT need: anchors/aliases, tags, complex keys, merge keys, or any YAML 1.2 edge cases. Frontmatter is simple structured metadata.

---

## Build Pipeline

```mermaid
flowchart LR
  subgraph discover [1 Discover]
    ScanContent[Scan content/]
    ScanTemplates[Scan templates/]
    ScanData[Scan data/]
    ScanAssets[Scan assets/]
  end
  subgraph parse [2 Parse]
    Frontmatter[Extract frontmatter]
    PageIndex[Build page index]
    Collections[Resolve collections]
  end
  subgraph render [3 Render]
    Markdown[MD to HTML via marked]
    TemplateCtx[Build context]
    LayoutChain[Resolve layout chain]
    Execute[Execute template engine]
    AutoInject[Auto-inject meta/schema]
  end
  subgraph finalize [4 Finalize]
    Sitemap[Generate sitemap.xml]
    CopyAssets[Copy assets/ to dist/]
    Manifest[Write .build-manifest.json]
    WriteDist[Write dist/]
  end
  subgraph check [5 Check]
    Fitness[Run fitness analyzers]
    Report[Structured report]
  end
  discover --> parse --> render --> finalize --> check
```

### Auto-Inject (Step 3)

The build pipeline automatically injects elements the fitness system would otherwise flag:

- Canonical URL (`<link rel="canonical">`) from page path + site URL
- OG/Twitter meta tags from frontmatter (`title`, `description`, `og_image`)
- JSON-LD `<script>` blocks when `schema_type` is set in frontmatter
- Breadcrumb JSON-LD from directory structure
- `lang` attribute from site config

### Finalize (Step 4)

- `sitemap.xml` is always auto-generated from the page index (dynamic, reflects current structure)
- `robots.txt` comes from `assets/robots.txt` (managed through write API, scaffold creates the default)
- Assets are copied 1:1 preserving paths
- `.build-manifest.json` is written to the project root tracking content hashes and timestamps for incremental rebuilds

Use the scaffold templates, fill in frontmatter, and get valid SEO/GEO signals automatically. Fitness checks catch anything the auto-inject couldn't infer.

---

## Fitness System

19 analyzer dimensions across 4 tiers. Each analyzer is a small focused function with an `applies` gate — it checks whether it's relevant before running. No business-type configuration needed; the schema and content *are* the configuration.

### Analyzer Architecture

```typescript
type Analyzer = {
  id: string;
  dimension: string;
  weight: number;
  applies: (ctx: SiteContext) => boolean;
  analyze: (ctx: SiteContext) => Issue[];
};

type SiteContext = {
  pages: RenderedPage[];
  linkGraph: LinkGraph;
  tfidf: TfidfIndex;
  assets: AssetIndex;
  config: SiteConfig;
  domain: string;
  persona: string;
  language: LanguageKit;
  searchConsole?: GscData;
};
```

The TF-IDF index builds once per analysis run (tokenize all pages, compute vectors, pairwise similarity matrix), then multiple analyzers read from it.

### Report Shape

```typescript
type FitnessReport = {
  timestamp: number;
  overall: number;
  dimensions: Record<string, DimensionScore>;
  pages: Record<string, PageScore>;
  clusters: TopicalCluster[];
  cannibalization: CannibalizationPair[];
  dryRun?: DryRunDiff;
};

type DimensionScore = {
  score: number;
  passed: number;
  failed: number;
  issues: Issue[];
};

type PageScore = {
  url: string;
  score: number;
  issues: Issue[];
  readability: ReadabilityScores;
  wordCount: number;
  tfidfTopTerms: string[];
};

type ReadabilityScores = {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
};

type Issue = {
  severity: "error" | "warning" | "info";
  dimension: string;
  code: string;
  message: string;
  page: string;
  element?: string;
  current?: string;
  expected?: string;
  fix?: FixSuggestion;
};

type FixSuggestion = {
  file: string;
  action: "set_frontmatter" | "add_content" | "update_content"
        | "update_template" | "add_asset" | "create_file"
        | "merge_into" | "redirect" | "remove";
  field?: string;
  value?: string;
  target?: string;
};

type CannibalizationPair = {
  pageA: string;
  pageB: string;
  similarity: number;
  cosineSim: number;
  titleSim: number;
  descSim: number;
  sharedTerms: string[];
  suggestion: "merge" | "differentiate" | "redirect" | "review";
};

type TopicalCluster = {
  id: string;
  pillar?: string;
  pages: string[];
  coherence: number;
  missingPillar: boolean;
  orphans: string[];
};

type DryRunDiff = {
  before: { overall: number; pages: Record<string, number> };
  after: { overall: number; pages: Record<string, number> };
  newCannibalization: CannibalizationPair[];
  resolvedCannibalization: CannibalizationPair[];
  affectedPages: string[];
};
```

Every issue carries a `fix` that maps directly to a write API call. The LLM reads the fitness report, iterates over issues, calls `writePage` or `writeTemplate` with the suggested fix, rebuilds, and checks again.

---

### Tier 1 — Always-On Analyzers

These run on every site, every page.

**1. `seo_meta`** — Page-level meta tag signals

- Title tag: exists, 50–60 chars, unique across site, primary keyword front-loaded
- Meta description: exists, 155–160 chars, unique, contains CTA language
- Canonical URL: present, self-referencing, absolute
- Viewport meta tag present
- Charset declaration (UTF-8)
- `<html lang>` attribute set and matches `site.json` language
- robots meta: respects frontmatter `noindex`/`nofollow`

**2. `seo_structure`** — Content structure for crawlers

- Exactly one `<h1>` per page, contains target keyword if specified in frontmatter
- Heading hierarchy: no skipped levels (h1→h3 without h2)
- Headings are descriptive (flag generic "Introduction", "Conclusion")
- URL slugs: lowercase, hyphenated, no special characters, no double hyphens
- First paragraph relevance: contains page topic if `keyword` set in frontmatter

**3. `content_quality`** — Readability and depth scoring

- Word count thresholds by page type (detected from layout or frontmatter): blog 1000+, guide 2000+, product 300+, page 500+
- Readability: language-appropriate formula. English uses Flesch-Kincaid; German uses Flesch-DE with adapted coefficients; others use per-language kit formulas. Gunning Fog where applicable.
- Content-to-boilerplate ratio (unique content vs. repeated template chrome)
- Paragraph density: flag walls of text (>300 words without a heading/list/image break)
- Structural variety: presence of lists, tables, images, blockquotes (not just prose)
- Content freshness: `dateModified` vs. current date, flag pages >6 months stale, >12 months critical

**4. `images`** — Image optimization

- Every `<img>` has non-empty, descriptive `alt` text (not filename-like "IMG_1234", not duplicate across images)
- File size: warn >500KB, error >2MB
- Modern format preference: suggest WebP/AVIF when JPEG/PNG detected
- `width`/`height` attributes set on all images (prevents CLS)
- LCP candidate detection: above-fold images must NOT have `loading="lazy"`; below-fold images SHOULD
- Responsive: `srcset`/`sizes` attributes present for key images
- Descriptive filenames: hyphenated, lowercase

**5. `links`** — Internal link graph analysis

- Every internal `href` resolves to an existing page
- Orphan detection: pages with zero incoming internal links
- Crawl depth: every page reachable within 3 clicks from homepage (BFS from index)
- Anchor text diversity: flag over-use of exact-match keywords, generic "click here"/"read more"
- Anchor text relevance: link text should relate to target page topic
- Bidirectional cluster links: pages in same directory/topic should link to each other
- No self-referential links
- Anchor links (`#id`) resolve to existing element IDs on target page
- External links on `target="_blank"` have `rel="noopener noreferrer"`
- Link equity flow: pillar/hub pages should receive the most internal links
- Topical cluster structure: detect pillar-cluster patterns, flag broken cluster links

**6. `social`** — Social sharing meta

- `og:title`, `og:description`, `og:image`, `og:url`, `og:type` all present
- `og:image` path resolves to existing asset, recommended 1200x630 minimum
- `twitter:card` (summary_large_image preferred), `twitter:title`, `twitter:description`, `twitter:image`
- Consistency: OG title/description align with page title/description
- No contradictions between OG metadata and visible page content

**7. `sitemap_robots`** — Crawl infrastructure

- `sitemap.xml` exists, valid XML, all indexable pages included
- No `noindex` pages in sitemap (contradictory signals)
- Accurate `lastmod` dates (match actual file modification times)
- `robots.txt` exists, references sitemap URL
- No important pages accidentally blocked in robots.txt
- AI crawler directives: GPTBot, ClaudeBot, PerplexityBot explicitly allowed or blocked (intentional)

**8. `technical`** — HTML and asset quality

- Valid HTML5 doctype
- No duplicate `id` attributes on same page
- No inline `<style>` or `<script>` in content files (should be in assets/)
- All asset references (`src`, `href` to CSS/JS/images) resolve to existing files
- External links have `rel="noopener"` when `target="_blank"`
- Font loading: critical fonts preloaded, `font-display: swap` or `optional`
- Total page weight estimate: HTML + linked CSS + linked JS + images
- Number of HTTP requests (CSS files, JS files, images referenced)
- Critical CSS: detect whether above-fold styles are inlined or require extra round-trip
- 404 page exists

---

### Tier 2 — Content Intelligence

The TF-IDF engine is the most valuable mechanical analysis. It requires zero external APIs — the corpus IS the site itself.

**Pipeline**:

1. Strip HTML from all rendered pages → pure text
2. Tokenize: split words, lowercase, filter stopwords using the language kit for `site.json` `language`. Ships with stopword lists for en, de, fr, es, it, pt, nl, and more — extensible.
3. Compute WDF\*IDF vectors per page: `WDF = log2(freq+1) / log2(docLength)`, `IDF = log2(totalDocs / docsWithTerm)`
4. Build pairwise cosine similarity matrix (all pages × all pages)
5. Compute Levenshtein distance (normalized 0–1) on all title pairs and description pairs

**9. `cannibalization`** — Content overlap detection

- Combined similarity score: `0.7 * cosineSim + 0.2 * titleSim + 0.1 * descSim`
- Warning threshold: >0.7 (pages may compete for same queries)
- Error threshold: >0.85 (strong cannibalization)
- For each flagged pair: report shared distinctive terms, suggest merge (with redirect), differentiate (shift focus keyword), or remove
- Title near-duplicates: flag titles with Levenshtein similarity >0.8
- Description near-duplicates: flag descriptions with Levenshtein similarity >0.8
- Optional GSC integration: detect URL flickering (multiple URLs alternating for same query)

**10. `topical_clusters`** — Content topology analysis

- Group pages into clusters by similarity bands (hierarchical agglomerative clustering on TF-IDF vectors)
- Detect clusters missing a pillar page (no broad hub, only narrow supporting pages)
- Detect over-saturated clusters (too many pages with similarity >0.6)
- Detect orphan topics (pages that don't fit any cluster)
- Cross-reference with link graph: cluster pages should link to each other and to their pillar
- Suggest: "your /blog/ cluster needs a pillar page about X" or "these 3 pages about Y should be consolidated"
- Page count balance: flag clusters with only 1 supporting page (too thin) or >15 (may need splitting)

**11. `content_tfidf`** — Per-page term distinctiveness

- Top 10 distinctive terms per page (highest WDF\*IDF scores)
- Flag pages with no distinctive terms (generic/thin content)
- Flag pages where top terms don't match frontmatter `keyword` (misalignment)
- Term gap: important terms present in cluster siblings but absent from this page
- Over-optimization: flag if any single term exceeds natural density threshold

---

### Tier 3 — Schema-Aware Analyzers

These check `applies()` and only run when their schema type or content pattern is present. A restaurant site has Restaurant schema → local SEO checks activate. A blog has Article schema → E-E-A-T checks activate. No configuration needed.

**12. `schema_validation`** — Structured data correctness

- JSON-LD `<script type="application/ld+json">` is valid JSON
- Required properties present per detected `@type`:
  - **FAQPage**: `mainEntity` array, each with `name` + `acceptedAnswer.text`; cross-validate against rendered h2/answer pairs
  - **Article/BlogPosting**: `headline`, `author`, `datePublished`, `image`, `publisher`
  - **LocalBusiness/Restaurant**: `name`, `address`, `telephone`, `openingHoursSpecification`, `menu`, `servesCuisine`, `priceRange`
  - **Event**: `name`, `startDate`, `location`, `description`
  - **Recipe**: `name`, `recipeIngredient[]`, `recipeInstructions[]`, `cookTime`, `image`
  - **HowTo**: `name`, `step[]` each with `text`
  - **Product**: `name`, `offers`, `aggregateRating`
  - **BreadcrumbList**: items match actual page hierarchy from directory structure
  - **Organization/WebSite**: on homepage, consistent `name`/`url`/`logo` across all pages
- No conflicting `@type` values on same page
- Date formats: valid ISO 8601
- Cross-page entity consistency: Organization entity identical everywhere it appears

**13. `geo`** — Generative Engine Optimization signals

- AI crawler access: `robots.txt` directives for GPTBot, ClaudeBot, PerplexityBot (flag if blocked unintentionally)
- Direct answer patterns: sections with interrogative headings followed by concise answer in first 1–2 sentences
- Citation markup: `<blockquote>` elements have `<cite>` or `data-source` attribution
- Statistical claims backed by data: numbers in prose cross-referenced with tables/lists
- Summarizability: clear topic sentence per section (first sentence should standalone)
- Content freshness signals: `dateModified` in JSON-LD, visible "Updated [date]" text near headline
- Structured extraction: FAQ, table, and list content that AI models can directly parse
- Entity-rich content: proper nouns, organizations, locations mentioned with context

**14. `eeat`** — Experience, Expertise, Authoritativeness, Trustworthiness

- Applies when Article/BlogPosting schema detected, or page layout is `post.html` or similar
- Author byline: present on article pages, links to author page
- Author page: exists, has Person schema, includes credentials/bio
- Citations: external links to authoritative sources (not just internal links)
- First-hand language markers: detect phrases like "we tested", "in our experience", "I measured"
- Contact information: accessible from every page (footer, dedicated page)
- Privacy policy page exists
- Terms of service page exists
- HTTPS enforcement (check `site.url` starts with `https://`)
- `datePublished` and `dateModified` present on articles

**15. `local_seo`** — Local business signals

- Applies when LocalBusiness (or any subtype like Restaurant, Dentist, etc.) schema detected
- NAP consistency: Name, Address, Phone identical across all pages (footer, contact, schema)
- Structured opening hours in schema
- Service area or geo coordinates present
- Google Maps link or embedded map
- Restaurant-specific: menu link, reservation link (OpenTable, etc.), cuisine type, price range
- Review/rating schema: `aggregateRating` present if applicable

**16. `multilingual`** — International SEO

- Applies when `hreflang` tags detected or `site.json` specifies multiple languages
- Every language variant has self-referencing `hreflang`
- Bidirectional hreflang: if A→B then B→A
- `x-default` specified for language negotiation
- Each language page has its own canonical URL (not pointing to primary language)
- Content actually differs between language versions (flag identical content across languages)

---

### Tier 3b — Voice & Anti-Slop

**17. `voice_compliance`** — Voice quality and AI slop detection

Mechanical checks driven by `site.json` `fitness.voice` config merged with language-specific defaults. PERSONA.md is not parsed — the fitness system checks rendered output mechanically using config values.

All thresholds, word lists, and phrase lists are **language-keyed**. The package ships with defaults for major languages (en, de, fr, es, it, pt, nl). Each language kit includes: stopwords, known AI slop words/phrases for that language, hedging phrases, transition words, readability formula coefficients, and syllable counting rules.

- **Banned word/phrase scan**: every occurrence of a banned term (language defaults + `fitness.voice.bannedWords` + `fitness.voice.bannedPhrases`) flagged with exact page, paragraph, and suggested replacement
- **Sentence burstiness**: `stddev(sentenceLengths) / mean(sentenceLengths)` — coefficient of variation. Flag if below `fitness.voice.burstinessMin` (default: 0.3, AI-like monotone). Human writing typically scores 0.4–0.7.
- **Vocabulary richness**: Moving Average Type-Token Ratio (MATTR, window=50 words) — flag if <0.7 (low lexical diversity). Hapax legomena ratio (words used exactly once / total unique words) — healthy text has >40% hapax.
- **Hedging density**: count language-specific hedging phrases as percentage of total sentences. Flag if exceeds `fitness.voice.hedgingMaxPercent` (default: 2).
- **Transition overuse**: flag if sentence-initial transition density exceeds `fitness.voice.transitionMaxPercent` (default: 3). Uses language-specific transition word list.
- **Readability target**: compare actual readability score against `fitness.voice.readabilityRange`. Uses language-appropriate formula.
- **Active voice ratio**: estimate active vs. passive constructions using language-specific patterns.

Every fix is actionable: "Line 47: replace 'delve into' with 'explore' or 'examine'" or "Burstiness 0.22 — split the 3 consecutive 18-word sentences in paragraph 4 into varied lengths."

---

### Tier 4 — Impact Analysis

**18. `dry_run`** — Preview changes before committing

- Activated by calling `dryRun(changes)` from the read surface
- Renders proposed changes in memory alongside existing site
- Recomputes TF-IDF vectors including new/changed pages
- Re-runs pairwise cannibalization on the new corpus
- Produces `DryRunDiff`:
  - Overall fitness score before vs. after
  - Per-page score changes
  - New cannibalization pairs introduced by the change
  - Cannibalization pairs resolved by the change
  - List of affected pages (pages whose link graph, cluster membership, or scores change)
- Internal link impact: which pages gain/lose incoming links from the change
- Schema impact: does structured data remain valid after the change

**19. `search_console`** — External performance data integration (optional)

- Activated when GSC/Bing data provided as JSON to `fitness({ searchConsole: data })`
- **Underperforming pages**: high impressions + low CTR → title/description not compelling
- **Declining pages**: position or clicks trending down over 4+ weeks → freshness or content problem
- **URL flickering**: multiple URLs alternating for same query → mechanical proof of cannibalization (cross-reference with TF-IDF pair)
- **Content gaps**: queries generating impressions but no dedicated page → suggest creating new page with specific topic
- **Keyword opportunities**: high-impression + low-position queries → optimization targets
- **CTR benchmarking**: expected CTR by position (pos 1: ~30%, pos 2: ~15%, pos 3: ~10%) — flag pages significantly below expected CTR for their position
- All suggestions include machine-actionable fixes referencing specific pages and frontmatter fields

---

### Language Kits

All text analysis is language-aware. The `language` field in `site.json` (BCP 47 tag) determines which language kit is loaded.

Each language kit provides:

- **Stopword list** for TF-IDF tokenization
- **AI slop blocklist** (language-specific words and phrases with high LLM-overuse signal)
- **Hedging phrases** (language-specific qualifiers and filler)
- **Transition words** (language-specific formal connectives)
- **Readability coefficients** (Flesch formula variants differ by language)
- **Syllable counting rules** (language-specific phonological patterns)

Ships with kits for: en, de, fr, es, it, pt, nl. Extensible — adding a new language means providing one data file per kit component.

**English AI slop defaults** (with approximate overuse multiplier):

Words: delve (48x), leverage, landscape, tapestry, multifaceted, pivotal, transformative, holistic, robust, nuanced, paradigm, synergy, beacon, cornerstone, embark, foster, underscore, realm, intricate, comprehensive, utilize, facilitate, actionable, empower, seamless, navigate

Phrases: "it's important to note" (27x), "it's worth noting" (31x), "in today's digital age" (24x), "in the realm of" (22x), "it goes without saying" (14x), "at the end of the day" (12x), "when it comes to" (10x), "serves as a testament", "stands as a", "not just X, but also Y", "in conclusion"

Other languages ship with equivalent blocklists targeting their language-specific LLM output patterns.

---

## Anti-Duplication: Building Blocks

Templates encode domain knowledge (correct Schema.org markup, accessible table structure, proper citation format). Data files hold the facts. Content authors compose these without understanding the underlying markup requirements.

**Example — FAQ page:**

- `data/product-faq.json` holds question/answer pairs
- `templates/faq.html` renders them with FAQPage Schema.org, proper `<h2>` structure, `itemprop` attributes
- `content/faq.md` includes the template via `{{> "faq.html"}}`
- Fitness auto-validates: JSON-LD matches rendered HTML, heading hierarchy correct, schema complete

**Example — Event listing:**

- `data/events.json` holds event details (name, date, location, description)
- `templates/event-list.html` renders with Event Schema.org, proper `<time>` elements
- Any page can include `{{> "event-list.html"}}` to get a correct event listing

**Collections**: Pages in the same directory auto-form a collection. `content/blog/_index.md` can access `collections.blog` — an array of all sibling pages sorted by date. No manual index maintenance.

---

## Public API Surfaces

### read

| Function | Returns |
|---|---|
| `getConfig()` | Parsed site.json |
| `getDomain()` | DOMAIN.md raw markdown |
| `getPersona()` | PERSONA.md raw markdown |
| `listPages(filter?)` | Page index: path, url, frontmatter summary, word count, readability |
| `getPage(path)` | Full source: frontmatter + markdown + rendered HTML + TF-IDF top terms |
| `listTemplates()` | Template names and dependencies |
| `getTemplate(name)` | Template source HTML |
| `listData()` | Data file names and shapes |
| `getData(name)` | Parsed JSON content |
| `listAssets(filter?)` | Asset inventory: path, size, mime type, mount path in dist/ |
| `getAsset(path)` | Asset content (text) or metadata (binary: size, hash, mime type) |
| `getStructure()` | Site tree: page hierarchy + internal link graph + clusters + collections |
| `fitness(opts?)` | Run all or scoped fitness analyzers, return full FitnessReport |
| `fitnessPage(path)` | Fitness for one page only (fast single-page feedback) |
| `fitnessHistory()` | Score trend from .fitness-history.json (last N builds) |
| `dryRun(changes)` | Preview impact of proposed changes without writing to disk |

### write

| Function | Effect |
|---|---|
| `writeConfig(partial)` | Merge partial update into site.json |
| `writeDomain(content)` | Create or update DOMAIN.md |
| `writePersona(content)` | Create or update PERSONA.md |
| `writePage(path, frontmatter, markdown)` | Create or update a content page |
| `deletePage(path)` | Remove a page |
| `writeTemplate(name, html)` | Create or update a template |
| `deleteTemplate(name)` | Remove a template |
| `writeData(name, json)` | Create or update a data file |
| `deleteData(name)` | Remove a data file |
| `writeAsset(path, content)` | Create or update a static asset (text or Buffer for binary) |
| `deleteAsset(path)` | Remove an asset |

### build

| Function | Effect |
|---|---|
| `scaffold(dir)` | Bootstrap a new site folder (minimal, working) |
| `build(opts?)` | Full static build to dist/ + fitness report |
| `preview(path)` | Render one page in-memory (no disk write) |
| `serve(opts?)` | Start local HTTP server on dist/ |
| `stop()` | Stop preview server |
| `clean()` | Remove dist/ and .build-manifest.json |

---

## Dev Server

Built on `node:http`. Serves `dist/`, watches source directories, auto-rebuilds on change:

- File watcher on `content/`, `templates/`, `data/`, `assets/`, `site.json`
- Incremental rebuild: only re-render affected pages when a content file changes; full rebuild when templates or data change
- SSE-based livereload: injects a small `<script>` in dev mode that auto-refreshes on rebuild
- Terminal output after each rebuild: page count, build time, fitness score summary, top issues
- The dev server is an optional convenience — the package works fine as pure build-only

---

## Configuration

### `site.json`

```typescript
type SiteConfig = {
  name: string;
  url: string;
  language: string;
  languages?: string[];
  description?: string;
  author?: string;
  logo?: string;
  socials?: Record<string, string>;
  defaultLayout?: string;
  build?: {
    cleanUrls?: boolean;
    trailingSlash?: boolean;
    minifyHtml?: boolean;
  };
  fitness?: {
    ignore?: string[];
    thresholds?: Record<string, number>;
    voice?: {
      bannedWords?: string[];
      bannedPhrases?: string[];
      readabilityRange?: [number, number];
      burstinessMin?: number;
      hedgingMaxPercent?: number;
      transitionMaxPercent?: number;
    };
  };
};
```

### File-Based State

Everything is files. No database, no external state.

- **Build manifest** (`.build-manifest.json`): Content hashes + timestamps for every source file. Used for incremental rebuilds — only re-render pages whose source (or dependent templates/data) changed since last build. Written by `build()`, read on next `build()`.
- **Fitness history** (`.fitness-history.json`): Append-only log of past fitness reports (timestamp + overall + per-dimension scores). A new entry is appended on every `build()` call. Standalone `fitness()` calls do not append — only builds create history entries. Enables trend analysis. Capped to last 100 entries. Readable via `fitnessHistory()` in the read surface.
- **TF-IDF index**: Recomputed in-memory on each `fitness()` call. No persistence needed.

Both manifest files live at the project root, are gitignore-able, and are managed entirely by the system.

```typescript
type BuildManifest = {
  lastBuild: number;
  files: Record<string, { hash: string; mtime: number }>;
};

type FitnessHistory = {
  entries: Array<{
    timestamp: number;
    overall: number;
    dimensions: Record<string, number>;
    pageCount: number;
  }>;
};
```

---

## Dependencies

- **Runtime**: `marked` — markdown to HTML rendering
- **Node.js built-ins**: `node:fs`, `node:path`, `node:http`, `node:crypto`
- **Custom**: template engine, YAML frontmatter parser, HTML tag extractor, TF-IDF engine, readability scorer, voice analyzer, fitness analyzers, dev server, build pipeline, language kits

---

## Optional Agent Integration

The package can expose `tools`, `skills`, and `soul` for LLM integration.

**Tools** (5, mapping to surfaces):

- `site_read` — inspect pages, templates, data, structure
- `site_write` — create/update/delete content, templates, data, assets
- `site_build` — build, preview single page, serve/stop dev server
- `site_check` — fitness checking with scope selection, returns structured issues with fix suggestions
- `site_plan` — dry-run impact analysis: propose changes, see fitness diff, cannibalization impact, affected pages before committing

The `site_plan` → `site_check` → `site_write` → `site_check` loop is the core LLM workflow.

**Skills** (procedural markdown):

- `create-page-well` — how to write good frontmatter + content that passes fitness checks
- `seo-checklist` — SEO patterns the fitness system validates, with examples
- `geo-optimization` — GEO patterns for AI search visibility, citation markup, structured answers
- `template-composition` — how to use building blocks and data files to avoid duplication
- `site-launch-checklist` — pre-launch fitness threshold targets per dimension
- `content-cannibalization` — how to interpret similarity scores and resolve overlaps
- `search-console-workflow` — how to ingest GSC/Bing data and act on the analysis

**Soul**: A site-builder specialist persona that understands web publishing, SEO/GEO principles, and the fitness-driven workflow. Knows when to check fitness, how to interpret scores, and how to prioritize fixes by impact.

---

## What Makes This Different

1. **Fitness-first**: The build pipeline exists to serve the fitness system. Quality feedback is the primary output; HTML files are the secondary output.
2. **LLM-native**: Every API returns structured data. Every error has a machine-actionable fix. The tool surface IS the CMS.
3. **Content intelligence without external APIs**: TF-IDF, cosine similarity, Levenshtein, readability scoring, topical clustering — all computed locally from the site's own corpus. No API keys, no rate limits, no cost.
4. **Correct by default**: Templates encode SEO/GEO knowledge. Use the building block, get correct markup automatically.
5. **Dry-run before commit**: Preview any change's impact on fitness scores, cannibalization, and link graph before writing to disk.
6. **Schema-driven activation**: No business-type configuration. The analyzers detect what's present and validate accordingly.
7. **Domain-agnostic**: A restaurant, a dev blog, and a company website all use the same package. The building blocks carry the domain knowledge, not the engine.
8. **Multi-language from day one**: All text analysis — stopwords, readability, slop detection, syllable counting — is language-keyed. Ships with kits for major European languages, extensible.
9. **Zero framework, zero database**: No React, no hydration, no build toolchain, no SQLite. Pure files on disk.
10. **Scaffold to ship**: `scaffold()` creates a fully functional site in seconds. Immediately buildable, immediately passing fitness checks.
11. **System-owned files**: All changes flow through the read/write API. The full lifecycle is mechanically auditable.
12. **Optional real-world grounding**: When GSC/Bing data is provided, the fitness system crosses the gap from static analysis to performance-informed optimization.
