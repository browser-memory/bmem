import { searchSkills } from "../api.js";
import { renderSkills } from "../render.js";

interface Opts {
  site?: string;
  limit?: string;
  json?: boolean;
}

export async function searchCommand(query: string | undefined, opts: Opts): Promise<void> {
  let rows = await searchSkills(query, opts.site);
  if (opts.limit) rows = rows.slice(0, Number.parseInt(opts.limit, 10));
  renderSkills(rows, opts.json);
}
