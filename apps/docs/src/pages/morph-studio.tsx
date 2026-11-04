import { useMemo, useRef, useState, type ReactNode } from 'react';
import { MORPH_PHYSICS, morphTimeline, morphTiming, overshootOf, resolveMorphPhysics, type MorphFrame, type MorphPhysics, type MorphPhysicsName } from '@nexfluid/core';
import {
  NexActionButton, NexBadge, NexButton, NexCard, NexCodeBlock, NexDock, NexFrame, NexIcon, NexMorph, NexProvider, NexSegmented,
  NexTab, NexTabs, type NexActionStatus, type NexMorphController,
} from '@nexfluid/react';
import { NexPropertyList } from '@nexfluid/react/widgets';
import { PageHeader, Section } from '../docs/kit.tsx';

type DemoId = 'card' | 'tabs' | 'button' | 'dock' | 'frame';
const FAMILIES = Object.keys(MORPH_PHYSICS) as MorphPhysicsName[];

const DEMOS: ReadonlyArray<{ value: DemoId; label: string; title: string; lead: string }> = [
  { value: 'card', label: 'Card → Frame', title: 'NexCard → NexFrame', lead: 'La tarjeta es el panel: presión, expansión desde su sitio, contorno que cambia de familia, título compartido, contenido coreografiado y regreso a la posición actual de la tarjeta.' },
  { value: 'tabs', label: 'Tabs', title: 'NexTabs · indicador líquido', lead: 'El borde delantero acelera, el trasero resiste, la gota adelgaza al estirarse (volumen constante) y se recoge al llegar. Cambios seguidos sin saltos.' },
  { value: 'button', label: 'Button', title: 'NexButton → superficie de acción', lead: 'Botón → carga → éxito o error, guiado por la promesa real. La caja no cambia de tamaño: cambia la membrana; el texto nunca se estira.' },
  { value: 'dock', label: 'Dock → Panel', title: 'NexDock → NexPanel', lead: 'El panel nace del botón del dock, unido por un cuello metaball que se rompe al separarse, y vuelve a él al cerrar. Teclado y foco completos.' },
  { value: 'frame', label: 'Frame', title: 'NexFrame · transición espacial', lead: 'Compacto, dividido, inspector y expandido: las columnas fluyen con física «spatial» y el contenido conserva su ancho mientras la membrana lo descubre.' },
];

const PARAMS: ReadonlyArray<{ key: keyof MorphPhysics; label: string; min: number; max: number; step: number; unit?: string }> = [
  { key: 'mass', label: 'Masa', min: 0.3, max: 3, step: 0.1 },
  { key: 'stiffness', label: 'Rigidez', min: 60, max: 1200, step: 10 },
  { key: 'damping', label: 'Amortiguación', min: 4, max: 80, step: 1 },
  { key: 'viscosity', label: 'Viscosidad τ', min: 0, max: 0.2, step: 0.005, unit: 's' },
  { key: 'tension', label: 'Tensión superficial', min: 0, max: 1, step: 0.05 },
  { key: 'deformation', label: 'Deformación', min: 0, max: 0.3, step: 0.01 },
  { key: 'settle', label: 'Umbral de reposo', min: 0.001, max: 0.02, step: 0.001 },
];

const ms = (s: number) => `${Math.round(s * 1000)} ms`;

