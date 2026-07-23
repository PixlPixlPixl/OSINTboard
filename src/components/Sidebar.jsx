import { NODE_TYPES } from '../data/nodeTypes';

const Sidebar = () => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>🕵️ OSINTboard</h2>
        <p className="sidebar-subtitle">Node Palette</p>
      </div>

      <div className="sidebar-instructions">
        <span className="key-hint">Drag</span> nodes onto canvas<br />
        <span className="key-hint">Click + Drag</span> between nodes to connect<br />
        <span className="key-hint">Double-click</span> a node to edit its label<br />
        <span className="key-hint">Delete</span> or <span className="key-hint">Backspace</span> to remove selected<br />
        <span className="key-hint">Scroll</span> to zoom · <span className="key-hint">Drag</span> canvas to pan
      </div>

      <div className="sidebar-nodes">
        {NODE_TYPES.map((nt) => (
          <div
            key={nt.type}
            className="sidebar-node"
            draggable
            onDragStart={(e) => onDragStart(e, nt.type)}
            style={{ '--node-color': nt.color }}
          >
            <span className="sidebar-node-icon">{nt.icon}</span>
            <div className="sidebar-node-info">
              <span className="sidebar-node-label">{nt.label}</span>
              <span className="sidebar-node-desc">{nt.description}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button
          className="sidebar-btn"
          onClick={() => {
            if (window.confirm('Clear all nodes and edges from the canvas?')) {
              window.dispatchEvent(new CustomEvent('clear-canvas'));
            }
          }}
        >
          🗑️ Clear Canvas
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
