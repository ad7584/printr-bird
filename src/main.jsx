// ============================================================
// React entry. Mounts the App tree under #root.
// App wraps everything in PrivyProvider; inside, the LoginGate
// shows a login overlay until the user is authenticated, then
// reveals the GameShell which initializes Phaser.
// ============================================================
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
