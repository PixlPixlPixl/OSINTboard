import { useState, useCallback, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import GraphModal from './components/GraphModal';
import { saveGraph, loadGraph, exportGraphToFile, importGraphFromFile } from './data/graphStore';
import './App.css';

function App() {
  const [modalMode, setModalMode] = useState(null);
  const [graphName, setGraphName] = useState('Untitled');
  const [importError, setImportError] = useState(null);
  const canvasRef = useRef(null);
  const importInputRef = useRef(null);

  const openModal = useCallback((mode) => {
    setModalMode(mode);
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

  const handleLoad = useCallback(
    (nodes, edges, name) => {
      canvasRef.current?.loadSnapshot(nodes, edges);
      setGraphName(name || 'Untitled');
    },
    []
  );

  const handleNew = useCallback(() => {
    canvasRef.current?.loadSnapshot([], []);
    setGraphName('Untitled');
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
        setGraphName(name);
      } catch (err) {
        setImportError(err.message);
      }
      e.target.value = '';
    },
    []
  );

  return (
    <ReactFlowProvider>
      <div className="app">
        <Sidebar
          graphName={graphName}
          importError={importError}
          onSave={() => openModal('save')}
          onLoad={() => openModal('load')}
          onNew={handleNew}
          onDelete={() => openModal('delete')}
          onExport={handleExport}
          onImport={handleImport}
        />
        <Canvas ref={canvasRef} />
        <input
          ref={importInputRef}
          type="file"
          accept=".json,.osintboard.json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </div>
      {modalMode && (
        <GraphModal
          mode={modalMode}
          onClose={closeModal}
          onSave={handleSave}
          onLoad={handleLoad}
        />
      )}
    </ReactFlowProvider>
  );
}

export default App;
