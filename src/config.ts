// Skills API base URL. Override for self-host / staging.
// Search hits `${API_BASE}/v1/skills`; a skill is fetched via its file manifest
// at `${API_BASE}/v1/skills/{domain}/{task}/files`, then from blob storage.
export const API_BASE = (
  process.env.BMEM_SKILLS_API_BASE_URL ?? "https://api.browser-memory.com"
).replace(/\/$/, "");
