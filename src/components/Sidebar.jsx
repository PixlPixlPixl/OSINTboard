import { useState } from 'react';
import { NODE_TYPES } from '../data/nodeTypes';

const Sidebar = ({
  graphName,
  importError,
  isMobile,
  isOpen,
  pendingNodeType,
  onClose,
  onSelectNodeType,
  onSave,
  onLoad,
  onNew,
  onDelete,
  onExport,
  onImport,
  cloudAvailable,
  onCloudSave,
  onCloudLoad,
}) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNodeClick = (nodeType) => {
    if (isMobile && onSelectNodeType) {
      onSelectNodeType(nodeType);
    }
  };

  const [graphDrawerOpen, setGraphDrawerOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const handleAction = (fn) => () => {
    fn();
    if (isMobile && onClose) onClose();
  };

  return (
    <>
      {/* Overlay backdrop for mobile */}
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside
        className={`sidebar${isMobile ? ' sidebar--mobile' : ''}${isMobile && isOpen ? ' sidebar--open' : ''}`}
      >
        {isMobile && (
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        )}

        <div className="sidebar-header">
          <h2>🕵️ OSINTboard</h2>
          <p className="sidebar-subtitle">
            Graph: <span className="sidebar-graph-name">{graphName}</span>
          </p>
        </div>

        <div className={`sidebar-instructions${instructionsOpen ? ' sidebar-instructions--open' : ''}`}>
            <span className="key-hint">Drag</span> nodes onto canvas<br />
            <span className="key-hint">Click + Drag</span> between nodes to connect<br />
            <span className="key-hint">Double-click</span> a node to edit its label<br />
            <span className="key-hint">Delete</span> or <span className="key-hint">Backspace</span> to remove selected<br />
            <span className="key-hint">Scroll</span> to zoom · <span className="key-hint">Drag</span> canvas to pan
          </div>

        <div className={`sidebar-instructions sidebar-instructions--mobile${instructionsOpen ? ' sidebar-instructions--open' : ''}`}>
            <span className="key-hint">Tap</span> a node type to select it<br />
            <span className="key-hint">Tap</span> canvas to place the node<br />
            <span className="key-hint">Double-tap</span> a node to edit its label<br />
            <span className="key-hint">Pinch</span> to zoom · <span className="key-hint">Drag</span> to pan
          </div>

        {isMobile && pendingNodeType && (
          <div className="sidebar-pending-banner">
            Placing: <strong>{NODE_TYPES.find(n => n.type === pendingNodeType)?.label || pendingNodeType}</strong>
            <button
              className="sidebar-pending-cancel"
              onClick={() => onSelectNodeType?.(null)}
            >
              Cancel
            </button>
          </div>
        )}

        <button
          className="sidebar-divider"
          onClick={() => setInstructionsOpen((v) => !v)}
          aria-label={instructionsOpen ? 'Collapse tutorial' : 'Expand tutorial'}
          title={instructionsOpen ? 'Collapse tutorial' : 'Expand tutorial'}
        >
          <span className="sidebar-divider__line" />
          <span className={`sidebar-divider__arrow${instructionsOpen ? ' sidebar-divider__arrow--open' : ''}`}>
            ▸
          </span>
          <span className="sidebar-divider__line" />
        </button>
        <div className="sidebar-section-label">NODES</div>
        <div className="sidebar-nodes">
          {NODE_TYPES.map((nt) => (
            <div
              key={nt.type}
              className={`sidebar-node${pendingNodeType === nt.type ? ' sidebar-node--selected' : ''}`}
              draggable={!isMobile}
              onDragStart={(e) => onDragStart(e, nt.type)}
              onClick={() => handleNodeClick(nt.type)}
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

        <div className="sidebar-drawer">
          <button
            className="sidebar-drawer__toggle"
            onClick={() => setGraphDrawerOpen((v) => !v)}
            aria-expanded={graphDrawerOpen}
          >
            <span className={`sidebar-drawer__arrow${graphDrawerOpen ? ' sidebar-drawer__arrow--open' : ''}`}>
              ▸
            </span>
            Graph Actions
          </button>

          <div className={`sidebar-drawer__content${graphDrawerOpen ? ' sidebar-drawer__content--open' : ''}`}>
              <div className="sidebar-section-label">GRAPH</div>

              <button className="sidebar-btn" onClick={handleAction(onSave)}>
                💾 Save
              </button>
              <button className="sidebar-btn" onClick={handleAction(onLoad)}>
                📂 Load
              </button>
              <button className="sidebar-btn" onClick={handleAction(onCloudSave)}>
                ☁️ Save to cloud
              </button>
              <button className="sidebar-btn" onClick={handleAction(onCloudLoad)}>
                ☁️ Load from cloud
              </button>
              {!cloudAvailable && <div className="sidebar-cloud-hint">Log in to use cloud boards.</div>}

              <div className="sidebar-btn-row">
                <button className="sidebar-btn sidebar-btn-sm" onClick={handleAction(onNew)}>
                  ✨ New
                </button>
                <button className="sidebar-btn sidebar-btn-sm sidebar-btn-danger" onClick={handleAction(onDelete)}>
                  🗑️ Delete
                </button>
              </div>

              <div className="sidebar-section-label sidebar-section-label--export">EXPORT / IMPORT</div>
              <button className="sidebar-btn" onClick={handleAction(onExport)}>
                📥 Export to file
              </button>
              <button className="sidebar-btn" onClick={handleAction(onImport)}>
                📤 Import from file
              </button>
              {importError && (
                <div className="sidebar-import-error">{importError}</div>
              )}
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
