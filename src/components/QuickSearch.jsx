import { useState, useRef, useEffect, useCallback } from 'react';
import { NODE_TYPES } from '../data/nodeTypes';

export default function QuickSearch({ position, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      // Small delay so the select click can fire first
      setTimeout(() => {
        if (inputRef.current && !inputRef.current.parentElement?.contains(document.activeElement)) {
          onClose();
        }
      }, 100);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  const filtered = query.trim()
    ? NODE_TYPES.filter(
        (nt) =>
          nt.label.toLowerCase().includes(query.toLowerCase()) ||
          nt.type.toLowerCase().includes(query.toLowerCase()) ||
          nt.description.toLowerCase().includes(query.toLowerCase())
      )
    : NODE_TYPES;

  const handleSelect = useCallback(
    (nodeType) => {
      onSelect(nodeType);
    },
    [onSelect]
  );

  return (
    <div
      className="quick-search"
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        className="quick-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filtered.length > 0) {
            handleSelect(filtered[0].type);
          }
          if (e.key === 'Escape') onClose();
        }}
        placeholder="Search nodes…"
      />
      <div className="quick-search-results">
        {filtered.length === 0 ? (
          <div className="quick-search-empty">No matches</div>
        ) : (
          filtered.map((nt) => (
            <div
              key={nt.type}
              className="quick-search-item"
              onClick={() => handleSelect(nt.type)}
              style={{ '--node-color': nt.color }}
            >
              <span className="quick-search-item-icon">{nt.icon}</span>
              <span className="quick-search-item-label">{nt.label}</span>
              <span className="quick-search-item-desc">{nt.description}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
