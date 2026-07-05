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
export function parseSkillId(raw: string): SkillId {
  const parts = raw.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`skill must be in the form <domain>/<task>, got "${raw}".`);
  }
  const [domain, task] = parts;
  if (raw.includes("\\") || [domain, task].some((s) => s === "." || s === "..")) {
    throw new Error(`invalid skill id "${raw}".`);
  }
  return { domain, task, id: raw };
}

// Download every file of a skill into the local cache. Writes to a temp dir and
// atomically renames, so a failed download never leaves a half-written skill.
export async function downloadSkill(id: SkillId): Promise<string> {
  const manifest = await getManifest(id.id); // throws HttpError(404) if unknown
  const installPath = join(BMEM_SKILLS_DIR, id.domain, id.task);
  const parent = dirname(installPath);
  await mkdir(parent, { recursive: true });

  const tmp = await mkdtemp(join(parent, `.${id.task}-`));
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