/** Curvas de tamaño (superficie) y contenido de cada familia: comparación de presets. */
function Comparison({ current, family }: { current: MorphPhysics; family: MorphPhysicsName | 'custom' }) {
  const W = 520;
  const H = 150;
  const T = 0.9;
  const x = (t: number) => (Math.min(t, T) / T) * W;
  const y = (v: number) => H - 18 - v * (H - 40);
  const line = (p: MorphPhysics, channel: 'size' | 'content') =>
    morphTimeline(p, 1).samples.filter((_, i) => i % 4 === 0).map((s) => `${x(s.t).toFixed(1)},${y(s[channel]).toFixed(1)}`).join(' ');
  return (
    <figure className="studio-compare">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progreso de la superficie frente al tiempo para cada familia; la línea discontinua es el contenido entrante de la física actual.">
        <line x1="0" x2={W} y1={y(1)} y2={y(1)} className="doc-response-target" />
        {[0.15, 0.3, 0.55].map((t) => <line key={t} x1={x(t)} x2={x(t)} y1="8" y2={H - 14} className="studio-compare__mark" />)}
        {[0.15, 0.3, 0.55].map((t) => <text key={t} x={x(t) + 3} y={H - 4} className="studio-compare__label">{ms(t)}</text>)}
        {FAMILIES.map((name) => <polyline key={name} points={line(MORPH_PHYSICS[name], 'size')} className="studio-compare__curve" data-active={family === name || undefined} />)}
        {family === 'custom' && <polyline points={line(current, 'size')} className="studio-compare__curve" data-active="" />}
        <polyline points={line(current, 'content')} className="studio-compare__content" />
      </svg>
      <figcaption className="doc-hint">Superficie de las cinco familias (la activa resaltada) y, en discontinua, el contenido entrante: empieza cuando la superficie supera el 60 %.</figcaption>
    </figure>
  );
}

function Readout({ target }: { target: React.RefObject<HTMLDListElement | null> }) {
  return (
    <dl ref={target} className="studio-readout" aria-live="off">
      {['estado', 'superficie', 'contorno', 'entrante', 'saliente', 'velocidad'].map((k) => (
        <div key={k}><dt>{k}</dt><dd data-key={k}>—</dd></div>
      ))}
    </dl>
  );
}

function writeReadout(el: HTMLDListElement | null, f: MorphFrame) {
  if (!el) return;
  const set = (k: string, v: string) => { const n = el.querySelector(`[data-key="${k}"]`); if (n) n.textContent = v; };
  set('estado', f.state);
  set('superficie', f.size.toFixed(3));
  set('contorno', `${f.contour.toFixed(3)} · r ${f.radius.toFixed(1)} px`);
  set('entrante', f.incoming.toFixed(2));
  set('saliente', f.outgoing.toFixed(2));
  set('velocidad', `${Math.round(Math.hypot(f.velocity[0], f.velocity[1]))} px/s`);
}

// ─── Demostraciones ───────────────────────────────────────────────────────

const FILES = ['README.md', 'src/colas.py', 'src/simulacion.py', 'tests/test_colas.py'];

