import { HttpError } from "../api.js";
import { downloadSkill, parseSkillId, runSkillsAdd } from "../install.js";
import { reportInstall } from "../telemetry.js";

// bmem add <name> — download a skill (manifest + blob) and register it natively
// via the standalone `skills` installer (`npx skills add`). Installs global by
// default so every project sees the skill; pass { global: false } for project scope.
export async function addCommand(
  name: string,
  opts: { global?: boolean } = {},
): Promise<void> {
  const { global = true } = opts;
  const id = parseSkillId(name);

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
