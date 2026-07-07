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

## Usage

```bash
bmem search <query>              # search the catalog, e.g. bmem search linkedin people
bmem search --site linkedin.com  # filter by site
bmem list [--limit 50]           # list the whole catalog
bmem show linkedin.com/search-people  # print a skill's SKILL.md without installing
bmem add linkedin.com/search-people   # download + register a skill natively
bmem install                     # register the bundled bmem meta-skill (bootstrap)
```

Start with `bmem install` — it registers a **meta-skill** that teaches your agent the
command surface plus how to map each skill's capabilities (`navigate`, `evaluate`, …)
to its own browser tools. After that, `bmem add <name>` makes a skill show up in the
agent's native skill list, and the agent invokes it directly.

`add` and `install` register skills by delegating to the standalone
[`skills`](https://www.npmjs.com/package/skills) installer (`npx skills add …`), which
detects your agent (Claude Code, Cursor, …) and writes to the right place — so `npx`
must be available.

## How a skill runs

A skill is a `SKILL.md`: YAML frontmatter (machine) + a browser-agnostic recipe. It
declares the **capabilities** it needs and ships the exact selectors — and, when
possible, the direct in-page XHR — so the agent skips reading a full DOM. Execution is
one path:

1. `navigate` to establish the session,
2. `evaluate` the skill's extractor (an in-page authenticated `fetch` + parse),
3. get back the JSON.

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

## License

MIT
