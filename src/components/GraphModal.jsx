import { useState, useEffect } from 'react';
import { listGraphs, saveGraph, loadGraph, deleteGraph } from '../data/graphStore';

export default function GraphModal({ mode, onClose, onSave, onLoad }) {
  const [saved, setSaved] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'load' || mode === 'delete' || mode === 'save') {
      setSaved(listGraphs());
    }
  }, [mode]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a name for this graph');
      return;
    }
    if (saved.some((g) => g.name === trimmed)) {
      const ok = window.confirm(
        `"${trimmed}" already exists. Overwrite?`
      );
      if (!ok) return;
    }
    onSave(trimmed);
    onClose();
  };

  const handleLoad = (id) => {
    const g = loadGraph(id);
    if (g) {
      onLoad(g.nodes, g.edges, g.name);
    }
    onClose();
  };

  const handleDelete = (id, graphName) => {
    if (window.confirm(`Delete "${graphName}"?`)) {
      deleteGraph(id);
      setSaved(listGraphs());
    }
  };

  if (!mode) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {mode === 'save'
              ? '💾 Save Graph'
              : mode === 'load'
              ? '📂 Load Graph'
              : mode === 'delete'
              ? '🗑️ Delete Graph'
              : '📁 Graphs'}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {mode === 'save' && (
            <div className="modal-form">
              <label className="modal-label">Graph Name</label>
              <input
                className="modal-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="My Investigation"
                autoFocus
              />
              {error && <div className="modal-error">{error}</div>}
              <button className="modal-btn modal-btn-primary" onClick={handleSave}>
                💾 Save
              </button>
            </div>
          )}

          {mode === 'load' && (
            <div className="modal-list">
              {saved.length === 0 ? (
                <div className="modal-empty">No saved graphs yet.</div>
              ) : (
                saved.map((g) => (
                  <div
                    key={g.id}
                    className="modal-list-item"
                    onClick={() => handleLoad(g.id)}
                  >
                    <div className="modal-list-item-info">
                      <span className="modal-list-item-name">{g.name}</span>
                      <span className="modal-list-item-date">
                        {new Date(g.savedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {mode === 'delete' && (
            <div className="modal-list">
              {saved.length === 0 ? (
                <div className="modal-empty">No saved graphs to delete.</div>
              ) : (
                saved.map((g) => (
                  <div key={g.id} className="modal-list-item">
                    <div className="modal-list-item-info">
                      <span className="modal-list-item-name">{g.name}</span>
                      <span className="modal-list-item-date">
                        {new Date(g.savedAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      className="modal-btn modal-btn-delete"
                      onClick={() => handleDelete(g.id, g.name)}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
