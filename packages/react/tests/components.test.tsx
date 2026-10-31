import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NexBadge, NexButton, NexCard, NexCodeBlock, NexFrame, NexFrameRegion, NexIconButton, NexIcon, NexProvider, NexTab,
  NexTabs, NexTabsList, NexTabsPanel,
} from '@nexfluid/react';
import { NexMarkdown } from '@nexfluid/react/markdown';
import { NexMarkdownWidget, NexPropertiesWidget } from '@nexfluid/react/widgets';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(node: ReactNode) {
  act(() => root.render(node));
  return container;
}

const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(container.querySelectorAll<T>(sel));
const key = (el: Element, k: string) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); });
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });

async function violations(node: Element = container) {
  const result = await axe.run(node, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

describe('NexButton', () => {
  it('es un <button type="button"> con las variantes como atributos', () => {
    render(<NexButton appearance="filled" density="compact">Crear proyecto</NexButton>);
    const b = $('button');
    expect(b.getAttribute('type')).toBe('button');
    expect(b.dataset.nxAppearance).toBe('filled');
    expect(b.dataset.nxDensity).toBe('compact');
    expect(b.textContent).toBe('Crear proyecto');
  });

  it('loading: aria-busy, conserva el foco y bloquea el clic', () => {
    const onClick = vi.fn();
    render(<NexButton loading onClick={onClick}>Guardar</NexButton>);
    const b = $('button');
    expect(b.getAttribute('aria-busy')).toBe('true');
    expect(b.getAttribute('aria-disabled')).toBe('true');
    expect(b.hasAttribute('disabled')).toBe(false);
    click(b);
    expect(onClick).not.toHaveBeenCalled();
    expect(b.textContent).toContain('Cargando');
  });

  it('con href es un enlace; deshabilitado pierde el href', () => {
    render(<><NexButton href="/docs">Docs</NexButton><NexButton href="/x" disabled>No</NexButton></>);
    const [a, off] = $$<HTMLAnchorElement>('a');
    expect(a!.getAttribute('href')).toBe('/docs');
    expect(off!.hasAttribute('href')).toBe(false);
    expect(off!.getAttribute('aria-disabled')).toBe('true');
  });

  it('NexIconButton exige y expone un nombre accesible', async () => {
    render(<NexIconButton label="Copiar enlace" icon={<NexIcon name="copy" />} />);
    expect($('button').getAttribute('aria-label')).toBe('Copiar enlace');
    expect($('button').dataset.nxIconOnly).toBe('');
    expect(await violations()).toEqual([]);
  });

  it('movimiento físico desactivado con movimiento reducido: no toca transform', () => {
    render(<NexProvider reducedMotion="reduce"><NexButton motion="elastic">Pulsar</NexButton></NexProvider>);
    const b = $('button');
    act(() => { b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); });
    expect(b.style.transform).toBe('');
  });
});

describe('NexBadge', () => {
  it('nunca comunica sólo con color: el punto es decorativo y el texto existe', () => {
    render(<NexBadge tone="success" dot>Publicado</NexBadge>);
    expect($('.nx-badge__dot').getAttribute('aria-hidden')).toBe('true');
    expect($('.nx-badge').textContent).toBe('Publicado');
    expect($('.nx-badge').dataset.nxTone).toBe('success');
  });
});

describe('NexCard', () => {
  it('compone cabecera, título con nivel, contenido y pie', async () => {
    render(
      <NexCard headingLevel={2} appearance="editorial" interactive>
        <NexCard.Header actions={<NexButton appearance="ghost">Abrir</NexButton>}>
          <NexCard.Eyebrow>Proyecto</NexCard.Eyebrow>
          <NexCard.Title><NexCard.Link href="/p/1">Análisis de demanda</NexCard.Link></NexCard.Title>
          <NexCard.Description>Python · 3 archivos</NexCard.Description>
        </NexCard.Header>
        <NexCard.Content>Contenido</NexCard.Content>
        <NexCard.Footer>Actualizado hoy</NexCard.Footer>
      </NexCard>,
    );
    expect($('article.nx-card').dataset.nxAppearance).toBe('editorial');
    expect($('h2.nx-card__title').textContent).toBe('Análisis de demanda');
    expect($('article.nx-card').dataset.nxRole).toBe('surface');
    expect($('.nx-card .nx-surface__shape').getAttribute('aria-hidden')).toBe('true');
    expect(await violations()).toEqual([]);
  });

  it('default se normaliza a outlined y selected se refleja', () => {
    render(<NexCard appearance="default" selected><NexCard.Title>X</NexCard.Title></NexCard>);
    expect($('.nx-card').dataset.nxAppearance).toBe('outlined');
    expect($('.nx-card').dataset.nxSelected).toBe('');
  });
});

describe('NexTabs', () => {
  function Tabs(props: { activation?: 'automatic' | 'manual'; onValueChange?: (v: string) => void; value?: string }) {
    return (
      <NexTabs defaultValue="preview" {...props}>
        <NexTabs.List aria-label="Vista">
          <NexTab value="preview">Preview</NexTab>
          <NexTab value="code">Code</NexTab>
          <NexTab value="api" disabled>API</NexTab>
          <NexTab value="examples">Examples</NexTab>
        </NexTabs.List>
        <NexTabs.Panel value="preview">Panel preview</NexTabs.Panel>
        <NexTabs.Panel value="code">Panel code</NexTabs.Panel>
        <NexTabs.Panel value="api">Panel api</NexTabs.Panel>
        <NexTabs.Panel value="examples">Panel examples</NexTabs.Panel>
      </NexTabs>
    );
  }
  const tabs = () => $$<HTMLButtonElement>('[role="tab"]');

  it('relaciona pestañas y paneles y deja una sola pestaña alcanzable con Tab', async () => {
    render(<Tabs />);
    const [preview] = tabs();
    const panel = document.getElementById(preview!.getAttribute('aria-controls')!)!;
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(preview!.id);
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1, -1]);
    expect($$('[role="tabpanel"]:not([hidden])').map((p) => p.textContent)).toEqual(['Panel preview']);
    expect(await violations()).toEqual([]);
  });

  it('automática: flechas seleccionan, saltan deshabilitadas y dan la vuelta; Inicio/Fin', () => {
    const onChange = vi.fn();
    render(<Tabs onValueChange={onChange} />);
    act(() => tabs()[0]!.focus());
    key(tabs()[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[1]);
    key(tabs()[1]!, 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[3]);
    key(tabs()[3]!, 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[0]);
    key(tabs()[0]!, 'End');
    expect(document.activeElement).toBe(tabs()[3]);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['code', 'examples', 'preview', 'examples']);
    expect(tabs()[3]!.getAttribute('aria-selected')).toBe('true');
  });

  it('manual: las flechas mueven el foco sin seleccionar; Intro selecciona', () => {
    render(<Tabs activation="manual" />);
    act(() => tabs()[0]!.focus());
    key(tabs()[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[0]!.getAttribute('aria-selected')).toBe('true');
    click(tabs()[1]!);
    expect(tabs()[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('una pestaña deshabilitada no se selecciona al pulsarla', () => {
    render(<Tabs />);
    click(tabs()[2]!);
    expect(tabs()[2]!.getAttribute('aria-selected')).toBe('false');
    expect(tabs()[2]!.getAttribute('aria-disabled')).toBe('true');
  });

  it('controlada: sólo cambia cuando el dueño cambia value', () => {
    const onChange = vi.fn();
    render(<Tabs value="preview" onValueChange={onChange} />);
    click(tabs()[1]!);
    expect(onChange).toHaveBeenCalledWith('code');
    expect(tabs()[0]!.getAttribute('aria-selected')).toBe('true');
    render(<Tabs value="code" onValueChange={onChange} />);
    expect(tabs()[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('sin paneles (lista como selector) no apunta aria-controls a ids inexistentes', async () => {
    render(
      <NexTabs defaultValue="a">
        <NexTabsList aria-label="Modo"><NexTab value="a">A</NexTab><NexTab value="b">B</NexTab></NexTabsList>
      </NexTabs>,
    );
    expect(tabs().every((t) => !t.hasAttribute('aria-controls'))).toBe(true);
    expect(await violations()).toEqual([]);
  });

  it('el indicador es decorativo y el panel inactivo no monta su contenido salvo keepMounted', () => {
    render(
      <NexTabs defaultValue="a">
        <NexTabsList aria-label="X"><NexTab value="a">A</NexTab><NexTab value="b">B</NexTab></NexTabsList>
        <NexTabsPanel value="a">A</NexTabsPanel>
        <NexTabsPanel value="b" keepMounted><input aria-label="campo" /></NexTabsPanel>
      </NexTabs>,
    );
    expect($('.nx-liquid').getAttribute('aria-hidden')).toBe('true');
    expect($('input')).not.toBeNull();
  });
});

describe('NexFrame', () => {
  it('pinta sólo las regiones con contenido y conserva sus destinos', async () => {
    render(
      <NexFrame height={600} canvasAs="div" identity="Nextudio" heading={<h1>Proyecto</h1>} inspector={<p>Propiedades</p>}>
        <p>Lienzo</p>
      </NexFrame>,
    );
    const region = (r: string) => $(`[data-nexframe-region="${r}"]`);
    expect(region('heading').hasAttribute('data-empty')).toBe(false);
    expect(region('tools').hasAttribute('data-empty')).toBe(true);
    expect(region('bottom').hasAttribute('data-empty')).toBe(true);
    expect(region('inspector').textContent).toContain('Propiedades');
    expect(region('canvas').textContent).toBe('Lienzo');
    expect(await violations()).toEqual([]);
  });

  it('NexFrameRegion lleva contenido del lienzo a su región (portal)', () => {
    render(
      <NexFrame height={600} canvasAs="div">
        <NexFrameRegion region="tools"><button type="button">Ejecutar</button></NexFrameRegion>
        <p>Lienzo</p>
      </NexFrame>,
    );
    const tools = $('[data-nexframe-region="tools"]');
    expect(tools.textContent).toBe('Ejecutar');
    expect(tools.hasAttribute('data-empty')).toBe(false);
    expect($('[data-nexframe-region="canvas"]').textContent).toBe('Lienzo');
  });

  it('el botón del inspector lo muestra y oculta con aria-expanded', () => {
    render(<NexFrame height={600} canvasAs="div" inspector={<p>Props</p>}>X</NexFrame>);
    const toggle = $('[data-region="inspector"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    // Cerrado no desaparece: se retrae a un riel desde el que vuelve a expandirse.
    const insp = $('[data-nexframe-region="inspector"]');
    expect(insp.hasAttribute('data-collapsed')).toBe(true);
    expect(insp.hasAttribute('data-empty')).toBe(false);
    click(insp.querySelector('.nx-frame__rail button')!);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('el separador redimensiona con teclado dentro de sus límites', () => {
    const onWidth = vi.fn();
    render(<NexFrame height={600} canvasAs="div" inspector={<p>P</p>} inspectorResizable onInspectorWidthChange={onWidth} inspectorMaxWidth={320}>X</NexFrame>);
    const sep = $('[role="separator"]');
    expect(sep.getAttribute('aria-valuenow')).toBe('300');
    key(sep, 'ArrowLeft');
    expect(sep.getAttribute('aria-valuenow')).toBe('316');
    key(sep, 'End');
    expect(sep.getAttribute('aria-valuenow')).toBe('320');
    expect(onWidth).toHaveBeenLastCalledWith(320);
  });
});

describe('NexCodeBlock', () => {
  it('colorea como texto, numera y nombra la región desplazable', async () => {
    render(<NexCodeBlock code={'const a = 1;\n// <b>hola</b>'} language="ts" title="ejemplo.ts" showLineNumbers highlightLines={[2]} />);
    expect($$('.nx-code__line')).toHaveLength(2);
    expect($('[data-token="keyword"]').textContent).toBe('const');
    expect($('b')).toBeNull();
    expect($('.nx-code__line[data-highlighted] .nx-code__ln').textContent).toBe('2');
    expect($('pre').getAttribute('aria-label')).toBe('ejemplo.ts');
    expect(await violations()).toEqual([]);
  });

  it('copia el código exacto y lo anuncia', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<NexCodeBlock code="npm run dev" language="bash" />);
    await act(async () => { $('button').click(); });
    expect(writeText).toHaveBeenCalledWith('npm run dev');
    expect($('[role="status"]').textContent).toContain('copiado');
  });
});

describe('NexMarkdown (seguridad y estructura)', () => {
  it('no interpreta HTML ni scripts y neutraliza URLs peligrosas', () => {
    render(<NexMarkdown source={'Hola <script>alert(1)</script> <img src=x onerror=alert(1)>\n\n[malo](javascript:alert(1)) [bueno](https://nextudio.dev)'} />);
    expect($('script')).toBeNull();
    expect($('img')).toBeNull();
    const links = $$<HTMLAnchorElement>('a');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://nextudio.dev']);
    expect(links[0]!.rel).toBe('noopener noreferrer');
    expect(container.textContent).toContain('malo');
  });

  it('GFM: tablas desplazables, tareas y código cercado con NexCodeBlock', async () => {
    render(<NexMarkdown source={'| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] hecho\n\n```python\nprint(1)\n```'} />);
    expect($('.nx-markdown__table table')).not.toBeNull();
    expect($<HTMLInputElement>('input[type="checkbox"]').checked).toBe(true);
    expect($('.nx-code [data-token="function"]').textContent).toBe('print');
    expect(await violations()).toEqual([]);
  });

  it('imágenes como enlace por defecto; https sólo si se permite', () => {
    render(<NexMarkdown source={'![Mapa](https://ejemplo.org/m.png) ![Mal](javascript:x)'} />);
    expect($('img')).toBeNull();
    expect($('a').textContent).toContain('Imagen: Mapa');
    render(<NexMarkdown images="https" source={'![Mapa](https://ejemplo.org/m.png)'} />);
    expect($('img').getAttribute('src')).toBe('https://ejemplo.org/m.png');
  });

  it('títulos con id único, desplazables de nivel', () => {
    render(<NexMarkdown idPrefix="doc-" headingOffset={1} source={'# Uso\n\n## Uso\n\n# Instalación rápida'} />);
    expect($$('h2,h3').map((h) => `${h.tagName}#${h.id}`)).toEqual(['H2#doc-uso', 'H3#doc-uso-1', 'H2#doc-instalacion-rapida']);
  });
});

describe('NexWidgets', () => {
  it('NexMarkdownWidget alterna vista previa y fuente sin copiar implementación', () => {
    render(<NexMarkdownWidget title="Documentación" source={'# Hola\n\nTexto'} />);
    expect($('.nx-markdown h2').textContent).toBe('Hola');
    click($$('[role="tab"]')[1]!);
    expect($('.nx-code').textContent).toContain('# Hola');
  });

  it('NexPropertiesWidget usa listas de definición', async () => {
    render(<NexPropertiesWidget title="Propiedades" groups={[{ label: 'Archivo', items: [{ label: 'Lenguaje', value: 'Python' }] }]} />);
    expect($('dt').textContent).toBe('Lenguaje');
    expect($('dd').textContent).toBe('Python');
    expect(await violations()).toEqual([]);
  });
});
