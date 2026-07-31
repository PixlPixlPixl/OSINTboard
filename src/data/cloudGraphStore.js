import { pb } from '@serverfire/shared-auth';

const COLLECTION = 'notebook_entries';

function requireAuth() {
  if (!pb?.authStore?.isValid || !pb.authStore.model?.id) {
    throw new Error('Please log in to use cloud boards.');
  }
  return pb.authStore.model.id;
}

function normalize(record) {
  let graph = {};
  try {
    graph = typeof record.content === 'string' ? JSON.parse(record.content) : (record.content || {});
  } catch {
    throw new Error('Invalid cloud board response.');
  }
  return {
    id: record.id,
    name: record.title || 'Untitled board',
    nodes: graph.nodes || [],
    edges: graph.edges || [],
    savedAt: record.updated || record.created,
  };
}

export async function listCloudGraphs() {
  requireAuth();
  const records = await pb.collection(COLLECTION).getFullList({ sort: '-updated' });
  return records.map(normalize);
}

export async function saveCloudGraph({ id, name, nodes, edges }) {
  const owner = requireAuth();
  const payload = {
    user_id: owner,
    title: name,
    content: JSON.stringify({ nodes, edges }),
    labels: ['osintboard'],
  };
  const record = id
    ? await pb.collection(COLLECTION).update(id, payload)
    : await pb.collection(COLLECTION).create(payload);
  return normalize(record);
}

export async function loadCloudGraph(id) {
  requireAuth();
  return normalize(await pb.collection(COLLECTION).getOne(id));
}

export async function deleteCloudGraph(id) {
  requireAuth();
  await pb.collection(COLLECTION).delete(id);
}

export function getCloudUser() {
  return pb?.authStore?.isValid ? pb.authStore.model : null;
}

export { COLLECTION as CLOUD_GRAPHS_COLLECTION };

export default {
  listCloudGraphs,
  saveCloudGraph,
  loadCloudGraph,
  deleteCloudGraph,
};
