import { useEffect, useMemo, useRef, useState } from 'react';
import { makeHarmonics, sampleContour, toSmoothPath } from '@nexfluid/core';
import { DIRECTIONS, THEMES } from '@nexfluid/foundation';
import { NexFrame, NexIcon, NexNav, NexProvider, NexSegmented } from '@nexfluid/react';
import { PAGES, SECTIONS } from './registry.tsx';
import { href, useRoute } from './router.ts';
import { useSettings, type DocsSettings } from './settings.ts';

/** Marca: una gota fija generada por el propio motor. */
const MARK = toSmoothPath(sampleContour({ points: 18, base: { kind: 'superellipse', exponent: 3.2 }, harmonics: makeHarmonics(5), ambient: 0.1, phase: 0.3 }), { scale: 10, cx: 12, cy: 12 });

function Brand() {
  return (
    <a className="doc-brand" href={href('inicio')}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d={MARK} fill="var(--nx-fluid)" /></svg>
      <span className="doc-brand-word">NexFluid<span className="nx-serif">ui</span></span>
    </a>
  );
}

const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function Search({ query, setQuery, first }: { query: string; setQuery: (q: string) => void; first: string | undefined }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]');
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="doc-search" role="search">
      <NexIcon name="search" />
      <input
        ref={input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar componentes, fundamentos…"
        aria-label="Buscar en la documentación"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && first) location.hash = href(first);
          if (e.key === 'Escape') setQuery('');
        }}
      />
      <kbd title="Atajo: Ctrl+K o /">Ctrl K</kbd>
    </div>
  );
}

function Navigation({ current, query }: { current: string; query: string }) {
  const q = normalize(query.trim());
  const visible = PAGES.filter((p) => !q || normalize(`${p.title} ${p.section} ${p.keywords ?? ''}`).includes(q));
  return (
    <div className="doc-nav-wrap">
      <p className="nx-visually-hidden" role="status" aria-live="polite">{q ? `${visible.length} resultados` : ''}</p>
      <NexNav aria-label="Documentación">
        {SECTIONS.map((section, i) => {
          const pages = visible.filter((p) => p.section === section);
          if (pages.length === 0) return null;
          return (
            <NexNav.Group key={section} label={`${String(i + 1).padStart(2, '0')} · ${section}`}>
              {pages.map((p) => (
                <NexNav.Item key={p.path} href={href(p.path)} current={p.path === current}>
                  {p.title}
                </NexNav.Item>
              ))}
            </NexNav.Group>
          );
        })}
      </NexNav>
      {visible.length === 0 && <p className="doc-nav-empty">Nada coincide con «{query}». Las piezas propuestas están en la hoja de ruta.</p>}
    </div>
  );
}

function Settings({ settings, set }: { settings: DocsSettings; set: (p: Partial<DocsSettings>) => void }) {
  return (
    <div className="doc-settings" role="group" aria-label="Preferencias de la documentación">
      <label className="doc-select">
        <span>Dirección</span>
        <select aria-label="Dirección" value={settings.direction} onChange={(e) => set({ direction: e.target.value })}>
          {Object.entries(DIRECTIONS).map(([id, d]) => <option key={id} value={id}>{d.name}</option>)}
        </select>
      </label>
      <label className="doc-select">
        <span>Tema</span>
        <select aria-label="Tema" value={settings.theme} onChange={(e) => set({ theme: e.target.value })}>
          {Object.entries(THEMES).map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
        </select>
      </label>
      <NexSegmented
        aria-label="Movimiento"
        density="compact"
        value={settings.reducedMotion === 'reduce' ? 'none' : settings.motion}
        onValueChange={(v) => set(v === 'none' ? { motion: 'none', reducedMotion: 'reduce' } : { motion: v as DocsSettings['motion'], reducedMotion: 'system' })}
        options={[{ value: 'none', label: 'Quieto' }, { value: 'subtle', label: 'Sutil' }, { value: 'fluid', label: 'Fluido' }]}
      />
    </div>
  );
}

export function App() {
  const route = useRoute();
  const [settings, set] = useSettings();
  const [query, setQuery] = useState('');
  const page = PAGES.find((p) => p.path === route.path);
  const content = useMemo(() => page?.render(route.tab) ?? <NotFound path={route.path} />, [page, route.tab, route.path]);
  const q = normalize(query.trim());
  const first = PAGES.find((p) => q && normalize(`${p.title} ${p.section} ${p.keywords ?? ''}`).includes(q))?.path;

  useEffect(() => {
    document.title = page ? `${page.title} · NexDocs` : 'NexDocs';
    document.querySelector('.doc-shell > .nx-frame .nx-frame__canvas')?.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    document.documentElement.dataset.nxTheme = settings.theme;
    document.documentElement.style.colorScheme = THEMES[settings.theme as keyof typeof THEMES]?.scheme ?? 'light';
  }, [settings.theme]);

  return (
    <NexProvider theme={settings.theme} direction={settings.direction} density={settings.density} motion={settings.motion} reducedMotion={settings.reducedMotion} canvas className="doc-shell">
      <a className="doc-skip" href="#contenido-doc" onClick={(e) => { e.preventDefault(); (document.querySelector('.doc-shell .nx-frame__canvas') as HTMLElement | null)?.focus(); }}>
        Saltar al contenido
      </a>
      <NexFrame
        identity={<Brand />}
        heading={<Search query={query} setQuery={setQuery} first={first} />}
        actions={<Settings settings={settings} set={set} />}
        navigation={<Navigation current={route.path} query={query} />}
        navigationLabel="Índice"
        navigationRole="complementary"
        inspectorLabel="Propiedades"
        canvasLabel={page?.title ?? 'Contenido'}
      >
        <div className="doc-canvas" id="contenido-doc">{content}</div>
      </NexFrame>
    </NexProvider>
  );
}

function NotFound({ path }: { path: string }) {
  return (
    <article className="doc-page">
      <p className="nx-index">404</p>
      <h1 className="nx-type-display">No existe «{path}»</h1>
      <p className="doc-lead">Puede que sea una pieza propuesta. Revisa el <a href={href('hoja-de-ruta')}>catálogo y la hoja de ruta</a>.</p>
    </article>
  );
}
