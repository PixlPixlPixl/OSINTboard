import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  SelectionMode,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import OSINTNode from './OSINTNode';
import TimelineNode from './TimelineNode';
import MediaNode from './MediaNode';
import QuickSearch from './QuickSearch';
import { NODE_TYPE_MAP } from '../data/nodeTypes';

const nodeTypes = {
  osintNode: OSINTNode,
  timelineNode: TimelineNode,
  mediaNode: MediaNode,
};

let nodeId = 0;
const getId = () => `osint_${++nodeId}`;

const defaultViewport = { x: 0, y: 0, zoom: 1 };
const SNAP_GRID = 20;
const MAX_HISTORY = 50;
const HISTORY_DEBOUNCE = 300; // ms

const INITIAL_NODES = [];
const INITIAL_EDGES = [];

// Deep-clone for history snapshots (strips heavy base64 media data)
const cloneForHistory = (nodes, edges) => {
  const clonedNodes = nodes.map((n) => ({
    ...n,
    data: { ...n.data, media: undefined },
    position: { ...n.position },
  }));
  const clonedEdges = edges.map((e) => ({ ...e }));
  return { nodes: clonedNodes, edges: clonedEdges };
};

// Merge history snapshot back into live state, preserving media
const mergeSnapshot = (snapshotNodes, liveNodes) => {
  return snapshotNodes.map((sn) => {
    const live = liveNodes.find((n) => n.id === sn.id);
    return {
      ...sn,
      data: { ...sn.data, media: live?.data?.media },
    };
  });
};

