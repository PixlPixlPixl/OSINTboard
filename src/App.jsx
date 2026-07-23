import { useState, useCallback, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import GraphModal from './components/GraphModal';
import { saveGraph, loadGraph } from './data/graphStore';
import './App.css';

function App() {
  const [modalMode, setModalMode] = useState(null); // null | 'save' | 'load' | 'delete'
  const [graphName, setGraphName] = useState('Untitled');
  const canvasRef = useRef(null);

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

  return (
    <ReactFlowProvider>
      <div className="app">
        <Sidebar
          graphName={graphName}
          onSave={() => openModal('save')}
          onLoad={() => openModal('load')}
          onNew={handleNew}
          onDelete={() => openModal('delete')}
        />
        <Canvas ref={canvasRef} />
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
