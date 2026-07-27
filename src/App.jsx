import { useState, useCallback, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import GraphModal from './components/GraphModal';
import Timeline from './components/Timeline';
import { saveGraph, loadGraph } from './data/graphStore';
import './App.css';

function App() {
  const [modalMode, setModalMode] = useState(null);
  const [graphName, setGraphName] = useState('Untitled');
  const [showTimeline, setShowTimeline] = useState(false);
  const [graphSnapshot, setGraphSnapshot] = useState({ nodes: [], edges: [] });
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

  const handleGraphChange = useCallback((snapshot) => {
    setGraphSnapshot(snapshot);
  }, []);

  const toggleTimeline = useCallback(() => {
    setShowTimeline((prev) => !prev);
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
          onToggleTimeline={toggleTimeline}
          timelineActive={showTimeline}
        />
        <Canvas ref={canvasRef} onGraphChange={handleGraphChange} />
        {showTimeline && (
          <Timeline
            nodes={graphSnapshot.nodes}
            edges={graphSnapshot.edges}
            onClose={() => setShowTimeline(false)}
          />
        )}
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
