import { useEffect, useState } from 'react';

export interface Route {
  path: string;
  tab: string | null;
}

function parse(): Route {
  const raw = typeof location === 'undefined' ? '' : location.hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const tab = new URLSearchParams(query).get('tab');
  return { path: path || 'inicio', tab };
}

/** Rutas con hash: el sitio funciona como archivos estáticos, sin servidor. */
export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const update = () => setRoute(parse());
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  return route;
}

export function href(path: string, tab?: string): string {
  return `#/${path}${tab ? `?tab=${tab}` : ''}`;
}

/** Cambia la pestaña de la página sin añadir una entrada al historial. */
export function replaceTab(path: string, tab: string): void {
  history.replaceState(null, '', href(path, tab));
}