function CardFrameDemo({ controller, physics, onFrame }: { controller: React.Ref<NexMorphController>; physics: MorphPhysics; onFrame: (f: MorphFrame) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(false);
  return (
    <div ref={stage} className="studio-card-stage">
      <NexMorph open={open} onOpenChange={setOpen} physics={physics} controller={controller} onFrame={onFrame}>
        <div className="studio-card-grid" data-shift={shift || undefined}>
          <NexCard appearance="filled" motion="none"><NexCard.Eyebrow>Práctica 02</NexCard.Eyebrow><NexCard.Title>Mapas de calor</NexCard.Title></NexCard>
          <NexMorph.Source>
            <NexCard interactive>
              <NexCard.Header>
                <NexCard.Eyebrow>Práctica 03</NexCard.Eyebrow>
                <NexCard.Title>Colas que esperan menos</NexCard.Title>
                <NexCard.Description>Modelo M/M/1 frente a simulación.</NexCard.Description>
              </NexCard.Header>
              <NexCard.Footer>
                <NexBadge tone="accent">Python</NexBadge>
                <NexMorph.Trigger className="studio-open">Abrir espacio de trabajo</NexMorph.Trigger>
              </NexCard.Footer>
            </NexCard>
          </NexMorph.Source>
          <NexCard appearance="filled" motion="none"><NexCard.Eyebrow>Práctica 04</NexCard.Eyebrow><NexCard.Title>Grafos dirigidos</NexCard.Title></NexCard>
        </div>
        <NexMorph.Target container={stage} label="Espacio de trabajo">
          <NexFrame
            nested
            height="fill"
            variant="joined"
            motion="none"
            heading={<NexMorph.Title className="studio-frame-title">Colas que esperan menos</NexMorph.Title>}
            actions={<NexMorph.Close label="Volver a la tarjeta" />}
            explorer={<ul className="studio-files">{FILES.map((f) => <li key={f}><NexIcon name="file" /> {f}</li>)}</ul>}
            inspector={<NexPropertyList groups={[{ items: [{ label: 'Lenguaje', value: 'Python 3.12' }, { label: 'Pruebas', value: '14 / 14' }, { label: 'Modelo', value: 'M/M/1' }] }]} />}
          >
            <div className="studio-canvas">
              <p className="nx-index">colas.py</p>
              <NexCodeBlock language="python" code={'def espera_media(lam, mu):\n    """Tiempo medio en cola de una M/M/1."""\n    return lam / (mu * (mu - lam))'} />
            </div>
          </NexFrame>
        </NexMorph.Target>
      </NexMorph>
      <label className="studio-check"><input type="checkbox" checked={shift} onChange={(e) => setShift(e.target.checked)} /> Mover la tarjeta mientras está abierta (el regreso va a su posición actual)</label>
    </div>
  );
}

function TabsDemo({ step }: { step: number }) {
  const tabs = ['Resumen', 'Archivos', 'Actividad del curso', 'Ajustes'];
  const [value, setValue] = useState(tabs[0]!);
  const shown = step === 0 ? value : tabs[((step % tabs.length) + tabs.length) % tabs.length]!;
  return (
    <div className="studio-tabs">
      <NexTabs value={shown} onValueChange={setValue} motion="fluid">
        <NexTabs.List aria-label="Secciones del proyecto">
          {tabs.map((t) => <NexTab key={t} value={t}>{t}</NexTab>)}
        </NexTabs.List>
        {tabs.map((t) => <NexTabs.Panel key={t} value={t}><p className="doc-hint">Panel «{t}». Pulsa varias pestañas seguidas: el indicador se reorienta desde donde está.</p></NexTabs.Panel>)}
      </NexTabs>
    </div>
  );
}

/**
 * La acción es real: valida el texto, calcula su huella SHA-256 (Web Crypto,
 * asíncrona) y lo añade a la lista publicada. Un texto vacío o demasiado largo
 * rechaza la promesa y el botón pasa a error. Nada se simula con temporizadores.
 */
function ButtonDemo({ status }: { status?: NexActionStatus }) {
  const [text, setText] = useState('Práctica 3 · Colas que esperan menos');
  const [published, setPublished] = useState<Array<{ text: string; hash: string }>>([]);
  const [problem, setProblem] = useState('');
  const publish = async () => {
    const value = text.trim();
    if (!value) { setProblem('Escribe algo antes de publicar.'); throw new Error('vacío'); }
    if (value.length > 120) { setProblem('Máximo 120 caracteres.'); throw new Error('largo'); }
    setProblem('');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    const hash = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, '0')).join('').slice(0, 12);
    setPublished((list) => [{ text: value, hash }, ...list].slice(0, 4));
  };
  return (
    <div className="studio-button">
      <label className="studio-publish">
        <span>Título a publicar</span>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} aria-describedby="studio-publish-help" />
      </label>
      <NexActionButton status={status} action={publish} successLabel="Publicado" errorLabel="No válido" icon={<NexIcon name="drop" />}>
        Publicar práctica
      </NexActionButton>
      <p id="studio-publish-help" className="doc-hint" role="status">{problem || 'Vacío o más de 120 caracteres → error. Si no, se publica con su huella SHA-256.'}</p>
      {published.length > 0 && (
        <ol className="studio-published">{published.map((p) => <li key={p.hash}><code>{p.hash}</code> {p.text}</li>)}</ol>
      )}
    </div>
  );
}