const Canvas = forwardRef(function Canvas({ isMobile, pendingNodeType, onNodePlaced }, ref) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const longPressTimer = useRef(null);
  const [quickSearchPos, setQuickSearchPos] = useState(null);

  // --- Undo / Redo system ---
  const historyRef = useRef([{ nodes: [], edges: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoing = useRef(false);
  const pushTimerRef = useRef(null);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyRef.current.length - 1;

  // Debounced push: after changes settle, push a snapshot to history
  const schedulePush = useCallback(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      if (isUndoRedoing.current) return;

      const currentSnapshot = cloneForHistory(nodes, edges);

      historyRef.current = [
        ...historyRef.current.slice(0, historyIndex + 1),
        currentSnapshot,
      ];

      // Trim if over max
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current = historyRef.current.slice(-MAX_HISTORY);
      }

      setHistoryIndex(historyRef.current.length - 1);
    }, HISTORY_DEBOUNCE);
  }, [nodes, edges, historyIndex]);

  // Watch for changes and schedule history push
  useEffect(() => {
    if (isUndoRedoing.current) return;
    schedulePush();
  }, [nodes, edges, schedulePush]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = historyRef.current[newIndex];
    if (!snapshot) return;

    isUndoRedoing.current = true;
    setNodes(mergeSnapshot(snapshot.nodes, nodes));
    setEdges(snapshot.edges);
    setHistoryIndex(newIndex);
    // Reset flag after React commits the update
    setTimeout(() => { isUndoRedoing.current = false; }, 0);
  }, [historyIndex, setNodes, setEdges, nodes]);

  const redo = useCallback(() => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = historyRef.current[newIndex];
    if (!snapshot) return;

    isUndoRedoing.current = true;
    setNodes(mergeSnapshot(snapshot.nodes, nodes));
    setEdges(snapshot.edges);
    setHistoryIndex(newIndex);
    setTimeout(() => { isUndoRedoing.current = false; }, 0);
  }, [historyIndex, setNodes, setEdges, nodes]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  // Expose save/load + undo/redo to parent
  useImperativeHandle(ref, () => ({
    getSnapshot() {
      return { nodes, edges };
    },
    loadSnapshot(newNodes, newEdges) {
      const maxId = newNodes.reduce((m, n) => {
        const num = parseInt(n.id.replace('osint_', ''), 10);
        return isNaN(num) ? m : Math.max(m, num);
      }, 0);
      nodeId = maxId;

      isUndoRedoing.current = true;
      setNodes(newNodes);
      setEdges(newEdges);
      setTimeout(() => { isUndoRedoing.current = false; }, 0);

      // Reset history with this as the initial state
      historyRef.current = [cloneForHistory(newNodes, newEdges)];
      setHistoryIndex(0);
    },
    canUndo,
    canRedo,
    undo,
    redo,
  }));

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        style: { stroke: '#aaa', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#aaa' },
        type: 'smoothstep',
        animated: false,
      };

      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      // Propagate dateValue from source (date module → any target)
      if (sourceNode?.data?.dateValue) {
        newEdge.data = { timelineDate: sourceNode.data.dateValue };
        if (targetNode && targetNode.data.nodeType !== 'timeline') {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === targetNode.id
                ? { ...n, data: { ...n.data, dateValue: sourceNode.data.dateValue } }
                : n
            )
          );
        }
      }

      // Also propagate when date module is the target (connecting TO a date node)
      if (targetNode?.data?.dateValue && !sourceNode?.data?.dateValue) {
        newEdge.data = { timelineDate: targetNode.data.dateValue };
        if (sourceNode && sourceNode.data.nodeType !== 'timeline') {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === sourceNode.id
                ? { ...n, data: { ...n.data, dateValue: targetNode.data.dateValue } }
                : n
            )
          );
        }
      }

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, setNodes, nodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const addNodeAtPosition = useCallback(
    (type, position) => {
      if (!type || !NODE_TYPE_MAP[type]) return;

      const snappedX = Math.round(position.x / SNAP_GRID) * SNAP_GRID;
      const snappedY = Math.round(position.y / SNAP_GRID) * SNAP_GRID;

      const isTimeline = type === 'timeline';
      const isMedia = type === 'media';
      const reactFlowType = isTimeline
        ? 'timelineNode'
        : isMedia
        ? 'mediaNode'
        : 'osintNode';

      const newNode = {
        id: getId(),
        type: reactFlowType,
        position: { x: snappedX, y: snappedY },
        data: { nodeType: type, label: '' },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !NODE_TYPE_MAP[type]) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNodeAtPosition(type, position);
    },
    [reactFlowInstance, addNodeAtPosition]
  );

  // Mobile tap-to-place: when a node type is pending, tapping the canvas places it
  const onPaneClick = useCallback(
    (event) => {
      if (!isMobile || !pendingNodeType || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNodeAtPosition(pendingNodeType, position);
      onNodePlaced?.();
    },
    [isMobile, pendingNodeType, reactFlowInstance, addNodeAtPosition, onNodePlaced]
  );

  const onNodesDelete = useCallback((deleted) => {
    // React Flow handles edge deletion automatically
  }, []);

  // Right-click / long-press → open quick-search
  const openQuickSearch = useCallback((clientX, clientY) => {
    // Position the search so it doesn't overflow viewport
    const x = Math.min(clientX, window.innerWidth - 260);
    const y = Math.min(clientY, window.innerHeight - 320);
    setQuickSearchPos({ x, y });
  }, []);

  const closeQuickSearch = useCallback(() => {
    setQuickSearchPos(null);
  }, []);

  const handleQuickSelect = useCallback(
    (nodeType) => {
      if (!reactFlowInstance || !quickSearchPos) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: quickSearchPos.x,
        y: quickSearchPos.y,
      });
      addNodeAtPosition(nodeType, position);
      setQuickSearchPos(null);
    },
    [reactFlowInstance, quickSearchPos, addNodeAtPosition]
  );

  // Right-click on canvas
  const handleContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      openQuickSearch(event.clientX, event.clientY);
    },
    [openQuickSearch]
  );

  // Long-press on mobile
  const touchStartRef = useRef(null);

  const handleTouchStart = useCallback(
    (event) => {
      // Only on mobile, and only if not interacting with a node
      if (!isMobile) return;
      if (event.target.closest('.react-flow__node')) return;
      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      longPressTimer.current = setTimeout(() => {
        if (touchStartRef.current) {
          openQuickSearch(touchStartRef.current.x, touchStartRef.current.y);
        }
      }, 500);
    },
    [isMobile, openQuickSearch]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long-press if finger moves
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartRef.current = null;
  }, []);

  // Listen for clear-canvas event from Sidebar
  useEffect(() => {
    const handler = () => {
      isUndoRedoing.current = true;
      setNodes([]);
      setEdges([]);
      setTimeout(() => { isUndoRedoing.current = false; }, 0);
    };
    window.addEventListener('clear-canvas', handler);
    return () => window.removeEventListener('clear-canvas', handler);
  }, [setNodes, setEdges]);

  return (
    <div
      className="canvas-wrapper"
      ref={reactFlowWrapper}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {isMobile && pendingNodeType && (
        <div className="canvas-placement-hint">
          <span>
            Tap canvas to place{' '}
            <strong>
              {NODE_TYPE_MAP[pendingNodeType]?.label || pendingNodeType}
            </strong>
          </span>
          <button
            className="canvas-placement-cancel"
            onClick={() => onNodePlaced?.()}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Quick-search floating box */}
      {quickSearchPos && (
        <QuickSearch
          position={quickSearchPos}
          onSelect={handleQuickSelect}
          onClose={closeQuickSearch}
        />
      )}

      {/* Undo/Redo toolbar */}
      <div className="undo-redo-toolbar">
        <button
          className="undo-redo-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          className="undo-redo-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↪
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        nodeTypes={nodeTypes}
        defaultViewport={defaultViewport}
        snapToGrid
        snapGrid={[SNAP_GRID, SNAP_GRID]}
        selectionMode={SelectionMode.Partial}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView={false}
        minZoom={0.1}
        maxZoom={4}
        panOnScroll={false}
        zoomOnScroll={true}
        selectNodesOnDrag={false}
        panActivationKeyCode="Space"
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={SNAP_GRID}
          size={1}
          color="#1a1a2e"
        />
        <Controls
          showInteractive={false}
          style={{
            background: '#111',
            border: '1px solid #333',
            borderRadius: 8,
            ...(isMobile ? { transform: 'scale(1.3)', transformOrigin: 'bottom left', marginBottom: 8, marginLeft: 8 } : {}),
          }}
        />
        {!isMobile && (
          <MiniMap
            nodeColor={(node) => {
              const nt = node.data?.nodeType;
              return NODE_TYPE_MAP[nt]?.color || '#555';
            }}
            maskColor="#000000cc"
            style={{
              background: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: 8,
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
});

export default Canvas;
