<p align="center">
  <a href="https://browser-memory.com">
    <img src="https://raw.githubusercontent.com/browser-memory/bmem/main/assets/logo.jpg" alt="bmem" width="140">
  </a>
</p>

<h1 align="center">browser-memory</h1>

<p align="center">
  <b>Open catalog of web skills for AI agents.</b><br>
  <a href="https://browser-memory.com">browser-memory.com</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/bmem-cli"><img src="https://img.shields.io/npm/v/bmem-cli.svg" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/bmem-cli.svg" alt="license"></a>
</p>

**Open catalog of web skills for AI agents.** Search reusable, battle-tested browser
recipes, add them as native agent skills, and run them with **whatever browser your
agent already has** — Playwright MCP, claude-in-chrome, browser-memory's `bm_*`, …

`bmem` is a thin, consume-only CLI (Node, no browser). It searches the catalog and
registers skills into your agent's native skill framework. It never drives a browser
and never sees your cookies — the agent runs the skill with its own browser, so the
session stays put.

> This is the public CLI. The skill catalog lives behind a separate read-only API:
> a light search endpoint plus a file manifest that points at blob storage.
> See [`SERVER.md`](./SERVER.md) for the API contract.

## Install

```bash
npm i -g bmem-cli
```

Requires Node.js 20 or newer.

## Usage

```bash
bmem search <query>              # search the catalog, e.g. bmem search linkedin people
bmem search --site linkedin.com  # filter by site
bmem list [--limit 50]           # list the whole catalog
bmem show linkedin.com/search-people  # print a skill's SKILL.md without installing
bmem add linkedin.com/search-people   # download + register a skill natively (global)
bmem update [name]               # re-fetch installed skills, re-register changed ones
bmem install                     # register the bundled bmem meta-skill (bootstrap)
```

Start with `bmem install` — it registers a **meta-skill** that teaches your agent the
command surface plus how to map each skill's capabilities (`navigate`, `evaluate`, …)
to its own browser tools. After that, `bmem add <name>` makes a skill show up in the
agent's native skill list, and the agent invokes it directly.

**`add` installs globally by default** (user-level), so every project sees the skill.
Pass `--no-global` to install it into the current project instead.

**`bmem update`** re-fetches your installed skills and re-registers only the ones whose
content actually changed (unchanged skills are skipped). With no name it updates
everything you added via bmem; pass a name to update a single skill.

`add` and `install` register skills by delegating to the standalone
[`skills`](https://www.npmjs.com/package/skills) installer (`npx skills add …`), which
detects your agent (Claude Code, Cursor, …) and writes to the right place — so `npx`
must be available.

## How a skill runs

A skill is a small folder — a `SKILL.md` plus an `evaluate.js`:

- **`SKILL.md`** — YAML frontmatter (machine-readable: the `needs` capabilities, `params`,
  `returns`, `version`) followed by a browser-agnostic recipe the agent follows. It points
  at the extractor via `extractor: evaluate.js`.
- **`evaluate.js`** — the extractor itself: an `async (root, params) => { … }` function
  that runs in the page (an authenticated in-page `fetch` + parse), so the agent skips
  reading a full DOM.

The extractor is stored once in the page's `localStorage` and reused on every later call,
gated by `version` — so it only passes through the model once:

1. `navigate` to establish the session,
2. call the stored extractor (params only); if it's missing or stale it reports
   `NEEDS_STORE`,
3. store `evaluate.js` once when needed, then call again → JSON back.

Cookies never leave the browser.

## Configuration

| Env var                     | Default          | Purpose                        |
| --------------------------- | ---------------- | ------------------------------ |
| `BMEM_SKILLS_API_BASE_URL`  | `https://browser-memory.com`| Skills API base (self-host)    |
| `BMEM_HOME`                 | `~/.config/bmem` | Local cache of added skills    |

## Development

```bash
npm install
npm run build      # tsup -> dist/
npm run typecheck
node dist/index.js search linkedin
```


## Sites

<p align="center">
  <a href="https://browser-memory.com/ecosystem/linkedin.com"><img src="https://browser-memory.com/sites/linkedin.com.svg" height="44" alt="LinkedIn — 14 skills"></a>
  <a href="https://browser-memory.com/ecosystem/x.com"><img src="https://browser-memory.com/sites/x.com.svg" height="44" alt="X — 7 skills"></a>
  <a href="https://browser-memory.com/ecosystem/github.com"><img src="https://browser-memory.com/sites/github.com.svg" height="44" alt="GitHub — 4 skills"></a>
  <a href="https://browser-memory.com/ecosystem/doordash.com"><img src="https://browser-memory.com/sites/doordash.com.svg" height="44" alt="DoorDash — 3 skills"></a>
  <a href="https://browser-memory.com/ecosystem/reddit.com"><img src="https://browser-memory.com/sites/reddit.com.svg" height="44" alt="Reddit — 3 skills"></a>
  <a href="https://browser-memory.com/ecosystem/airbnb.com"><img src="https://browser-memory.com/sites/airbnb.com.svg" height="44" alt="Airbnb — 2 skills"></a>
  <a href="https://browser-memory.com/ecosystem/amazon.com"><img src="https://browser-memory.com/sites/amazon.com.svg" height="44" alt="Amazon — 2 skills"></a>
  <a href="https://browser-memory.com/ecosystem/youtube.com"><img src="https://browser-memory.com/sites/youtube.com.svg" height="44" alt="YouTube — 2 skills"></a>
  <a href="https://browser-memory.com/ecosystem/booking.com"><img src="https://browser-memory.com/sites/booking.com.svg" height="44" alt="Booking.com — 1 skill"></a>
  <a href="https://browser-memory.com/ecosystem/ebay.com"><img src="https://browser-memory.com/sites/ebay.com.svg" height="44" alt="eBay — 1 skill"></a>
  <a href="https://browser-memory.com/ecosystem/yelp.com"><img src="https://browser-memory.com/sites/yelp.com.svg" height="44" alt="Yelp — 1 skill"></a>
</p>


## License

MIT