function DockDemo({ value, onValue }: { value: string | null; onValue: (v: string | null) => void }) {
  return (
    <NexDock
      className="studio-dock"
      label="Herramientas del proyecto"
      value={value}
      onValueChange={onValue}
      items={[
        { id: 'files', label: 'Archivos', icon: <NexIcon name="folder" />, panel: <ul className="studio-files">{FILES.map((f) => <li key={f}><NexIcon name="file" /> {f}</li>)}</ul> },
        { id: 'search', label: 'Buscar', icon: <NexIcon name="search" />, panel: <p className="doc-hint">Busca en los 4 archivos del proyecto.</p> },
        { id: 'run', label: 'Ejecutar', icon: <NexIcon name="play" />, panel: <NexPropertyList groups={[{ items: [{ label: 'Última ejecución', value: 'hace 2 min' }, { label: 'Resultado', value: '14 pruebas, 0 fallos' }] }]} /> },
        { id: 'settings', label: 'Ajustes', icon: <NexIcon name="settings" />, panel: <p className="doc-hint">Intérprete: Python 3.12</p> },
      ]}
    />
  );
}

const FRAME_MODES = [
  { value: 'compact', label: 'Compacto', explorer: false, inspector: false },
  { value: 'split', label: 'Dividido', explorer: true, inspector: false },
  { value: 'inspector', label: 'Inspector', explorer: false, inspector: true },
  { value: 'expanded', label: 'Expandido', explorer: true, inspector: true },
] as const;

function FrameDemo({ mode, onMode }: { mode: number; onMode: (m: number) => void }) {
  const m = FRAME_MODES[((mode % 4) + 4) % 4]!;
  return (
    <div className="studio-frame">
      <NexSegmented aria-label="Modo del marco" value={m.value} onValueChange={(v) => onMode(FRAME_MODES.findIndex((x) => x.value === v))} options={FRAME_MODES.map(({ value, label }) => ({ value, label }))} density="compact" />
      <div className="studio-frame__host">
        <NexFrame
          nested
          height="fill"
          motion="fluid"
          explorerOpen={m.explorer}
          inspectorOpen={m.inspector}
          onExplorerOpenChange={(o) => onMode(FRAME_MODES.findIndex((x) => x.explorer === o && x.inspector === m.inspector))}
          onInspectorOpenChange={(o) => onMode(FRAME_MODES.findIndex((x) => x.inspector === o && x.explorer === m.explorer))}
          inspectorToggle={false}
          heading={<strong>simulacion.py</strong>}
          explorer={<ul className="studio-files">{FILES.map((f) => <li key={f}><NexIcon name="file" /> {f}</li>)}</ul>}
          inspector={<NexPropertyList groups={[{ items: [{ label: 'Líneas', value: '128' }, { label: 'Cobertura', value: '92 %' }, { label: 'Autor', value: 'Equipo 3' }] }]} />}
        >
          <div className="studio-canvas">
            <p>El lienzo conserva su estado y su scroll: las regiones no se desmontan al retraerse.</p>
            <label className="studio-check"><input type="text" defaultValue="λ = 0.8" aria-label="Parámetro" /> estado real que sobrevive al cambio de modo</label>
          </div>
        </NexFrame>
      </div>
    </div>
  );
}

// ─── Código real de cada demostración ─────────────────────────────────────

