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

const INITIAL_NODES = [
  {
    id: getId(),
    type: 'osintNode',
    position: { x: 300, y: 200 },
    data: { nodeType: 'person', label: 'Target Name' },
  },
  {
    id: getId(),
    type: 'osintNode',
    position: { x: 100, y: 400 },
    data: { nodeType: 'phone', label: '' },
  },
  {
    id: getId(),
    type: 'osintNode',
    position: { x: 500, y: 400 },
    data: { nodeType: 'email', label: '' },
  },
];

const INITIAL_EDGES = [
  {
    id: 'e1-2',
    source: 'osint_1',
    target: 'osint_2',
    style: { stroke: '#888', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#888' },
  },
  {
    id: 'e1-3',
    source: 'osint_1',
    target: 'osint_3',
    style: { stroke: '#888', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#888' },
  },
];

const Canvas = forwardRef(function Canvas(props, ref) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Expose save/load to parent
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

      setNodes(newNodes);
      setEdges(newEdges);
    },
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

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !NODE_TYPE_MAP[type]) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

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
    [reactFlowInstance, setNodes]
  );

  const onNodesDelete = useCallback((deleted) => {
    // React Flow handles edge deletion automatically
  }, []);

  // Listen for clear-canvas event from Sidebar
  useEffect(() => {
    const handler = () => {
      setNodes([]);
      setEdges([]);
    };
    window.addEventListener('clear-canvas', handler);
    return () => window.removeEventListener('clear-canvas', handler);
  }, [setNodes, setEdges]);

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
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
          }}
        />
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
      </ReactFlow>
    </div>
  );
});

export default Canvas;
