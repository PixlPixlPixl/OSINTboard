import { memo, useState, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { NODE_TYPE_MAP } from '../data/nodeTypes';

/**
 * Extract a YouTube video ID from various URL formats:
 *   youtube.com/watch?v=ID
 *   youtu.be/ID
 *   youtube.com/embed/ID
 *   youtube.com/shorts/ID
 *   youtube.com/live/ID
 */
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // youtu.be/ID
  const shortMatch = trimmed.match(/^https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&#]|$)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/* (watch, embed, shorts, live)
  const longMatch = trimmed.match(
    /^https?:\/\/(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com|youtube\.com)\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/
  );
  if (longMatch) return longMatch[1];

  return null;
}

const OSINTNode = memo(({ data, selected }) => {
  const nodeDef = NODE_TYPE_MAP[data.nodeType] || NODE_TYPE_MAP.note;
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label || '');

  const color = nodeDef.color;
  const isExternalLink = data.nodeType === 'external-link';
  const youtubeId = useMemo(() => extractYouTubeId(data.label), [data.label]);

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
      className={`osint-node ${selected ? 'selected' : ''} ${isExternalLink ? 'osint-node--external-link' : ''} ${youtubeId ? 'osint-node--has-video' : ''}`}
      onDoubleClick={!youtubeId || editing ? handleDoubleClick : undefined}
      style={{
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
        }}
      />
      <div
        className="osint-node-header"
        style={{ borderBottomColor: color + '66' }}
      >
        <span className="osint-node-icon">{nodeDef.icon}</span>
        <span className="osint-node-type-label" style={{ color }}>
          {nodeDef.label}
        </span>
      </div>
      <div className="osint-node-body">
        {isExternalLink && youtubeId && !editing ? (
          <div className="osint-node-video" onClick={() => setEditing(true)}>
            <div className="osint-node-video-embed">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="osint-node-video-url" title={data.label}>
              {data.label}
            </div>
          </div>
        ) : editing ? (
          <div className="osint-node-edit-area">
            <input
              className="osint-node-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder={isExternalLink ? 'Paste a URL…' : 'Enter details…'}
            />
            {isExternalLink && (
              <div className="osint-node-url-hint">
                YouTube links auto-embed a player ↗
              </div>
            )}
          </div>
        ) : (
          <div
            className="osint-node-label"
            onDoubleClick={handleDoubleClick}
            title={data.label}
          >
            {data.label ? (
              isExternalLink ? (
                <span className="osint-node-url-display">
                  🔗 {data.label}
                </span>
              ) : (
                data.label
              )
            ) : (
              <span className="osint-node-placeholder">
                {isExternalLink ? 'Double-click to add a URL' : 'Double-click to edit'}
              </span>
            )}
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
        }}
      />
    </div>
  );
});

OSINTNode.displayName = 'OSINTNode';

export default OSINTNode;
