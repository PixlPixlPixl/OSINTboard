import { useMemo } from 'react';
import { NODE_TYPE_MAP } from '../data/nodeTypes';

function formatDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function parseSortKey(iso) {
  if (!iso) return '9999-99-99';
  return iso;
}

const Timeline = ({ nodes, edges, onClose }) => {
  const timelineEntries = useMemo(() => {
    const dateNodes = nodes.filter((n) => n.data?.nodeType === 'date');
    const edgeList = edges || [];

    const entries = dateNodes.map((node) => {
      const connectedEdges = edgeList.filter(
        (e) => e.source === node.id || e.target === node.id
      );
      const connectedNodeIds = new Set();
      connectedEdges.forEach((e) => {
        if (e.source !== node.id) connectedNodeIds.add(e.source);
        if (e.target !== node.id) connectedNodeIds.add(e.target);
      });
      const connectedNodes = nodes.filter((n) =>
        connectedNodeIds.has(n.id)
      );

      return {
        node,
        dateValue: node.data?.dateValue || '',
        label: node.data?.label || '',
        connectedNodes,
      };
    });

    entries.sort((a, b) => {
      const ka = parseSortKey(a.dateValue);
      const kb = parseSortKey(b.dateValue);
      if (ka === kb) return a.label.localeCompare(b.label);
      return ka.localeCompare(kb);
    });

    return entries;
  }, [nodes, edges]);

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <h3 className="timeline-title">📅 Timeline</h3>
        <button className="timeline-close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="timeline-body">
        {timelineEntries.length === 0 ? (
          <div className="timeline-empty">
            <p>No date nodes on the board.</p>
            <p className="timeline-empty-hint">
              Drag a <strong>Date / Event</strong> node onto the canvas, set a
              date, and connect other nodes to it.
            </p>
          </div>
        ) : (
          <div className="timeline-list">
            {timelineEntries.map((entry, idx) => (
              <div key={entry.node.id} className="timeline-entry">
                <div className="timeline-marker">
                  <div className="timeline-dot" />
                  {idx < timelineEntries.length - 1 && (
                    <div className="timeline-line" />
                  )}
                </div>
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <span className="timeline-card-date">
                      {formatDate(entry.dateValue) || 'Unknown Date'}
                    </span>
                    {entry.label && (
                      <span className="timeline-card-label">
                        {entry.label}
                      </span>
                    )}
                  </div>
                  {entry.connectedNodes.length > 0 && (
                    <div className="timeline-connections">
                      <div className="timeline-connections-label">
                        Connected
                      </div>
                      <div className="timeline-connections-list">
                        {entry.connectedNodes.map((cn) => {
                          const def =
                            NODE_TYPE_MAP[cn.data?.nodeType] ||
                            NODE_TYPE_MAP.note;
                          return (
                            <div
                              key={cn.id}
                              className="timeline-connection-item"
                              style={{
                                '--conn-color': def.color,
                              }}
                            >
                              <span className="timeline-conn-icon">
                                {def.icon}
                              </span>
                              <span className="timeline-conn-type">
                                {def.label}
                              </span>
                              <span className="timeline-conn-label">
                                {cn.data?.label || '(empty)'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {entry.connectedNodes.length === 0 && (
                    <div className="timeline-no-connections">
                      No connections — drag edges from other nodes to this date
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Timeline;
