import { searchSkills } from "../api.js";
import { renderSkills } from "../render.js";

interface Opts {
  site?: string;
  limit?: string;
  json?: boolean;
}

export async function listCommand(opts: Opts): Promise<void> {
  let rows = await searchSkills(undefined, opts.site);
  if (opts.limit) rows = rows.slice(0, Number.parseInt(opts.limit, 10));
  renderSkills(rows, opts.json);
}
