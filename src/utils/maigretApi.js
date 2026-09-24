/**
 * maigret scan API client.
 *
 * Paths are prefixed with Vite's BASE_URL because the app is mounted under
 * /osint/ on a shared origin (manifest `route`); a bare `/api/...` would hit the
 * site root instead of this app's backend.
 */

const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || res.statusText);
  }
  return res;
}

/** POST /api/maigret/scan → { scanId } */
export async function startScan(username) {
  const res = await request(`${API_BASE}/maigret/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return res.json();
}

/**
 * GET /api/maigret/scan/<id>
 * → { id, username, status, error, createdAt, completedAt, reportUrl, resultsUrl }
 */
export async function getScan(scanId) {
  const res = await request(`${API_BASE}/maigret/scan/${scanId}`);
  return res.json();
}

/**
 * GET /api/maigret/results/<id> → parsed JSON.
 * Schema: { "<SiteName>": { "site": { tags: [...], url }, "status": {
 *   site_name, url, status: "Claimed"|..., ids: { fullname?, id? } } } }
 * `{}` when no accounts were found.
 */
export async function getResults(scanId) {
  const res = await request(`${API_BASE}/maigret/results/${scanId}`);
  return res.json();
}
