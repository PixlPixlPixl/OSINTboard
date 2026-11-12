/**
 * Edge handle routing helpers.
 *
 * Every node exposes a handle on each of its four sides (see NodeHandles.jsx),
 * so edges can leave and enter from the side that faces the other node instead
 * of always running top -> bottom. Handle sides are recomputed from node
 * geometry whenever an edge is created or a node is moved, which keeps larger
 * graphs readable and lets the auto layout stay tidy.
 */

// Fallback node size when React Flow has not measured the node yet.
const DEFAULT_NODE_SIZE = { width: 200, height: 100 };

const boxOf = (node) => {
  // Nodes are all top level, so `position` is already absolute.
  const position = node.position ?? { x: 0, y: 0 };
  const width = node.width ?? node.measured?.width ?? DEFAULT_NODE_SIZE.width;
  const height = node.height ?? node.measured?.height ?? DEFAULT_NODE_SIZE.height;

  return {
    width,
    height,
    cx: position.x + width / 2,
    cy: position.y + height / 2,
  };
};

/**
 * Pick the handle ids for an edge between two nodes.
 *
 * The side is chosen by the largest gap between the nodes' borders, so an
 * edge leaves through the side that actually points at the other node:
 *   target to the right  -> source right, target left
 *   target below         -> source bottom, target top
 *
 * @returns {{ sourceHandle?: string, targetHandle?: string }}
 */
export function getEdgeHandles(sourceNode, targetNode) {
  if (!sourceNode || !targetNode) return {};

  const source = boxOf(sourceNode);
  const target = boxOf(targetNode);

  const dx = target.cx - source.cx;
  const dy = target.cy - source.cy;

  const horizontalGap = Math.abs(dx) - (source.width + target.width) / 2;
  const verticalGap = Math.abs(dy) - (source.height + target.height) / 2;

  if (horizontalGap >= verticalGap) {
    return dx >= 0
      ? { sourceHandle: 'right-source', targetHandle: 'left-target' }
      : { sourceHandle: 'left-source', targetHandle: 'right-target' };
  }

  return dy >= 0
    ? { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
    : { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
}

/**
 * Re-route every edge to match the current node geometry. Edges that are
 * already correct are returned untouched (same object), so callers can bail
 * out of a state update when nothing changed.
 */
export function reorientEdges(edges, nodes) {
  if (!edges.length || !nodes?.length) return edges;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  let changed = false;

  const next = edges.map((edge) => {
    const handles = getEdgeHandles(byId.get(edge.source), byId.get(edge.target));
    if (!handles.sourceHandle) return edge;
    if (
      edge.sourceHandle === handles.sourceHandle &&
      edge.targetHandle === handles.targetHandle
    ) {
      return edge;
    }

    changed = true;
    return { ...edge, ...handles };
  });

  return changed ? next : edges;
}