const CODE: Record<DemoId, string> = {
  card: `import { NexCard, NexFrame, NexMorph } from '@nexfluid/react';

const stage = useRef<HTMLDivElement>(null);

<div ref={stage} style={{ position: 'relative' }}>
  <NexMorph physics="morph" physicsOverrides={{ overshoot: 0.03 }}>
    <NexMorph.Source>
      <NexCard interactive>
        <NexCard.Title>Colas que esperan menos</NexCard.Title>   {/* elemento compartido «title» */}
        <NexMorph.Trigger>Abrir espacio de trabajo</NexMorph.Trigger>
      </NexCard>
    </NexMorph.Source>
    <NexMorph.Target container={stage}>
      <NexFrame height="fill" heading={<NexMorph.Title>Colas que esperan menos</NexMorph.Title>}
                actions={<NexMorph.Close />} explorer={…} inspector={…}>…</NexFrame>
    </NexMorph.Target>
  </NexMorph>
</div>

// O sin componer nada: <NexCard expansion={<Detalle />} expansionPhysics="viscous" />`,
  tabs: `import { NexTabs, NexTab } from '@nexfluid/react';

<NexTabs defaultValue="resumen" motion="fluid">   {/* appearance="liquid" por defecto */}
  <NexTabs.List aria-label="Secciones del proyecto">
    <NexTab value="resumen">Resumen</NexTab>
    <NexTab value="archivos">Archivos</NexTab>
  </NexTabs.List>
  <NexTabs.Panel value="resumen">…</NexTabs.Panel>
  <NexTabs.Panel value="archivos">…</NexTabs.Panel>
</NexTabs>`,
  button: `import { NexActionButton } from '@nexfluid/react';

<NexActionButton
  action={() => api.publicar(practica)}   // promesa real: pendiente → éxito | error
  successLabel="Publicado"
  errorLabel="Sin conexión"
>
  Publicar práctica
</NexActionButton>

// Controlado: <NexActionButton status={estado} onStatusChange={setEstado}>…`,
  dock: `import { NexDock, NexIcon } from '@nexfluid/react';

<div style={{ position: 'relative', height: 420 }}>
  <NexDock
    label="Herramientas del proyecto"
    physics="spatial"
    items={[
      { id: 'files', label: 'Archivos', icon: <NexIcon name="folder" />, panel: <Archivos /> },
      { id: 'run', label: 'Ejecutar', icon: <NexIcon name="play" />, panel: <Resultados /> },
    ]}
  />
</div>`,
  frame: `import { NexFrame } from '@nexfluid/react';

// compacto · dividido · inspector · expandido
<NexFrame
  motion="fluid"                 // física «spatial»; "none" = inmediato
  explorerOpen={modo.explorador}
  inspectorOpen={modo.inspector}
  explorer={<Archivos />}
  inspector={<Propiedades />}
>
  <Lienzo />
</NexFrame>`,
};

// ─── Página ───────────────────────────────────────────────────────────────

