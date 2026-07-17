import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { HttpError } from "../api.js";
import { downloadSkill, parseSkillId, runSkillsAdd, type SkillId } from "../install.js";
import { BMEM_SKILLS_DIR } from "../paths.js";
import { reportInstall } from "../telemetry.js";

// Enumerate the skills bmem has downloaded, from its cache layout
// <BMEM_SKILLS_DIR>/<domain>/<task>. This is the source of truth for "what's
// installed" — independent of any project's skills-lock.json.
async function listInstalled(): Promise<SkillId[]> {
  if (!existsSync(BMEM_SKILLS_DIR)) return [];
  const out: SkillId[] = [];
  for (const domain of await readdir(BMEM_SKILLS_DIR)) {
    if (domain.startsWith(".")) continue; // skip stray temp dirs
    const domainPath = join(BMEM_SKILLS_DIR, domain);
    let tasks: string[];
    try {
      if (!(await stat(domainPath)).isDirectory()) continue;
      tasks = await readdir(domainPath);
    } catch {
      continue;
    }
    for (const task of tasks) {
      if (task.startsWith(".")) continue; // .domain-xxxx from a failed download
      const p = join(domainPath, task);
      try {
        if (!(await stat(p)).isDirectory()) continue;
      } catch {
        continue;
      }
      out.push({ domain, task, id: `${domain}/${task}` });
    }
  }
  return out;
}

// Content hash of a skill directory (relative path + bytes, order-independent).
// Detects any change to any file — the reliable "did the remote version move"
// signal. Empty string when the directory doesn't exist yet.
async function hashDir(dir: string): Promise<string> {
  if (!existsSync(dir)) return "";
  const files: string[] = [];
  const walk = async (d: string, rel: string): Promise<void> => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const abs = join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(abs, r);
      else files.push(r);
    }
  };
  await walk(dir, "");
  files.sort();
  const h = createHash("sha256");
  for (const f of files) {
    h.update(f);
    h.update("\0");
    h.update(await readFile(join(dir, f)));
  }
  return h.digest("hex");
}

// Pretty label: the `version:` from SKILL.md frontmatter, if the skill carries one.
async function readVersion(dir: string): Promise<string | null> {
  try {
    const md = await readFile(join(dir, "SKILL.md"), "utf8");
    const m = md.match(/^version:\s*(.+)$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

// bmem update [name] — re-fetch installed skills and re-register the ones whose
// content actually changed. With no name, updates everything bmem has installed;
// unchanged skills are skipped (no wasted re-registration).
export async function updateCommand(name?: string): Promise<void> {
  const targets = name ? [parseSkillId(name)] : await listInstalled();

  if (targets.length === 0) {
    console.log("Nothing to update — no skills installed via bmem yet. Use `bmem add <name>`.");
    return;
  }

  const changed: string[] = [];
  const failed: string[] = [];

  for (const id of targets) {
    const dir = join(BMEM_SKILLS_DIR, id.domain, id.task);
    const oldHash = await hashDir(dir);
    const oldVer = await readVersion(dir);

    let installPath: string;
    try {
      installPath = await downloadSkill(id); // atomically overwrites the cache
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        console.log(`  ${id.id}  — no longer in the catalog, skipped`);
      } else {
        console.log(`  ${id.id}  — download failed: ${(err as Error).message}`);
      }
      failed.push(id.id);
      continue;
    }

    const newHash = await hashDir(installPath);
    if (oldHash && newHash === oldHash) {
      console.log(`  ${id.id}  up to date`);
      continue;
    }

    // Content moved — re-register natively and report. Use the same scope as
    // `bmem add` (--global --yes), otherwise the fresh copy lands in a project-local
    // skills dir and the globally-registered skill the agent loads stays stale.
    await runSkillsAdd(installPath, ["--global", "--yes"]);
    await reportInstall(id.id);
    const newVer = await readVersion(installPath);
    const label = oldVer && newVer ? `${oldVer} -> ${newVer}` : oldHash ? "updated" : "installed";
    console.log(`  ${id.id}  ${label}`);
    changed.push(id.id);
  }

  const summary = changed.length
    ? `\nUpdated ${changed.length} skill(s): ${changed.join(", ")}`
    : "\nEverything up to date.";
  console.log(failed.length ? `${summary}  (${failed.length} skipped)` : summary);
}
