import type { IndexEntry } from "./api.js";

// Human-readable listing shared by `search` and `list`.
export function renderSkills(rows: IndexEntry[], json?: boolean): void {
  if (json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (!rows.length) {
    console.log("No skills found.");
    return;
  }
  for (const s of rows) {
    const badges = [
      s.verified ? "verified" : "",
      s.side_effect,
      s.needs?.length ? `needs: ${s.needs.join(",")}` : "",
      s.installCount != null ? `${s.installCount} installs` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    console.log(`\n${s.name}`);
    if (badges) console.log(`  ${badges}`);
    if (s.intent) console.log(`  ${s.intent}`);
  }
  console.log("");
}
