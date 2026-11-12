import { Handle, Position } from 'reactflow';

const HANDLE_BASE = {
  width: 10,
  height: 10,
  border: '2px solid #000',
};

// One visible source handle per side. Order matters: when an edge has no
// explicit sourceHandle React Flow falls back to the first source handle, so
// "bottom" stays first to keep legacy top-to-bottom edges looking right.
const SOURCE_HANDLES = [
  { id: 'bottom-source', position: Position.Bottom, offset: { bottom: -5 } },
  { id: 'right-source', position: Position.Right, offset: { right: -5 } },
  { id: 'left-source', position: Position.Left, offset: { left: -5 } },
  { id: 'top-source', position: Position.Top, offset: { top: -5 } },
];

// Invisible target handles sit exactly on top of the visible source dots so
// every side can both start a connection and accept one while only a single
// dot is drawn. isConnectableStart=false keeps them out of the way (no
// pointer events) until a connection is in progress, so dragging from the
// visible dot always starts a connection; isConnectableEnd=true makes them
// valid drop targets.
const TARGET_HANDLES = [
  { id: 'top-target', position: Position.Top, offset: { top: -5 } },
  { id: 'left-target', position: Position.Left, offset: { left: -5 } },
  { id: 'right-target', position: Position.Right, offset: { right: -5 } },
  { id: 'bottom-target', position: Position.Bottom, offset: { bottom: -5 } },
];

export default function NodeHandles({ color }) {
  return (
    <>
      {TARGET_HANDLES.map(({ id, position, offset }) => (
        <Handle
          key={id}
          id={id}
          type="target"
          position={position}
          isConnectableStart={false}
          style={{ ...HANDLE_BASE, ...offset, opacity: 0 }}
        />
      ))}
      {SOURCE_HANDLES.map(({ id, position, offset }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          isConnectableEnd={false}
          style={{ ...HANDLE_BASE, ...offset, background: color }}
        />
      ))}
    </>
  );
}
