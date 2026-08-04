/**
 * maigret scan API client. All URLs are relative — same-origin through the
 * Vite dev proxy (`/api` → 127.0.0.1:8000) or the FastAPI static mount.
 */

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
  const res = await request('/api/maigret/scan', {
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
  const res = await request(`/api/maigret/scan/${scanId}`);
  return res.json();
}

/**
 * GET /api/maigret/results/<id> → parsed JSON.
 * Schema: { "<SiteName>": { "site": { tags: [...], url }, "status": {
 *   site_name, url, status: "Claimed"|..., ids: { fullname?, id? } } } }
 * `{}` when no accounts were found.
 */
export async function getResults(scanId) {
  const res = await request(`/api/maigret/results/${scanId}`);
  return res.json();
}
