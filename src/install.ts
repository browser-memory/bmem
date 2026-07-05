import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fetchBinary, getManifest } from "./api.js";
import { BMEM_SKILLS_DIR } from "./paths.js";

export interface SkillId {
  domain: string;
  task: string;
  id: string;
}

// Validate & split "<domain>/<task>", guarding against path traversal.
// Skills are keyed by site ("linkedin.com"); a legacy per-task form
// ("linkedin.com/search-people") is still accepted.
export function parseSkillId(raw: string): SkillId {
  const parts = raw.split("/").filter(Boolean);
  if (
    raw.includes("\\") ||
    parts.length < 1 ||
    parts.length > 2 ||
    parts.some((s) => s === "." || s === "..")
  ) {
    throw new Error(`invalid skill id "${raw}". Use <site> or <site>/<task>.`);
  }
  const [domain, task = ""] = parts;
  return { domain, task, id: parts.join("/") };
}

// Download every file of a skill into the local cache. Writes to a temp dir and
// atomically renames, so a failed download never leaves a half-written skill.
export async function downloadSkill(id: SkillId): Promise<string> {
  const manifest = await getManifest(id.id); // throws HttpError(404) if unknown
  const installPath = join(BMEM_SKILLS_DIR, ...id.id.split("/"));
  const parent = dirname(installPath);
  await mkdir(parent, { recursive: true });

  const tmp = await mkdtemp(join(parent, `.${id.domain}-`));
  try {
    for (const file of manifest.files) {
      const bytes = await fetchBinary(file.url);
      const out = join(tmp, file.path);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, bytes);
    }
    await rm(installPath, { recursive: true, force: true });
    await rename(tmp, installPath);
  } catch (err) {
    await rm(tmp, { recursive: true, force: true });
    throw err;
  }
  return installPath;
}

// Register a skill natively by delegating to the standalone `skills` installer:
// `npx --yes skills add <path> [extra]`. The installer detects the agent
// (Claude Code, Cursor, …) and writes to the right place.
export async function runSkillsAdd(path: string, extraArgs: string[] = []): Promise<void> {
  const code = await spawnInherit("npx", ["--yes", "skills", "add", path, ...extraArgs]);
  if (code !== 0) {
    throw new Error(
      `\`npx skills add\` exited with code ${code}. ` +
        `Make sure Node.js/npx is installed (https://nodejs.org).`,
    );
  }
}

function spawnInherit(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 0));
  });
}
