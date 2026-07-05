import { fetchText, getManifest, HttpError } from "../api.js";
import { parseSkillId } from "../install.js";

// bmem show <name> — print a skill's SKILL.md to stdout WITHOUT installing it.
// No cache write, no registration — just a read so the agent can inspect the
// recipe (or run it ad-hoc) before committing to `add`.
export async function showCommand(name: string): Promise<void> {
  const id = parseSkillId(name);

  let manifest;
  try {
    manifest = await getManifest(id.id);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) {
      throw new Error(
        `no skill "${id.id}" in the catalog.\n` +
          `  Run \`bmem search ${id.domain}\` or \`bmem list\` to see what exists.`,
      );
    }
    throw err;
  }

  const skillFile = manifest.files.find((f) => f.path.endsWith("SKILL.md"));
  if (!skillFile) throw new Error(`no SKILL.md in manifest for ${id.id}`);

  const body = await fetchText(skillFile.url);
  process.stdout.write(body.endsWith("\n") ? body : `${body}\n`);
}
