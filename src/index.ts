import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { searchCommand } from "./commands/search.js";
import { showCommand } from "./commands/show.js";
import { updateCommand } from "./commands/update.js";

// Read the version from package.json so `--version` never drifts from what ships.
const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
);

const program = new Command();

program
  .name("bmem")
  .description(
    "Open catalog of web skills for AI agents. Search, add, and run reusable browser recipes with whatever browser your agent already has.",
  )
  .version(pkg.version);

program
  .command("search")
  .argument("[query]", "search terms")
  .option("--site <host>", "filter by site, e.g. linkedin.com")
  .option("--limit <n>", "max results")
  .option("--json", "raw JSON output")
  .description("Search the skills catalog")
  .action(searchCommand);

program
  .command("list")
  .option("--site <host>", "filter by site")
  .option("--limit <n>", "max results")
  .option("--json", "raw JSON output")
  .description("List the whole catalog")
  .action(listCommand);

program
  .command("show")
  .argument("<name>", "skill id, e.g. linkedin.com/search-people")
  .description("Print a skill's SKILL.md without installing it")
  .action(showCommand);

program
  .command("add")
  .argument("<name>", "skill id, e.g. linkedin.com/search-people")
  .description("Download a skill and register it as a native agent skill")
  .option(
    "-g, --global",
    "Install user-level (global) so every project sees it; use --no-global for project-level",
    true,
  )
  .action((name, opts) => addCommand(name, { global: opts.global }));

program
  .command("update")
  .argument("[name]", "skill id to update; omit to update every installed skill")
  .description("Re-fetch installed skills and re-register the ones that changed")
  .action(updateCommand);

program
  .command("install")
  .description("Register the bundled bmem meta-skill (bootstrap)")
  .action(installCommand);

program.parseAsync().catch((err: Error) => {
  console.error(`bmem: ${err.message}`);
  process.exit(1);
});
