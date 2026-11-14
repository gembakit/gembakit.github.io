import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/inter-tight';
import './index.css';
import { App } from './App';
import { db } from './data/db';
import { installHealth } from './data/health';

// Antes de la primera lectura: el diagnóstico mide también la apertura de la base.
installHealth(db);

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root');

createRoot(root).render(
  <StrictMode>
    <App withServiceWorker={import.meta.env.PROD} />
  </StrictMode>,
);
