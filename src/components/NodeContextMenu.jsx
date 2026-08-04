import { useEffect } from 'react';

/**
 * Right-click menu for Username nodes: run a maigret scan / view results.
 * Structurally mirrors QuickSearch (fixed pos, Escape + outside-click close).
 */
export default function NodeContextMenu({
  x,
  y,
  username,
  hasResults,
  onRunScan,
  onViewResults,
  onClose,
}) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handler = () => {
      setTimeout(onClose, 0);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  const handleRunScan = () => {
    onRunScan();
    onClose();
  };

  const handleViewResults = () => {
    onViewResults();
    onClose();
  };

  return (
    <div
      className="node-context-menu"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button
        className="node-context-menu-item"
        onClick={handleRunScan}
        disabled={!username}
        title={
          username ? '' : 'Double-click the node to set a username first'
        }
      >
        ▶ Run Scan
      </button>
      {hasResults && (
        <button
          className="node-context-menu-item"
          onClick={handleViewResults}
        >
          📄 View Results
        </button>
      )}
    </div>
  );
}
