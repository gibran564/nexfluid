import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NexMarkdown, markdownOutline } from '@eclipsis/react/markdown';
import { NexMarkdownEditor, NexMarkdownWidget } from '@eclipsis/react/widgets';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const type = (el: HTMLTextAreaElement, value: string) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});

describe('markdownOutline', () => {
  it('da los mismos id que NexMarkdown (repetidos, marcas en línea, código cercado)', () => {
    const src = '# Guía\n\n## Uno **fuerte**\n\n```md\n## no es título\n```\n\n## Uno fuerte\n\n### [Enlace](https://x.y) y `código`';
    const outline = markdownOutline(src, 'p-');
    expect(outline.map((h) => [h.level, h.text, h.id])).toEqual([
      [1, 'Guía', 'p-guia'], [2, 'Uno fuerte', 'p-uno-fuerte'], [2, 'Uno fuerte', 'p-uno-fuerte-1'], [3, 'Enlace y código', 'p-enlace-y-codigo'],
    ]);
    act(() => root.render(<NexMarkdown source={src} idPrefix="p-" />));
    const ids = Array.from(container.querySelectorAll('h1, h2, h3, h4')).map((h) => h.id);
    expect(ids).toEqual(outline.map((h) => h.id));
  });
});

describe('ids de títulos estables', () => {
  it('en StrictMode (doble render) los id no cambian ni ganan sufijos', () => {
    const src = '## Uno\n\ntexto\n\n## Dos\n\n## Uno';
    act(() => root.render(<StrictMode><NexMarkdown source={src} idPrefix="s-" /></StrictMode>));
    expect(Array.from(container.querySelectorAll('h2')).map((h) => h.id)).toEqual(['s-uno', 's-dos', 's-uno-1']);
  });
});

describe('edición en vivo', () => {
  it('NexMarkdownEditor pinta lo escrito con NexMarkdown en cada cambio', () => {
    act(() => root.render(<NexMarkdownEditor label="nota.md" defaultValue="# Hola" />));
    const area = container.querySelector('textarea')!;
    expect(area.labels?.[0]?.textContent).toBe('nota.md');
    type(area, '## Nuevo título\n\n**negrita**');
    expect(container.querySelector('.nx-md-editor__preview h3')?.textContent).toBe('Nuevo título');
    expect(container.querySelector('.nx-md-editor__preview strong')?.textContent).toBe('negrita');
    expect(container.querySelector('.nx-md-editor__count')?.textContent).toContain('4 palabras');
  });

  it('NexMarkdownWidget editable: la fuente es un campo y la vista previa cambia', () => {
    act(() => root.render(<NexMarkdownWidget title="Doc" source="Hola" editable defaultMode="source" modes={['preview', 'source']} />));
    const area = container.querySelector<HTMLTextAreaElement>('textarea')!;
    type(area, 'Adiós *mundo*');
    act(() => container.querySelector<HTMLElement>('[role="tab"]')!.click());
    expect(container.querySelector('.nx-tabs__panel em')?.textContent).toBe('mundo');
  });

  it('sin editable, la fuente sigue siendo un bloque de código de sólo lectura', () => {
    act(() => root.render(<NexMarkdownWidget title="Doc" source="Hola" defaultMode="source" />));
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelector('.nx-code')).not.toBeNull();
  });
});
