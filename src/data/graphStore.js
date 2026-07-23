const STORAGE_KEY = 'osintboard_graphs';

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

  if (existing) {
    existing.nodes = nodes;
    existing.edges = edges;
    existing.savedAt = now;
  } else {
    graphs.push({ id: uid(), name, nodes, edges, savedAt: now });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
}

export function loadGraph(id) {
  const graphs = loadAll();
  const g = graphs.find((g) => g.id === id);
  return g || null;
}

export function deleteGraph(id) {
  const graphs = loadAll().filter((g) => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(graphs));
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

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
