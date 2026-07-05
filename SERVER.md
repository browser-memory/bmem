# bmem Skills API — server contract

The catalog server is a separate, **private** project (`bmem-catalog`, not published).
This file is the contract the public CLI depends on, so both sides stay in sync.

Stack (planned): Next.js on Vercel · Postgres/KV for the search index · the `SKILL.md`
bodies served from static/blob storage. Public, **read-only**, curated (no publish API).

Base URL: `https://bmem.sh` (CLI override: `BMEM_SKILLS_API_BASE_URL`).

## Endpoints

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| `GET` | `/api/skills?q=&site=` | none | Search / list. `q` omitted = list all. Returns `{ skills: [IndexEntry] }`. |
| `GET` | `/api/skills/{domain}/{task}/files` | none | **File manifest** for `bmem add`: `{ skillId, files: [{ path, url }] }`. `url` is an absolute blob URL. |
| `GET` | `<blob url>` | none | The actual file bytes (SKILL.md, etc.), served from blob storage. |
| `GET` | `/skills/{domain}/{task}.md` | none | Web/`llms.txt` surface — the rendered SKILL.md for humans & agents reading directly (NOT what `bmem add` uses). |
| `GET` | `/llms.txt` | none | Static discovery index (see below). |
| `GET` | `/llms-full.txt` | none | Same index but with every SKILL.md inlined. |
| `GET` | `/api/icon?domain=&sz=64` | none | Favicon (UI only). |

### IndexEntry (search result — keep it < ~300 tokens)

```json
{
  "name": "linkedin.com/search-people",
  "hostname": "linkedin.com",
  "task": "search-people",
  "slug": "linkedin-search-people",
  "side_effect": "read",
  "needs": ["navigate", "evaluate"],
  "intent": "Search people on LinkedIn, one or many queries with auto-pagination…",
  "keywords": ["linkedin", "search", "people"],
  "verified": true,
  "installCount": 1240
}
```

### Skill fetch: two hops (manifest → blob)

`bmem add linkedin.com/search-people`:

1. `GET /api/skills/linkedin.com/search-people/files` → `{ skillId, files: [{ path, url }] }`.
2. Download each `files[].url` (absolute blob URL) into the local cache
   (`~/.config/bmem/skills/{domain}/{task}/`, temp dir + atomic rename).
3. `npx --yes skills add <cachePath>` registers it natively.

> The `/skills/{domain}/{task}.md` direct URL exists too, but it's the **web / `llms.txt`
> surface** (rendered SKILL.md for reading). The CLI fetches via the manifest + blob —
> it supports multi-file skills and decouples storage from the API.

**Skill authoring requirement:** because registration is delegated to `skills add`, each
`SKILL.md`'s frontmatter must already carry a **native-valid `name`** (kebab, e.g.
`search-people`) and a `description`. The catalog id (`{domain}/{task}`) is the URL path,
not the frontmatter name (e.g. `name: search-people`, `site: linkedin.com`).

## Discovery surface: `llms.txt`

A static, cacheable, CLI-less index. An agent (or a human) can `curl bmem.sh/llms.txt`
and see the entire catalog with zero auth and zero install. Format:

```
# bmem — open catalog of web skills

## Skills
- [linkedin.com/search-people](https://bmem.sh/skills/linkedin.com/search-people.md): Search people on LinkedIn… (read-only)
- [reddit.com/search-posts](https://bmem.sh/skills/reddit.com/search-posts.md): Search Reddit posts… (read-only)
```

`llms-full.txt` is the same list with each SKILL.md inlined — one fetch for the whole
catalog when an agent wants everything in context.

> This is a cheap, high-leverage channel: it doubles as the "no CLI available" fallback
> and as an SEO/agent-discovery entrypoint. Generate both files from the same index that
> answers `/api/skills`.

## Open items for the catalog (not blocking the CLI)

- **Id disambiguation** — consider appending a short 6-char code (`…-axgs2u`) to skill
  names to avoid collisions and carry versioning. Decide whether `{domain}/{task}` is
  unique enough or we adopt the suffix.
- **`installCount`** — needs a telemetry pipeline; `verified` alone may be enough for MVP.
- **Curation / ingest** — skills land via the maintained catalog repo + a publish script
  (`skills/** → validate → storage + index`), not a public publish API.
