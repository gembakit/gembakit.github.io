import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/inter-tight';
import './index.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
