import { NODE_TYPES } from '../data/nodeTypes';

const Sidebar = ({ graphName, importError, onSave, onLoad, onNew, onDelete, onExport, onImport }) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>🕵️ OSINTboard</h2>
        <p className="sidebar-subtitle">
          Graph: <span className="sidebar-graph-name">{graphName}</span>
        </p>
      </div>

      <div className="sidebar-instructions">
        <span className="key-hint">Drag</span> nodes onto canvas<br />
        <span className="key-hint">Click + Drag</span> between nodes to connect<br />
        <span className="key-hint">Double-click</span> a node to edit its label<br />
        <span className="key-hint">Delete</span> or <span className="key-hint">Backspace</span> to remove selected<br />
        <span className="key-hint">Scroll</span> to zoom · <span className="key-hint">Drag</span> canvas to pan
      </div>

      <div className="sidebar-section-label">NODES</div>
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
        <div className="sidebar-section-label">GRAPH</div>

        <button className="sidebar-btn" onClick={onSave}>
          💾 Save
        </button>
        <button className="sidebar-btn" onClick={onLoad}>
          📂 Load
        </button>

        <div className="sidebar-btn-row">
          <button className="sidebar-btn sidebar-btn-sm" onClick={onNew}>
            ✨ New
          </button>
          <button className="sidebar-btn sidebar-btn-sm sidebar-btn-danger" onClick={onDelete}>
            🗑️ Delete
          </button>
        </div>

        <div className="sidebar-section-label sidebar-section-label--export">EXPORT / IMPORT</div>
        <button className="sidebar-btn" onClick={onExport}>
          📥 Export to file
        </button>
        <button className="sidebar-btn" onClick={onImport}>
          📤 Import from file
        </button>
        {importError && (
          <div className="sidebar-import-error">{importError}</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
