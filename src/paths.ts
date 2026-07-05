import { homedir } from "node:os";
import { join } from "node:path";

// bmem's own cache of every downloaded skill. The `skills` installer registers
// from here into each agent's native skill directory.
export const BMEM_HOME =
  process.env.BMEM_HOME ??
  join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "bmem");
export const BMEM_SKILLS_DIR = join(BMEM_HOME, "skills");
