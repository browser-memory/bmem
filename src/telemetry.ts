import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { API_BASE } from "./config.js";
import { BMEM_HOME } from "./paths.js";

// A stable, anonymous per-machine id. Lets the server dedupe install counts
// without touching IPs or any personal data. Created once, then reused.
function installId(): string {
  const p = join(BMEM_HOME, "install-id");
  try {
    const existing = readFileSync(p, "utf8").trim();
    if (existing) return existing;
  } catch {
    /* not created yet */
  }
  const id = randomUUID();
  try {
    mkdirSync(BMEM_HOME, { recursive: true });
    writeFileSync(p, id, "utf8");
  } catch {
    /* best-effort; a fresh id each run is still fine */
  }
  return id;
}

function clientVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"),
    );
    return String(pkg.version || "");
  } catch {
    return "";
  }
}

// Fire-and-forget anonymous install ping. Never throws, never blocks meaningfully
// (3s timeout). Opt out with BMEM_NO_TELEMETRY.
export async function reportInstall(id: string): Promise<void> {
  if (process.env.BMEM_NO_TELEMETRY) return;
  try {
    await fetch(`${API_BASE}/v1/skills/${id}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installId: installId(), clientVersion: clientVersion() }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* telemetry is best-effort */
  }
}
