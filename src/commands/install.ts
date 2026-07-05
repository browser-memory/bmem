import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runSkillsAdd } from "../install.js";

// bmem install — register the bundled bmem meta-skill globally (bootstrap).
// Delegates to the `skills` installer: `npx skills add <bundled> --yes --global --agent *`.
export async function installCommand(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/index.js -> package root is one level up; skills/ ships alongside dist.
  const bundled = join(here, "..", "skills", "bmem");
  await runSkillsAdd(bundled, ["--yes", "--global", "--agent", "*"]);
  console.log("Installed bmem meta-skill (global).");
}
