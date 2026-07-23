import { ReactFlowProvider } from 'reactflow';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import './App.css';

function App() {
  return (
    <ReactFlowProvider>
      <div className="app">
        <Sidebar />
        <Canvas />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
