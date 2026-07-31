import { useEffect, useState } from 'react';

export default function CloudGraphModal({ boards, loading, error, onClose, onLoad, onDelete, onRefresh }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>☁️ Load Cloud Board</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          {loading ? (
            <div className="modal-empty">Loading cloud boards…</div>
          ) : boards.length === 0 ? (
            <div className="modal-empty">No cloud boards yet.</div>
          ) : (
            <div className="modal-list">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className={`modal-list-item cloud-board-item${selected === board.id ? ' cloud-board-item--selected' : ''}`}
                  onClick={() => setSelected(board.id)}
                >
                  <span className="modal-list-item-info">
                    <span className="modal-list-item-name">{board.name}</span>
                    <span className="modal-list-item-date">{new Date(board.savedAt).toLocaleString()}</span>
                  </span>
                  <button
                    className="modal-list-item-delete"
                    title="Delete from cloud"
                    aria-label={`Delete ${board.name} from cloud`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(board.id, board.name);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="modal-actions">
            <button className="modal-btn" onClick={onRefresh} disabled={loading}>Refresh</button>
            <button className="modal-btn modal-btn-primary" onClick={() => selected && onLoad(selected)} disabled={!selected || loading}>
              Load selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

CloudGraphModal.defaultProps = { boards: [], loading: false, error: null };

export function CloudLoginPrompt({ onClose, loginUrl }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header"><h3>☁️ Cloud Boards</h3><button className="modal-close-btn" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="modal-empty">Log in to save and load boards from the cloud.</div>
          <a className="modal-btn modal-btn-primary" href={loginUrl}>Log in</a>
        </div>
      </div>
    </div>
  );
}
