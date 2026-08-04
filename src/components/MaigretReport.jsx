import { useEffect, useCallback, useState } from 'react';
import { getResults } from '../utils/maigretApi';

/**
 * Popup rendering a completed maigret scan's results (parsed from the
 * `-J simple` JSON), with a link to the generated PDF report.
 * Structurally mirrors MediaLightbox (overlay, close button, Escape).
 */
export default function MaigretReport({ maigret, onClose }) {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Load results on mount
  useEffect(() => {
    if (!maigret?.scanId) return;
    let cancelled = false;
    getResults(maigret.scanId)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [maigret]);

  // Close on overlay click
  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!maigret) return null;

  const siteEntries = results ? Object.entries(results) : [];

  return (
    <div className="lightbox-overlay" onClick={handleOverlayClick}>
      <div className="lightbox-content">
        <button className="lightbox-close" onClick={onClose}>
          ✕
        </button>

        <div className="maigret-report-header">
          <div className="maigret-report-title">
            Maigret scan — {maigret.username}
          </div>
          <div className="maigret-report-meta">
            {maigret.completedAt &&
              `Completed ${new Date(maigret.completedAt).toLocaleString()} · `}
            {results !== null && `${siteEntries.length} account(s) found`}
          </div>
        </div>

        <div className="maigret-report-list">
          {results === null ? (
            <div className="maigret-report-empty">
              {error
                ? `Could not load results: ${error}`
                : 'Loading results…'}
            </div>
          ) : siteEntries.length === 0 ? (
            <div className="maigret-report-empty">
              No accounts found for this username.
            </div>
          ) : (
            siteEntries.map(([key, result]) => (
              <div key={key} className="maigret-report-site">
                <div className="maigret-report-site-row">
                  <span className="maigret-report-site-name">
                    {result.status.site_name || key}
                  </span>
                  {result.status.status && (
                    <span
                      className={`maigret-report-badge ${
                        result.status.status === 'Claimed'
                          ? 'maigret-report-badge--claimed'
                          : ''
                      }`}
                    >
                      {result.status.status}
                    </span>
                  )}
                  <a
                    className="maigret-report-link"
                    href={result.status.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Profile ↗
                  </a>
                </div>
                <div className="maigret-report-tags">
                  {(result.site?.tags || []).map((tag) => (
                    <span key={tag} className="maigret-report-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                {result.status.ids && (
                  <div className="maigret-report-ids">
                    {result.status.ids.fullname && (
                      <div>
                        Full name:{' '}
                        <span className="maigret-report-ids-value">
                          {result.status.ids.fullname}
                        </span>
                      </div>
                    )}
                    {result.status.ids.id && (
                      <div>
                        ID: <span className="maigret-report-ids-value">{result.status.ids.id}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {maigret.reportUrl && (
          <div className="maigret-report-footer">
            <a
              className="maigret-report-download"
              href={maigret.reportUrl}
              target="_blank"
              rel="noreferrer"
            >
              ⬇ Download PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
