/**
 * Automatic graph layout using a layered (Sugiyama-style) approach.
 * Positions nodes top-to-bottom based on edge flow, with root nodes at the top.
 */
const NODE_WIDTH = 200;
const NODE_HEIGHT = 140;
const HORIZONTAL_GAP = 50;
const VERTICAL_GAP = 80;

/**
 * Compute optimal positions for nodes based on edge flow.
 * @param {Array} nodes - Current ReactFlow nodes
 * @param {Array} edges - Current ReactFlow edges
 * @returns {Array} nodes with updated position properties
 */
export function autoLayout(nodes, edges) {
  if (nodes.length === 0) return [];

  // Build adjacency maps
  const children = new Map(); // nodeId -> [targetIds]
  const parents = new Map();  // nodeId -> [sourceIds]

  for (const n of nodes) {
    children.set(n.id, []);
    parents.set(n.id, []);
  }

  for (const e of edges) {
    if (children.has(e.source)) {
      children.get(e.source).push(e.target);
    }
    if (parents.has(e.target)) {
      parents.get(e.target).push(e.source);
    }
  }

  // Find connected components
  const visited = new Set();
  const components = [];

  for (const n of nodes) {
    if (visited.has(n.id)) continue;

    // BFS to find all nodes in this component
    const component = new Set();
    const queue = [n.id];
    component.add(n.id);
    visited.add(n.id);

    while (queue.length > 0) {
      const current = queue.shift();
      for (const child of children.get(current) || []) {
        if (!component.has(child)) {
          component.add(child);
          visited.add(child);
          queue.push(child);
        }
      }
      for (const parent of parents.get(current) || []) {
        if (!component.has(parent)) {
          component.add(parent);
          visited.add(parent);
          queue.push(parent);
        }
      }
    }

    components.push(component);
  }

  // Layout each component independently
  const positions = new Map(); // nodeId -> { x, y, layer }
  let cumulativeOffsetX = 0;

  for (const component of components) {
    const componentNodes = [...component];
    const result = layoutComponent(componentNodes, children, parents);

    // Apply horizontal offset to position components side by side
    for (const [nodeId, pos] of result) {
      positions.set(nodeId, { ...pos, x: pos.x + cumulativeOffsetX });
    }

    // Calculate width of this component for next offset
    const maxX = Math.max(...[...result.values()].map((p) => p.x));
    cumulativeOffsetX += maxX + NODE_WIDTH + HORIZONTAL_GAP * 2;
  }

  // Return updated nodes
  return nodes.map((n) => {
    const pos = positions.get(n.id);
    if (!pos) return n; // shouldn't happen
    return { ...n, position: { x: pos.x, y: pos.y } };
  });
}

/**
 * Layout a single connected component using layered approach.
 */
function layoutComponent(nodeIds, children, parents) {
  // Compute in-degree (considering only edges within this component)
  const idSet = new Set(nodeIds);
  const inDegree = new Map();
  for (const id of nodeIds) {
    const incoming = (parents.get(id) || []).filter((p) => idSet.has(p));
    inDegree.set(id, incoming.length);
  }

  // BFS from root nodes (in-degree 0) to assign layers
  const layer = new Map();
  const queue = [];

  for (const id of nodeIds) {
    if (inDegree.get(id) === 0) {
      layer.set(id, 0);
      queue.push(id);
    }
  }

  // If no root nodes (all in cycles), pick first as root
  if (queue.length === 0) {
    layer.set(nodeIds[0], 0);
    queue.push(nodeIds[0]);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    const currentLayer = layer.get(current);

    for (const child of children.get(current) || []) {
      if (!idSet.has(child)) continue;
      const proposedLayer = currentLayer + 1;
      if (!layer.has(child) || layer.get(child) < proposedLayer) {
        layer.set(child, proposedLayer);
        // Remove from queue if already there, re-add to process with new layer
        const idx = queue.indexOf(child);
        if (idx !== -1) queue.splice(idx, 1);
        queue.push(child);
      }
    }
  }

  // Handle any nodes not reached (shouldn't happen in a connected component,
  // but could if edges only go one way in our BFS)
  const maxLayer = Math.max(...layer.values());
  for (const id of nodeIds) {
    if (!layer.has(id)) {
      layer.set(id, maxLayer + 1);
    }
  }

  // Group nodes by layer
  const layerGroups = new Map();
  for (const id of nodeIds) {
    const l = layer.get(id);
    if (!layerGroups.has(l)) layerGroups.set(l, []);
    layerGroups.get(l).push(id);
  }

  // Sort layers
  const sortedLayers = [...layerGroups.keys()].sort((a, b) => a - b);

  // Position nodes
  const positions = new Map();

  for (const l of sortedLayers) {
    const nodesInLayer = layerGroups.get(l);

    // Center-align nodes in each layer
    const totalWidth =
      nodesInLayer.length * NODE_WIDTH +
      (nodesInLayer.length - 1) * HORIZONTAL_GAP;

    // Center the row
    nodesInLayer.forEach((nodeId, i) => {
      // For each layer, position nodes centered around 0 (offset applied later)
      const x = i * (NODE_WIDTH + HORIZONTAL_GAP) - totalWidth / 2 + NODE_WIDTH / 2;
      const y = l * (NODE_HEIGHT + VERTICAL_GAP);

      positions.set(nodeId, { x: Math.round(x), y: Math.round(y), layer: l });
    });
  }

  return positions;
}
