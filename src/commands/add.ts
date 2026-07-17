import { HttpError, searchSkills } from "../api.js";
import { downloadSkill, parseSkillId, runSkillsAdd } from "../install.js";
import { reportInstall } from "../telemetry.js";

// bmem add <name> — download a skill (manifest + blob) and register it natively
// via the standalone `skills` installer (`npx skills add`). Installs global by
// default so every project sees the skill; pass { global: false } for project scope.
// A bare site ("linkedin", "linkedin.com") adds every skill the site has.
export async function addCommand(
  name: string,
  opts: { global?: boolean } = {},
): Promise<void> {
  const { global = true } = opts;

  // No "/" means a site, not a skill: add the whole site. The API normalizes
  // the hostname, so "linkedin" and "linkedin.com" both resolve.
  const raw = name.replace(/\/+$/, "");
  if (!raw.includes("/")) return addSite(raw, global);

  const id = parseSkillId(raw);

  let installPath: string;
  try {
    installPath = await downloadSkill(id);
  } catch (err) {
    // Most likely the agent invented a skill id that isn't in the catalog.
    if (err instanceof HttpError && err.status === 404) {
      throw new Error(
        `no skill "${id.id}" in the catalog.\n` +
          `  bmem only serves curated skills — it can't be invented.\n` +
          `  Run \`bmem search ${id.domain}\` or \`bmem list\` to see what exists.`,
      );
    }
    throw err;
  }

  // `--yes` skips the interactive scope prompt (which otherwise leaves the skill
  // in the cache but unregistered); `--global` targets the user-level dir.
  const extraArgs = global ? ["--global", "--yes"] : ["--yes"];
  await runSkillsAdd(installPath, extraArgs);
  await reportInstall(id.id);
  console.log(`✓ ${id.id} installed ${global ? "globally" : "in this project"}`);
}

// bmem add <site> — every skill for one site, in one command. Same per-skill
// pipeline as the single add (download → register → report); one failure skips
// that skill and the batch keeps going, like `bmem update`.
async function addSite(site: string, global: boolean): Promise<void> {
  const entries = await searchSkills(undefined, site);
  if (entries.length === 0) {
    throw new Error(
      `no skills for site "${site}" in the catalog.\n` +
        `  bmem only serves curated skills — it can't be invented.\n` +
        `  Run \`bmem list\` to see every site's skills.`,
    );
  }

  const hostname = entries[0].hostname;
  console.log(`${entries.length} skill${entries.length === 1 ? "" : "s"} for ${hostname}:`);

  const extraArgs = global ? ["--global", "--yes"] : ["--yes"];
  const added: string[] = [];
  const failed: string[] = [];
  for (const entry of entries) {
    try {
      const installPath = await downloadSkill(parseSkillId(entry.name));
      await runSkillsAdd(installPath, extraArgs);
      await reportInstall(entry.name);
      console.log(`  ✓ ${entry.name}`);
      added.push(entry.name);
    } catch (err) {
      console.log(`  ✗ ${entry.name} — ${(err as Error).message}`);
      failed.push(entry.name);
    }
  }

  const scope = global ? "globally" : "in this project";
  if (failed.length) {
    console.log(`\n${added.length}/${entries.length} installed ${scope} (${failed.length} failed)`);
    process.exitCode = 1;
  } else {
    console.log(`\n✓ all ${added.length} ${hostname} skills installed ${scope}`);
  }
}
