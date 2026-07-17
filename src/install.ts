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

// Validate & split "<site>/<skill>", guarding against path traversal.
// Each site groups several skills; you install one at a time
// ("linkedin.com/get-profile"). The bare site is not a skill on its own.
export function parseSkillId(raw: string): SkillId {
  const parts = raw.split("/").filter(Boolean);
  if (
    raw.includes("\\") ||
    parts.some((s) => s === "." || s === "..")
  ) {
    throw new Error(`invalid skill id "${raw}".`);
  }
  if (parts.length !== 2) {
    throw new Error(
      `"${raw}" is not a skill. Pick one for the site, e.g. ${parts[0] || "linkedin.com"}/get-profile. ` +
        `Run "bmem search ${parts[0] || raw}" to see a site's skills.`,
    );
  }
  const [domain, task] = parts;
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
// (Claude Code, Cursor, …) and writes to the right place. Its output is very
// noisy (ASCII banner, per-agent trees), so we capture it and stay silent on
// success — only surfacing the raw output if the install actually fails.
export async function runSkillsAdd(path: string, extraArgs: string[] = []): Promise<void> {
  const { code, output } = await spawnCapture("npx", [
    "--yes",
    "skills",
    "add",
    path,
    ...extraArgs,
  ]);
  if (code !== 0) {
    process.stderr.write(output);
    throw new Error(
      `\`npx skills add\` exited with code ${code}. ` +
        `Make sure Node.js/npx is installed (https://nodejs.org).`,
    );
  }
}

function spawnCapture(
  cmd: string,
  args: string[],
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout?.on("data", (d) => (output += d.toString()));
    child.stderr?.on("data", (d) => (output += d.toString()));
    child.on("error", () => resolve({ code: 1, output }));
    child.on("close", (code) => resolve({ code: code ?? 0, output }));
  });
}
