import { HttpError } from "../api.js";
import { downloadSkill, parseSkillId, runSkillsAdd } from "../install.js";

// bmem add <name> — download a skill (manifest + blob) and register it natively
// via the standalone `skills` installer (`npx skills add`).
export async function addCommand(name: string): Promise<void> {
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

  console.log(`Downloaded ${id.id} -> ${installPath}`);
  await runSkillsAdd(installPath);
}
