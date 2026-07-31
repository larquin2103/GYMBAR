import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './index.css';

// Actualizaciones silenciosas del service worker (ver docs/10).
registerSW({ immediate: true });

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('No se encontró el elemento #root');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
