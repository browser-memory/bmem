// Skills API base URL. Override for self-host / staging.
// Search hits `${API_BASE}/api/skills`; a skill is fetched via its file manifest
// at `${API_BASE}/api/skills/{domain}/{task}/files`, then from blob storage.
export const API_BASE = (
  process.env.BMEM_SKILLS_API_BASE_URL ?? "https://bmem.sh"
).replace(/\/$/, "");