export function MorphStudioPage() {
  const [demo, setDemo] = useState<DemoId>('card');
  const [family, setFamily] = useState<MorphPhysicsName | 'custom'>('morph');
  const [custom, setCustom] = useState<MorphPhysics>(() => resolveMorphPhysics('morph'));
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [dock, setDock] = useState<string | null>(null);
  const [frameMode, setFrameMode] = useState(3);
  const [buttonStatus, setButtonStatus] = useState<NexActionStatus | undefined>(undefined);
  const controller = useRef<NexMorphController>(null);
  const readout = useRef<HTMLDListElement>(null);
  const scrubber = useRef<HTMLInputElement>(null);
  const scrubbing = useRef(false);

  const physics = useMemo(() => (family === 'custom' ? custom : resolveMorphPhysics(family)), [family, custom]);
  const timing = useMemo(() => morphTiming(physics), [physics]);
  const current = DEMOS.find((d) => d.value === demo)!;
  const scrubbable = demo === 'card';

  const onFrame = (f: MorphFrame) => {
    writeReadout(readout.current, f);
    if (scrubber.current && !scrubbing.current) scrubber.current.value = String(Math.round(Math.min(1, Math.max(0, f.size)) * 1000));
  };

  const play = (forward: boolean) => {
    if (demo === 'card') {
      if (paused) { controller.current?.resume(); setPaused(false); }
      if (forward) controller.current?.open();
      else controller.current?.close();
    } else if (demo === 'tabs') setStep((s) => s + (forward ? 1 : -1));
    else if (demo === 'dock') setDock(forward ? 'files' : null);
    else if (demo === 'frame') setFrameMode((m) => m + (forward ? 1 : -1));
    else if (demo === 'button') {
      // La operación es real: se pulsa el botón (su promesa decide éxito o error).
      setButtonStatus(forward ? undefined : 'idle');
      if (forward) setTimeout(() => document.querySelector<HTMLButtonElement>('.studio-button .nx-action')?.click(), 0);
    }
  };

  const togglePause = () => {
    const c = controller.current;
    if (!c) return;
    if (paused) c.resume();
    else c.pause();
    setPaused(!paused);
  };

  const seek = (p: number) => {
    const c = controller.current;
    if (!c) return;
    setPaused(true);
    c.pause();
    if (!c.isOpen && (c.frame()?.state ?? 'closed') === 'closed') {
      c.open();
      setTimeout(() => c.seek(p), 40);
    } else c.seek(p);
  };

  const showState = (which: 'initial' | 'final') => {
    if (demo === 'card') {
      const c = controller.current;
      if (!c) return;
      // Inicial = tarjeta; final = panel. Se colocan sin animar.
      if (which === 'initial') { c.resume(); c.close(); setTimeout(() => c.seek(1), 40); }
      else seek(1);
      setPaused(true);
    } else if (demo === 'dock') setDock(which === 'final' ? 'files' : null);
    else if (demo === 'frame') setFrameMode(which === 'final' ? 3 : 0);
    else if (demo === 'tabs') setStep(which === 'final' ? 3 : 0);
    else setButtonStatus(which === 'final' ? 'success' : 'idle');
  };

  return (
    <article className="doc-page doc-page--wide">
      <PageHeader
        eyebrow="Movimiento · NexMorph"
        title="NexMorph Studio"
        lead="Transformación continua de materia: una superficie se convierte en otra cambiando posición, tamaño, contorno y función, con el contenido coreografiado aparte. Todo lo que ves usa la API pública de @nexfluid/react y @nexfluid/core."
      />

      <div className="studio">
        <div className="studio__bar">
          <NexSegmented aria-label="Demostración" value={demo} onValueChange={(v) => { setDemo(v as DemoId); setPaused(false); }} options={DEMOS.map(({ value, label }) => ({ value, label }))} />
        </div>

        <section className="studio__main" aria-labelledby="studio-demo-title">
          <header className="studio__head">
            <h2 id="studio-demo-title" className="nx-type-heading">{current.title}</h2>
            <p className="doc-section-lead">{current.lead}</p>
          </header>
          <div className="studio__controls" role="group" aria-label="Reproducción">
            <NexButton appearance="filled" iconStart={<NexIcon name="play" />} onClick={() => play(true)}>Reproducir</NexButton>
            <NexButton onClick={() => play(false)}>Invertir</NexButton>
            <NexButton onClick={togglePause} disabled={!scrubbable} aria-pressed={paused}>{paused ? 'Reanudar' : 'Pausar'}</NexButton>
            <NexButton appearance="ghost" onClick={() => showState('initial')}>Estado inicial</NexButton>
            <NexButton appearance="ghost" onClick={() => showState('final')}>Estado final</NexButton>
            <label className="studio-check"><input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} /> Movimiento reducido</label>
          </div>
          <label className="studio-scrub">
            <span>Progreso</span>
            <input
              ref={scrubber}
              type="range"
              min={0}
              max={1000}
              defaultValue={0}
              disabled={!scrubbable}
              aria-describedby="studio-scrub-hint"
              onPointerDown={() => { scrubbing.current = true; }}
              onPointerUp={() => { scrubbing.current = false; }}
              onKeyDown={() => { scrubbing.current = true; }}
              onKeyUp={() => { scrubbing.current = false; }}
              onInput={(e) => seek(Number(e.currentTarget.value) / 1000)}
            />
          </label>
          <p id="studio-scrub-hint" className="doc-hint">
            {scrubbable
              ? 'El scrubber recorre la línea de tiempo simulada de la transformación con la física actual (pausa). Reanudar continúa desde ese punto.'
              : 'Pausa y scrubber controlan transformaciones NexMorph (Card → Frame). Tabs, botón, dock y marco reaccionan a su estado real con resortes por canal: usa Reproducir e Invertir.'}
          </p>

          <NexProvider reducedMotion={reduced ? 'reduce' : 'system'} motion="fluid" className="studio__stage">
            {demo === 'card' && <CardFrameDemo controller={controller} physics={physics} onFrame={onFrame} />}
            {demo === 'tabs' && <TabsDemo step={step} />}
            {demo === 'button' && <ButtonDemo status={buttonStatus} />}
            {demo === 'dock' && <DockDemo value={dock} onValue={setDock} />}
            {demo === 'frame' && <FrameDemo mode={frameMode} onMode={setFrameMode} />}
          </NexProvider>
          {scrubbable && <Readout target={readout} />}
        </section>

        <aside className="studio__side" aria-label="Física">
          <h2 className="nx-index">Física</h2>
          <NexSegmented aria-label="Familia" density="compact" value={family} onValueChange={(v) => setFamily(v as MorphPhysicsName | 'custom')} options={[...FAMILIES.map((f) => ({ value: f, label: f })), { value: 'custom', label: 'propia' }]} />
          <div className="studio-params">
            {PARAMS.map((p) => (
              <label key={p.key} className="studio-param">
                <span>{p.label}</span>
                <output>{physics[p.key]}{p.unit ? ` ${p.unit}` : ''}</output>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={physics[p.key]}
                  onChange={(e) => { setCustom({ ...physics, [p.key]: Number(e.target.value) }); setFamily('custom'); }}
                />
              </label>
            ))}
          </div>
          <dl className="studio-metrics">
            <div><dt>Sobrepaso</dt><dd>{(overshootOf(physics) * 100).toFixed(1)} %</dd></div>
            <div><dt>Superficie</dt><dd>{ms(timing.surface)}</dd></div>
            <div><dt>Percibida</dt><dd>{ms(timing.visual)}</dd></div>
            <div><dt>Reposo</dt><dd>{ms(timing.total)}</dd></div>
          </dl>
          <p className="doc-hint">Micro: 150–300 ms (precision, flow). Mayores: 300–550 ms (viscous, morph, spatial). Cifras calculadas con la simulación exacta del motor, no estimadas.</p>
          {!scrubbable && <p className="doc-hint">Los parámetros se aplican a Card → Frame. El resto usa su familia fija: tabs (resortes del indicador), botón (precision/flow), dock y marco (spatial).</p>}
        </aside>
      </div>

      <Section title="Comparar familias">
        <Comparison current={physics} family={family} />
      </Section>
      <Section title="Integración">
        <NexCodeBlock language="tsx" title={`${current.title} · código real`} code={CODE[demo]} />
      </Section>
      <Section title="Cómo funciona">
        <StudioNotes />
      </Section>
    </article>
  );
}

