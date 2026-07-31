import { useState, useCallback, useRef, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useAuth } from '@serverfire/shared-auth/react';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import GraphModal from './components/GraphModal';
import CloudGraphModal, { CloudLoginPrompt } from './components/CloudGraphModal';
import {
  saveGraph,
  getLastOpenGraph,
  setLastOpenGraphId,
  clearLastOpenGraph,
  exportGraphToFile,
  importGraphFromFile,
} from './data/graphStore';
import { listCloudGraphs, saveCloudGraph, loadCloudGraph } from './data/cloudGraphStore';
import './App.css';

const MOBILE_BREAKPOINT = 768;

// Demo graph shown on very first launch (no saved graphs, no last-open)
const DEMO_NODES = [
  {
    id: 'osint_1',
    type: 'osintNode',
    position: { x: 300, y: 200 },
    data: { nodeType: 'person', label: 'Target Name' },
  },
  {
    id: 'osint_2',
    type: 'osintNode',
    position: { x: 100, y: 400 },
    data: { nodeType: 'phone', label: '' },
  },
  {
    id: 'osint_3',
    type: 'osintNode',
    position: { x: 500, y: 400 },
    data: { nodeType: 'email', label: '' },
  },
];

const DEMO_EDGES = [
  {
    id: 'e1-2',
    source: 'osint_1',
    target: 'osint_2',
    style: { stroke: '#888', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed', color: '#888' },
  },
  {
    id: 'e1-3',
    source: 'osint_1',
    target: 'osint_3',
    style: { stroke: '#888', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed', color: '#888' },
  },
];

function App() {
  const { isAuthenticated } = useAuth();
  const [modalMode, setModalMode] = useState(null);
  const [graphName, setGraphName] = useState('Untitled');
  const [importError, setImportError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [cloudBoards, setCloudBoards] = useState([]);
  const [cloudBoardId, setCloudBoardId] = useState(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState(null);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);
  const [pendingNodeType, setPendingNodeType] = useState(null);
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT
  );
  const canvasRef = useRef(null);
  const importInputRef = useRef(null);

  // On mount: load last-open graph, or show demo if nothing saved yet
  useEffect(() => {
    const lastGraph = getLastOpenGraph();
    if (lastGraph) {
      canvasRef.current?.loadSnapshot(lastGraph.nodes, lastGraph.edges);
      setGraphName(lastGraph.name);
    } else {
      // First launch — show demo
      canvasRef.current?.loadSnapshot(DEMO_NODES, DEMO_EDGES);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track viewport size for mobile detection
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
        setPendingNodeType(null);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Mobile: user tapped a node type in the sidebar — close & arm for placement
  const handleSelectNodeType = useCallback((nodeType) => {
    setPendingNodeType(nodeType);
    setSidebarOpen(false);
  }, []);

  // Mobile: node was placed on canvas — clear pending type
  const handleNodePlaced = useCallback(() => {
    setPendingNodeType(null);
  }, []);

  const openModal = useCallback((mode) => {
    setModalMode(mode);
    setCloudError(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
  }, []);

  const handleSave = useCallback(
    (name) => {
      const snapshot = canvasRef.current?.getSnapshot();
      if (!snapshot) return;
      saveGraph(name, snapshot.nodes, snapshot.edges);
      setGraphName(name);
    },
    []
  );

  // Quick-save / Save: use the current board name if it has one,
  // otherwise open the naming modal
  const handleSaveCurrent = useCallback((e) => {
    e?.currentTarget?.blur();
    if (graphName && graphName !== 'Untitled') {
      const snapshot = canvasRef.current?.getSnapshot();
      if (!snapshot) {
        showToast('Nothing to save', 'error');
        return;
      }
      try {
        saveGraph(graphName, snapshot.nodes, snapshot.edges);
        showToast('Saved', 'success');
      } catch {
        showToast('Save failed', 'error');
      }
    } else {
      openModal('save');
    }
  }, [graphName, openModal, showToast]);

  const handleCloudSave = useCallback(async () => {
    if (!isAuthenticated) {
      openModal('cloud-login');
      return;
    }
    const snapshot = canvasRef.current?.getSnapshot();
    if (!snapshot) return;
    setCloudLoading(true);
    try {
      const board = await saveCloudGraph({
        id: cloudBoardId,
        name: graphName === 'Untitled' ? 'Untitled board' : graphName,
        ...snapshot,
      });
      setCloudBoardId(board.id);
      setGraphName(board.name);
      showToast('Saved to cloud', 'success');
    } catch (error) {
      showToast(error.message || 'Cloud save failed', 'error');
    } finally {
      setCloudLoading(false);
    }
  }, [cloudBoardId, graphName, isAuthenticated, openModal, showToast]);

  const refreshCloudBoards = useCallback(async () => {
    if (!isAuthenticated) return;
    setCloudLoading(true);
    setCloudError(null);
    try {
      setCloudBoards(await listCloudGraphs());
    } catch (error) {
      setCloudError(error.message || 'Unable to load cloud boards');
    } finally {
      setCloudLoading(false);
    }
  }, [isAuthenticated]);

  const handleCloudLoad = useCallback(() => {
    openModal(isAuthenticated ? 'cloud-load' : 'cloud-login');
  }, [isAuthenticated, openModal]);

  const loadCloudBoard = useCallback(async (id) => {
    setCloudLoading(true);
    try {
      const board = await loadCloudGraph(id);
      canvasRef.current?.loadSnapshot(board.nodes, board.edges);
      setGraphName(board.name);
      setCloudBoardId(board.id);
      closeModal();
      showToast('Loaded from cloud', 'success');
    } catch (error) {
      setCloudError(error.message || 'Cloud load failed');
    } finally {
      setCloudLoading(false);
    }
  }, [closeModal, showToast]);

  const handleLoad = useCallback(
    (nodes, edges, name, graphId) => {
      canvasRef.current?.loadSnapshot(nodes, edges);
      setGraphName(name || 'Untitled');
      if (graphId) {
        setLastOpenGraphId(graphId);
      }
    },
    []
  );

  const handleNew = useCallback(() => {
    canvasRef.current?.loadSnapshot([], []);
    setGraphName('Untitled');
    clearLastOpenGraph();
    setCloudBoardId(null);
  }, []);

  const handleExport = useCallback(() => {
    const snapshot = canvasRef.current?.getSnapshot();
    if (!snapshot) return;
    exportGraphToFile(graphName, snapshot.nodes, snapshot.edges);
  }, [graphName]);

  const handleImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportError(null);
      try {
        const { nodes, edges, name } = await importGraphFromFile(file);
        canvasRef.current?.loadSnapshot(nodes, edges);
        setGraphName(name || 'Untitled');
        setCloudBoardId(null); // imported board is a different board
      } catch (err) {
        setImportError(err.message);
      }
      e.target.value = '';
    },
    []
  );

  return (
    <ReactFlowProvider>
      <div className={`app ${isMobile ? 'app--mobile' : ''}`}>
        {isMobile && (
          <header className="mobile-header">
            <button
              className="mobile-header__hamburger"
              onClick={toggleSidebar}
              aria-label="Toggle menu"
            >
              <span className="hamburger-icon">
                <span />
                <span />
                <span />
              </span>
            </button>
            <span className="mobile-header__title">{graphName}</span>
            <button
              className="mobile-header__action"
              onClick={handleSaveCurrent}
              title={graphName !== 'Untitled' ? 'Save' : 'Save as…'}
            >
              💾
            </button>
          </header>
        )}
        {toast && (
          <div className={`toast-notification toast-notification--${toast.type}`}>
            {toast.message}
          </div>
        )}
        <Sidebar
          graphName={graphName}
          importError={importError}
          isMobile={isMobile}
          isOpen={sidebarOpen}
          pendingNodeType={pendingNodeType}
          onClose={closeSidebar}
          onSelectNodeType={handleSelectNodeType}
          onSave={handleSaveCurrent}
          onLoad={() => openModal('load')}
          onNew={handleNew}
          onDelete={() => openModal('delete')}
          onExport={handleExport}
          onImport={handleImport}
          cloudAvailable={isAuthenticated}
          onCloudSave={handleCloudSave}
          onCloudLoad={handleCloudLoad}
        />
        <Canvas
          ref={canvasRef}
          isMobile={isMobile}
          pendingNodeType={pendingNodeType}
          onNodePlaced={handleNodePlaced}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".json,.osintboard.json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </div>
      {modalMode && !modalMode.startsWith('cloud-') && (
        <GraphModal
          mode={modalMode}
          onClose={closeModal}
          onSave={handleSave}
          onLoad={handleLoad}
        />
      )}
      {modalMode === 'cloud-load' && (
        <CloudGraphModal
          boards={cloudBoards}
          loading={cloudLoading}
          error={cloudError}
          onClose={closeModal}
          onRefresh={refreshCloudBoards}
          onLoad={loadCloudBoard}
        />
      )}
      {modalMode === 'cloud-login' && (
        <CloudLoginPrompt
          onClose={closeModal}
          loginUrl={`https://auth.serverfire.net/?redirect=${encodeURIComponent(window.location.href)}`}
        />
      )}
    </ReactFlowProvider>
  );
}

export default App;
