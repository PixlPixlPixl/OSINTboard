import { memo, useState, useMemo, useCallback } from 'react';
import { Handle, Position, useEdges, useNodes, useReactFlow } from 'reactflow';
import { NODE_TYPE_MAP } from '../data/nodeTypes';

const TIMELINE_WIDTH = 520;

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

function toMs(iso) {
  if (!iso) return NaN;
  return new Date(iso + 'T00:00:00').getTime();
}

const TimelineNode = memo(({ id, data, selected }) => {
  const [editing, setEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [localLabel, setLocalLabel] = useState(data.label || '');
  const [localStart, setLocalStart] = useState(data.startDate || '');
  const [localEnd, setLocalEnd] = useState(data.endDate || '');
  const [localEntryDate, setLocalEntryDate] = useState('');

  const edges = useEdges();
  const nodes = useNodes();
  const { setEdges, getEdges } = useReactFlow();

  const color = '#4db6ac';

  const connectedEdges = useMemo(
    () => edges.filter((e) => e.target === id || e.source === id),
    [edges, id]
  );

  const entries = useMemo(() => {
    return connectedEdges
      .map((e) => {
        const otherNodeId = e.source === id ? e.target : e.source;
        const otherNode = nodes.find((n) => n.id === otherNodeId);
        if (!otherNode) return null;
        return {
          edgeId: e.id,
          nodeId: otherNodeId,
          node: otherNode,
          edgeDate: e.data?.timelineDate || '',
          nodeDate: otherNode.data?.dateValue || '',
          date: e.data?.timelineDate || otherNode.data?.dateValue || '',
        };
      })
      .filter(Boolean);
  }, [connectedEdges, nodes, id]);

  const startMs = toMs(data.startDate);
  const endMs = toMs(data.endDate);
  const hasRange = !isNaN(startMs) && !isNaN(endMs) && endMs > startMs;

  const getDatePosition = useCallback(
    (date) => {
      if (!hasRange || !date) return null;
      const d = toMs(date);
      if (isNaN(d)) return null;
      const pct = ((d - startMs) / (endMs - startMs)) * 100;
      return Math.max(0, Math.min(100, pct));
    },
    [hasRange, startMs, endMs]
  );

  const commitEdit = () => {
    setEditing(false);
    data.label = localLabel;
    data.startDate = localStart;
    data.endDate = localEnd;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') {
      setEditing(false);
      setLocalLabel(data.label || '');
      setLocalStart(data.startDate || '');
      setLocalEnd(data.endDate || '');
    }
  };

  const commitEntryDate = (edgeId) => {
    if (!edgeId) return;
    const allEdges = getEdges();
    setEdges(
      allEdges.map((e) => {
        if (e.id === edgeId) {
          return { ...e, data: { ...e.data, timelineDate: localEntryDate } };
        }
        return e;
      })
    );
    setEditingEntry(null);
    setLocalEntryDate('');
  };

  const entryKeyDown = (e, edgeId) => {
    if (e.key === 'Enter') commitEntryDate(edgeId);
    if (e.key === 'Escape') {
      setEditingEntry(null);
      setLocalEntryDate('');
    }
  };

  const sortedEntries = useMemo(() => {
    const placed = entries.filter((e) => e.date);
    const unplaced = entries.filter((e) => !e.date);
    placed.sort((a, b) => a.date.localeCompare(b.date));
    return { placed, unplaced };
  }, [entries]);

  return (
    <div
      className={`timeline-node ${selected ? 'timeline-node--selected' : ''}`}
      style={{
        width: TIMELINE_WIDTH,
        borderColor: color,
        boxShadow: selected
          ? `0 0 12px ${color}44, 0 0 0 1px ${color}`
          : `0 0 0 1px ${color}88`,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: color,
          width: 10,
          height: 10,
          border: '2px solid #000',
          top: -5,
        }}
      />

      <div
        className="timeline-node-header"
        style={{ borderBottomColor: color + '66' }}
        onDoubleClick={() => setEditing(true)}
      >
        <span className="timeline-node-icon">📊</span>
        {editing ? (
          <span className="timeline-node-header-editing">
            <input
              className="timeline-node-input"
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              placeholder="Timeline title…"
              autoFocus
            />
            <label className="timeline-node-date-label">
              From:
              <input
                className="timeline-node-input timeline-node-input-sm"
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                onBlur={commitEdit}
              />
            </label>
            <label className="timeline-node-date-label">
              To:
              <input
                className="timeline-node-input timeline-node-input-sm"
                type="date"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                onBlur={commitEdit}
              />
            </label>
          </span>
        ) : (
          <span className="timeline-node-title">
            {data.label || <span className="timeline-node-placeholder">Timeline</span>}
            {data.startDate && data.endDate && (
              <span className="timeline-node-range">
                {formatDate(data.startDate)} – {formatDate(data.endDate)}
              </span>
            )}
            {(!data.startDate || !data.endDate) && (
              <span className="timeline-node-range timeline-node-range-hint">
                Double-click to set date range
              </span>
            )}
          </span>
        )}
      </div>

      <div className="timeline-node-bar-area">
        {hasRange ? (
          <div className="timeline-node-bar-container">
            <div className="timeline-node-bar">
              <div className="timeline-node-bar-track" />
              <span className="timeline-node-bar-start">
                {formatDate(data.startDate)}
              </span>
              <span className="timeline-node-bar-end">
                {formatDate(data.endDate)}
              </span>
              {sortedEntries.placed.map((entry) => {
                const pct = getDatePosition(entry.date);
                const def =
                  NODE_TYPE_MAP[entry.node?.data?.nodeType] ||
                  NODE_TYPE_MAP.note;
                if (pct === null) return null;
                return (
                  <div
                    key={entry.edgeId}
                    className="timeline-node-entry"
                    style={{ left: `${pct}%` }}
                    onClick={() => {
                      if (!entry.nodeDate) {
                        setEditingEntry(entry.edgeId);
                        setLocalEntryDate(entry.edgeDate || '');
                      }
                    }}
                    title={
                      (entry.node?.data?.label || '(empty)') +
                      (entry.date ? ' — ' + formatDate(entry.date) : '')
                    }
                  >
                    <div
                      className="timeline-node-entry-dot"
                      style={{ background: def.color }}
                    />
                    <span className="timeline-node-entry-icon">
                      {def.icon}
                    </span>
                  </div>
                );
              })}
            </div>
            {editingEntry && (
              <div className="timeline-node-entry-editor">
                <input
                  className="timeline-node-input"
                  type="date"
                  value={localEntryDate}
                  onChange={(e) => setLocalEntryDate(e.target.value)}
                  onBlur={() => commitEntryDate(editingEntry)}
                  onKeyDown={(e) => entryKeyDown(e, editingEntry)}
                  autoFocus
                />
              </div>
            )}
          </div>
        ) : (
          <div className="timeline-node-no-range">
            {editing ? (
              <span className="timeline-node-range-hint">
                Set start and end dates above
              </span>
            ) : (
              <span className="timeline-node-range-hint">
                Double-click header to set date range
              </span>
            )}
          </div>
        )}

        {sortedEntries.unplaced.length > 0 && (
          <div className="timeline-node-unplaced">
            <span className="timeline-node-unplaced-label">Unplaced entries</span>
            <div className="timeline-node-unplaced-list">
              {sortedEntries.unplaced.map((entry) => {
                const def =
                  NODE_TYPE_MAP[entry.node?.data?.nodeType] ||
                  NODE_TYPE_MAP.note;
                return (
                  <div
                    key={entry.edgeId}
                    className="timeline-node-unplaced-item"
                    onClick={() => {
                      setEditingEntry(entry.edgeId);
                      setLocalEntryDate(entry.edgeDate || '');
                    }}
                  >
                    <span className="timeline-conn-icon">{def.icon}</span>
                    <span className="timeline-conn-label">
                      {entry.node?.data?.label || '(empty)'}
                    </span>
                    <span className="timeline-node-unplaced-set">Set date</span>
                  </div>
                );
              })}
            </div>
            {editingEntry && (
              <div className="timeline-node-entry-editor">
                <input
                  className="timeline-node-input"
                  type="date"
                  value={localEntryDate}
                  onChange={(e) => setLocalEntryDate(e.target.value)}
                  onBlur={() => commitEntryDate(editingEntry)}
                  onKeyDown={(e) => entryKeyDown(e, editingEntry)}
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {entries.length === 0 && (
          <div className="timeline-node-empty">
            Connect other nodes to this timeline to add entries
          </div>
        )}

        {hasRange && sortedEntries.placed.length === 0 && entries.length > 0 && (
          <div className="timeline-node-empty">
            Set dates on connected nodes or click unplaced entries to position them on the timeline
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: color,
          width: 10,
          height: 10,
          border: '2px solid #000',
          bottom: -5,
        }}
      />
    </div>
  );
});

TimelineNode.displayName = 'TimelineNode';

export default TimelineNode;
