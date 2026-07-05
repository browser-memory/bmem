import { Command } from "commander";
import { addCommand } from "./commands/add.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";
import { searchCommand } from "./commands/search.js";
import { showCommand } from "./commands/show.js";

const program = new Command();

program
  .name("bmem")
  .description(
    "Open catalog of web skills for AI agents — search, add, and run reusable browser recipes with whatever browser your agent already has.",
  )
  .version("0.1.0");

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
  .action(addCommand);

program
  .command("install")
  .description("Register the bundled bmem meta-skill (bootstrap)")
  .action(installCommand);

program.parseAsync().catch((err: Error) => {
  console.error(`bmem: ${err.message}`);
  process.exit(1);
});
