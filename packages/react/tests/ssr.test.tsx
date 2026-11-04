import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  NexBadge, NexButton, NexCard, NexCardContent, NexCardHeader, NexCardTitle, NexCodeBlock, NexFrame, NexFrameRegion,
  NexProvider, NexTab, NexTabs, NexTabsList, NexTabsPanel, NexFlow, NexEditorialBlock, NexMenu,
} from '@nexfluid/react';
import { NexMarkdown } from '@nexfluid/react/markdown';
import { NexMarkdownWidget } from '@nexfluid/react/widgets';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function App() {
  return (
    <NexProvider theme="editorial-light" motion="fluid">
      <NexFrame height={640} canvasAs="div" identity="Nex" heading="Proyecto" inspector={<p>Inspector</p>}>
        <NexFrameRegion region="tools"><NexButton>Ejecutar</NexButton></NexFrameRegion>
        <NexTabs defaultValue="a" motion="fluid">
          <NexTabsList aria-label="Vistas">
            <NexTab value="a">Documento</NexTab>
            <NexTab value="b">Código</NexTab>
          </NexTabsList>
          <NexTabsPanel value="a">
            <NexCard interactive motion="fluid">
              <NexCardHeader><NexCardTitle>Tarjeta</NexCardTitle></NexCardHeader>
              <NexCardContent><NexBadge tone="accent">Nuevo</NexBadge></NexCardContent>
            </NexCard>
            <NexMarkdown source={'# Título\n\nTexto con `código`.\n\n```ts\nconst x = 1;\n```'} />
          </NexTabsPanel>
          <NexTabsPanel value="b"><NexCodeBlock code="print(1)" language="python" /></NexTabsPanel>
        </NexTabs>
        <NexMarkdownWidget title="Notas" source="Hola" />
        <NexFlow mode="edit" selectedId="p1" onSelect={() => {}} onReorder={() => {}} insertItems={() => [{ id: 'md', label: 'Texto', onSelect: () => {} }]}>
          <NexEditorialBlock blockId="p1" label="Párrafo 1" actions={[{ id: 'x', label: 'Duplicar', onSelect: () => {} }]} tools={<NexMenu label="Vista" items={[]} />}><p>Texto</p></NexEditorialBlock>
        </NexFlow>
      </NexFrame>
    </NexProvider>
  );
}

describe('SSR e hidratación', () => {
  it('renderiza en el servidor sin acceder a window', () => {
    const html = renderToString(<App />);
    expect(html).toContain('nx-frame');
    expect(html).toContain('role="tablist"');
    // El contenido de una región portal se pinta en su sitio antes de hidratar.
    expect(html).toContain('Ejecutar');
  });

  it('hidrata sin discrepancias ni errores', async () => {
    const html = renderToString(<App />);
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.append(host);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const recoverable: unknown[] = [];
    await act(async () => {
      hydrateRoot(host, <App />, { onRecoverableError: (e) => recoverable.push(e) });
    });
    expect(recoverable).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
    // Tras hidratar, la región portal ya está en su destino.
    expect(host.querySelector('[data-nexframe-region="tools"]')!.textContent).toBe('Ejecutar');
    errors.mockRestore();
    host.remove();
  });
});