function StudioNotes(): ReactNode {
  return (
    <ul className="doc-list">
      <li><strong>Geometría, no capturas.</strong> El panel destino se monta una vez en su lugar final; en cada fotograma cambian el trazado de la membrana (48 puntos superelípticos, deformados por la velocidad conservando el área), el recorte del contenido y las transformaciones de los elementos compartidos. React no vuelve a renderizar por fotograma.</li>
      <li><strong>Canales.</strong> Posición lidera, tamaño sigue con viscosidad, contorno llega el último; el contenido entrante espera al 60 % de la superficie y al cerrar sale antes de que la superficie se mueva.</li>
      <li><strong>Interrumpible.</strong> Invertir a mitad reorienta cada canal desde su valor y velocidad actuales; el origen se mide en cada fotograma, así el regreso va a donde está ahora.</li>
      <li><strong>Movimiento reducido.</strong> El mismo estado final, sin trayecto.</li>
      <li><strong>Por qué no Motion, View Transitions o WAAPI.</strong> <code>layoutId</code> de Motion y la View Transitions API interpolan cajas o capturas (escala del contenido, fundido cruzado); WAAPI necesita keyframes conocidos de antemano y no se reorienta desde la velocidad actual. Aquí la forma es un contorno con física propia. FLIP se usa donde sirve (elementos compartidos con escala uniforme); Canvas/WebGL no hace falta para una membrana de 48 puntos.</li>
    </ul>
  );
}
