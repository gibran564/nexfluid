import type { ComponentType } from 'react';

/**
 * Cada ejemplo es un archivo real que importa sólo de los paquetes públicos.
 * Se carga dos veces: como módulo (para pintarlo) y como texto (para mostrar
 * exactamente ese código). El código copiable nunca diverge de lo que se ve.
 */
const modules = import.meta.glob<{ default: ComponentType }>('./*.tsx', { eager: true });
const sources = import.meta.glob<string>('./*.tsx', { eager: true, query: '?raw', import: 'default' });

export type ExampleId = 'project-card' | 'tab-navigation' | 'inspector-layout' | 'markdown-viewer' | 'tools-panel' | 'frame-region' | 'settings-tabs' | 'code-snippet' | 'card-expansion';

export function example(id: ExampleId): { Component: ComponentType; source: string } {
  const file = `./${id}.tsx`;
  const mod = modules[file];
  const source = sources[file];
  if (!mod || source === undefined) throw new Error(`Ejemplo inexistente: ${id}`);
  return { Component: mod.default, source };
}
