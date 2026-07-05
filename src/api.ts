import { API_BASE } from "./config.js";

// A search result — kept tiny on purpose (the token win, spec §3.2).
export interface IndexEntry {
  name: string; // "linkedin.com/search-people"
  hostname: string;
  task: string;
  slug: string;
  side_effect: "read" | "write" | "write-irreversible";
  needs: string[];
  intent: string;
  keywords: string[];
  verified?: boolean;
  installCount?: number;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
    statusText: string,
  ) {
    super(`GET ${url} -> ${status} ${statusText}`);
    this.name = "HttpError";
  }
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new HttpError(res.status, url, res.statusText);
  return res.json() as Promise<T>;
}

// GET /api/skills?q=&site=  — search passes q, list omits it.
export async function searchSkills(q?: string, site?: string): Promise<IndexEntry[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (site) params.set("site", site);
  const qs = params.toString();
  const data = await getJSON<{ skills: IndexEntry[] }>(
    `${API_BASE}/api/skills${qs ? `?${qs}` : ""}`,
  );
  return data.skills ?? [];
}

// The file manifest for one skill (spec §3.1) — two hops: manifest, then blob.
export interface FileManifest {
  skillId: string;
  files: { path: string; url: string }[];
}

// GET /api/skills/{domain}/{task}/files  — lists the files + their blob URLs.
export function getManifest(name: string): Promise<FileManifest> {
  return getJSON<FileManifest>(`${API_BASE}/api/skills/${name}/files`);
}

// Download one file (from the absolute blob URL the manifest returned).
export async function fetchBinary(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new HttpError(res.status, url, res.statusText);
  return new Uint8Array(await res.arrayBuffer());
}

// Fetch a file as text (used by `show` to print a SKILL.md without installing).
export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new HttpError(res.status, url, res.statusText);
  return res.text();
}
