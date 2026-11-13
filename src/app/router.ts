import { useEffect, useState } from 'react';

// Rutas con almohadilla (#/proyectos, #/herramientas/dpmo, …) para que la
// app funcione dentro de la subcarpeta de GitHub Pages (decisión en ESTADO.md).

export const HOME = '/proyectos';

export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : HOME;
}

export function navigate(path: string): void {
  if (currentPath() !== path) window.location.hash = path;
  window.scrollTo({ top: 0 });
}

export function useRoute(): string[] {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path.split('/').filter(Boolean);
}
