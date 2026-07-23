import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { NODE_TYPE_MAP } from '../data/nodeTypes';

const OSINTNode = memo(({ data, selected }) => {
  const nodeDef = NODE_TYPE_MAP[data.nodeType] || NODE_TYPE_MAP.note;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label || '');

  const color = nodeDef.color;

  const handleDoubleClick = () => {
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    data.label = label;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setEditing(false);
      data.label = label;
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setLabel(data.label || '');
    }
  };

  return (
    <div
      className={`osint-node ${selected ? 'selected' : ''}`}
      onDoubleClick={handleDoubleClick}
      style={{
        borderColor: color,
        boxShadow: selected ? `0 0 12px ${color}44, 0 0 0 1px ${color}` : `0 0 0 1px ${color}88`,
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
        }}
      />
      <div className="osint-node-header" style={{ borderBottomColor: color + '66' }}>
        <span className="osint-node-icon">{nodeDef.icon}</span>
        <span className="osint-node-type-label" style={{ color }}>
          {nodeDef.label}
        </span>
      </div>
      <div className="osint-node-body">
        {editing ? (
          <input
            className="osint-node-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="Enter details..."
          />
        ) : (
          <span className="osint-node-label">
            {label || <span className="osint-node-placeholder">Double-click to edit</span>}
          </span>
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
        }}
      />
    </div>
  );
});

OSINTNode.displayName = 'OSINTNode';

export default OSINTNode;
