const STORAGE_KEY = 'osintboard_graphs';
const LAST_OPEN_KEY = 'osintboard_last_open';

let idCounter = Date.now();
const uid = () => `graph_${++idCounter}`;

export function listGraphs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const graphs = raw ? JSON.parse(raw) : [];
    return graphs.map(({ id, name, savedAt }) => ({ id, name, savedAt }));
  } catch {
    return [];
  }
}

export function saveGraph(name, nodes, edges) {
  const graphs = loadAll();
  const now = new Date().toISOString();
  const existing = graphs.find((g) => g.name === name);

  let graph;
  if (existing) {
    existing.nodes = nodes;
    existing.edges = edges;
    existing.savedAt = now;
    graph = existing;
  } else {
    graph = { id: uid(), name, nodes, edges, savedAt: now };
    graphs.push(graph);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
  setLastOpenGraphId(graph.id);
  return graph;
}

export function loadGraph(id) {
  const graphs = loadAll();
  const g = graphs.find((g) => g.id === id);
  return g || null;
}

export function deleteGraph(id) {
  const graphs = loadAll().filter((g) => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
  // Clear last-open if it was the deleted graph
  if (getLastOpenGraphId() === id) {
    clearLastOpenGraph();
  }
}

export function duplicateGraph(id, newName) {
  const graphs = loadAll();
  const src = graphs.find((g) => g.id === id);
  if (!src) return null;
  const now = new Date().toISOString();
  const copy = {
    ...src,
    id: uid(),
    name: newName || `${src.name} (copy)`,
    savedAt: now,
  };
  graphs.push(copy);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
  return copy;
}

// --- Last-opened graph tracking ---

export function getLastOpenGraphId() {
  try {
    return localStorage.getItem(LAST_OPEN_KEY);
  } catch {
    return null;
  }
}

export function setLastOpenGraphId(id) {
  try {
    localStorage.setItem(LAST_OPEN_KEY, id);
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function clearLastOpenGraph() {
  try {
    localStorage.removeItem(LAST_OPEN_KEY);
  } catch {
    // ignore
  }
}

export function getLastOpenGraph() {
  const id = getLastOpenGraphId();
  if (!id) return null;
  return loadGraph(id);
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function exportGraphToFile(name, nodes, edges) {
  const data = { name, nodes, edges, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.osintboard.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importGraphFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.nodes || !data.edges) {
          reject(new Error('Invalid graph file — missing nodes or edges'));
          return;
        }
        resolve({
          nodes: data.nodes,
          edges: data.edges,
          name: data.name || null,
        });
      } catch (e) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
