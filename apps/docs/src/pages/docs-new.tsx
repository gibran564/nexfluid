import { NexBadge, NexIcon, NexNav, NexPanel, NexSegmented, NexSurface } from '@eclipsis/react';
import { NexExplorerWidget, NexInspectorWidget } from '@eclipsis/react/widgets';
import { PreviewPlayground } from './preview-playground.tsx';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx } from '../docs/kit.tsx';

const SHAPES = ['fluid', 'membrane', 'capsule', 'morph', 'editorial'] as const;
const MATERIALS = ['base', 'raised', 'sunken', 'clear', 'accent', 'solid', 'ink', 'fluid'] as const;

export const surfaceDoc: ComponentDoc = {
  path: 'componentes/surface',
  name: 'NexSurface',
  eyebrow: 'Componentes · Primitiva',
  summary: 'La membrana: primitiva de toda superficie de NexFluidUI. Familia geométrica, material y estados. Estática por defecto (CSS); viva cuando es interactiva (SVG dibujado por el motor).',
  status: 'piloto',
  imports: [{ names: ['NexSurface'], from: '@eclipsis/react' }],
  origin: <>la gramática propia de NexFluid Native</>,
  controls: [
    { kind: 'select', name: 'kind', label: 'Papel', options: ['surface', 'control', 'content'], initial: 'surface' },
    { kind: 'select', name: 'shape', label: 'Familia', options: ['(de la dirección)', ...SHAPES], initial: '(de la dirección)' },
    { kind: 'select', name: 'material', label: 'Material', options: MATERIALS, initial: 'raised' },
    { kind: 'boolean', name: 'interactive', label: 'Interactiva', initial: true },
    { kind: 'boolean', name: 'activatable', label: 'Activable', initial: true },
    { kind: 'boolean', name: 'selected', label: 'Seleccionada', initial: false },
  ],
  render: (v) => (
    <NexSurface
      kind={v.kind as never}
      shape={v.shape === '(de la dirección)' ? undefined : (v.shape as never)}
      material={v.material as never}
      interactive={Boolean(v.interactive)}
      activatable={Boolean(v.activatable)}
      live
      selected={Boolean(v.selected)}
      tabIndex={v.interactive ? 0 : undefined}
      style={{ width: v.kind === 'control' ? 200 : 300, height: v.kind === 'control' ? 52 : 180, display: 'grid', placeItems: 'center' }}
    >
      <span className="nx-index"><b>{String(v.material)}</b></span>
    </NexSurface>
  ),
  code: (v) => jsx('NexSurface', { kind: v.kind as string, shape: v.shape === '(de la dirección)' ? undefined : (v.shape as string), material: v.material as string, interactive: Boolean(v.interactive) || undefined, activatable: Boolean(v.activatable) || undefined, selected: Boolean(v.selected) || undefined }, '…', { kind: 'surface', material: 'base' }),
  api: [{
    component: 'NexSurface',
    rows: [
      { name: 'as', type: 'ElementType', default: "'div'", description: 'Elemento raíz (button, a, article, section…).' },
      { name: 'kind', type: "'surface' | 'control' | 'content'", default: "'surface'", description: 'Papel: toma la familia geométrica que la dirección asigna a ese papel.' },
      { name: 'shape', type: "'fluid' | 'membrane' | 'capsule' | 'morph' | 'editorial'", description: 'Fuerza una familia.' },
      { name: 'material', type: "'base' | 'raised' | 'sunken' | 'clear' | 'accent' | 'solid' | 'ink' | 'fluid'", default: "'base'", description: 'Relleno, borde y tinta.' },
      { name: 'interactive · activatable', type: 'boolean', description: 'Estados attract/deform y activación (inundación de la zona).' },
      { name: 'live', type: 'boolean', default: 'interactive', description: 'Dibuja la membrana en SVG.' },
      { name: 'selected · quiet · motion · ariaRole', type: '…', description: 'Selección, sin borde, nivel de movimiento y rol ARIA.' },
    ],
  }],
  keyboard: [['Tab', 'El foco visible pone la membrana en tensión (attract)'], ['Intro / Espacio', 'Activa (si es activable)']],
  a11y: ['La membrana SVG y la zona cromática son aria-hidden.', 'Teclado y puntero llegan a los mismos estados.', 'Movimiento reducido: cambia el color del borde, no la forma.'],
};

export const panelDoc: ComponentDoc = {
  path: 'componentes/panel',
  name: 'NexPanel',
  eyebrow: 'Componentes · Superficies',
  summary: 'Membrana elevada con cabecera y cuerpo plegable. El cuerpo cede y se recupera sin desmontarse; plegado, queda inerte.',
  status: 'piloto',
  imports: [{ names: ['NexPanel'], from: '@eclipsis/react' }],
  origin: <>paneles laterales e inspectores de Nextudio</>,
  controls: [
    { kind: 'text', name: 'title', label: 'Título', initial: 'Geometría' },
    { kind: 'boolean', name: 'collapsible', label: 'Plegable', initial: true },
    { kind: 'select', name: 'material', label: 'Material', options: MATERIALS, initial: 'raised' },
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable', 'spacious'], initial: 'comfortable' },
  ],
  render: (v) => (
    <div style={{ width: 340 }}>
      <NexPanel title={String(v.title)} collapsible={Boolean(v.collapsible)} material={v.material as never} density={v.density as never} actions={<NexBadge tone="accent" density="compact">3</NexBadge>}>
        <p className="nx-type-small" style={{ margin: 0 }}>Radio 20 px · suavizado 0.85 · atracción 5 px. El contenido no se desmonta al plegar.</p>
      </NexPanel>
    </div>
  ),
  code: (v) => jsx('NexPanel', { title: String(v.title), collapsible: Boolean(v.collapsible) || undefined, material: v.material as string, density: v.density as string }, '…', { material: 'raised', density: 'comfortable' }),
  api: [{
    component: 'NexPanel',
    rows: [
      { name: 'title · actions', type: 'ReactNode', description: 'Cabecera; el título nombra la sección (aria-labelledby).' },
      { name: 'collapsible · open · defaultOpen · onOpenChange', type: 'boolean · callback', default: 'false · — · true', description: 'Plegado con aria-expanded/aria-controls; cuerpo inerte al plegar.' },
      { name: 'material · shape · density · motion · headingLevel', type: '…', default: "'raised' · — · contexto · contexto · 3", description: 'Gramática común.' },
    ],
  }],
  keyboard: [['Tab', 'Acciones y botón de plegar'], ['Intro / Espacio', 'Pliega o despliega']],
  a11y: ['Es una section con nombre.', 'El botón de plegar anuncia aria-expanded.', 'Plegado, el cuerpo es inert: el foco no entra en contenido invisible.'],
};

export const navDoc: ComponentDoc = {
  path: 'componentes/nav',
  name: 'NexNav',
  eyebrow: 'Componentes · Navegación',
  summary: 'Navegación vertical con la misma gota líquida de las pestañas bajo el elemento actual. La gota se inclina hacia el elemento bajo el puntero. Grupos con nombre y niveles para árboles.',
  status: 'piloto',
  imports: [{ names: ['NexNav'], from: '@eclipsis/react' }],
  origin: <>barras laterales y listas de navegación de Nextudio</>,
  controls: [{ kind: 'boolean', name: 'groups', label: 'Con grupos', initial: true }, { kind: 'boolean', name: 'icons', label: 'Con iconos', initial: true }],
  render: (v) => {
    const items = (
      <>
        <NexNav.Item href="#/componentes/nav" current icon={v.icons ? <NexIcon name="file" /> : undefined}>Mi estudio</NexNav.Item>
        <NexNav.Item href="#/componentes/nav" icon={v.icons ? <NexIcon name="grid" /> : undefined}>Explorar</NexNav.Item>
        <NexNav.Item href="#/componentes/nav" icon={v.icons ? <NexIcon name="code" /> : undefined} trailing={<NexBadge density="compact" tone="accent">2</NexBadge>}>Prácticas</NexNav.Item>
      </>
    );
    return (
      <div style={{ width: 260 }}>
        <NexNav aria-label="Demo">{v.groups ? <><NexNav.Group label="Trabajo">{items}</NexNav.Group><NexNav.Group label="Cuenta"><NexNav.Item href="#/componentes/nav">Ajustes</NexNav.Item></NexNav.Group></> : items}</NexNav>
      </div>
    );
  },
  code: (v) => jsx('NexNav', { 'aria-label': 'Principal' }, v.groups ? [jsx('NexNav.Group', { label: 'Trabajo' }, [jsx('NexNav.Item', { href: '/estudio', current: true }, 'Mi estudio'), jsx('NexNav.Item', { href: '/explorar' }, 'Explorar')])] : [jsx('NexNav.Item', { href: '/estudio', current: true }, 'Mi estudio'), jsx('NexNav.Item', { href: '/explorar' }, 'Explorar')]),
  api: [
    { component: 'NexNav', rows: [{ name: 'aria-label', type: 'string', description: 'Obligatorio: nombre del landmark navigation.' }, { name: 'motion', type: 'NexMotion', description: 'Nivel de movimiento de la gota.' }] },
    { component: 'NexNav.Item (NexNavItem)', rows: [{ name: 'href · as', type: 'string · ElementType', description: 'Enlace o componente de enlace propio (Link de Next.js); sin href es un botón.' }, { name: 'current', type: 'boolean', description: 'aria-current="page" (o "true" en botones).' }, { name: 'icon · trailing · level · expanded', type: '…', description: 'Icono, contenido final, nivel de árbol y rama plegable (aria-expanded).' }] },
    { component: 'NexNav.Group (NexNavGroup)', rows: [{ name: 'label', type: 'string', description: 'Título que nombra la sublista (aria-labelledby).' }] },
  ],
  a11y: ['Landmark navigation con nombre; el actual se anuncia con aria-current.', 'Grupos como sublistas etiquetadas.', 'La gota es decorativa (aria-hidden).'],
};

export const segmentedDoc: ComponentDoc = {
  path: 'componentes/segmented',
  name: 'NexSegmented',
  eyebrow: 'Componentes · Acciones',
  summary: 'Selector de una opción entre pocas: un radiogroup con la gota líquida. Para modos, vistas, dispositivos y filtros exclusivos.',
  status: 'piloto',
  imports: [{ names: ['NexSegmented'], from: '@eclipsis/react' }],
  origin: <>chips de selección exclusiva de Nextudio</>,
  controls: [
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable', 'spacious'], initial: 'comfortable' },
    { kind: 'select', name: 'motion', label: 'Movimiento', options: ['none', 'subtle', 'fluid', 'elastic'], initial: 'fluid' },
    { kind: 'boolean', name: 'disabled', label: 'Una opción deshabilitada', initial: false },
  ],
  render: (v) => <NexSegmented aria-label="Vista" density={v.density as never} motion={v.motion as never} options={[{ value: 'day', label: 'Día' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes', disabled: Boolean(v.disabled) }, { value: 'year', label: 'Año' }]} defaultValue="week" />,
  code: (v) => jsx('NexSegmented', { 'aria-label': 'Vista', density: v.density as string, motion: v.motion as string, defaultValue: 'week', options: { code: "[{ value: 'day', label: 'Día' }, { value: 'week', label: 'Semana' }]" }, onValueChange: { code: 'setView' } }, undefined, { density: 'comfortable', motion: 'subtle' }),
  api: [{ component: 'NexSegmented', rows: [{ name: 'options', type: '{ value; label; icon?; disabled? }[]', description: 'Opciones.' }, { name: 'value · defaultValue · onValueChange', type: 'string', description: 'Controlado o no.' }, { name: 'aria-label', type: 'string', description: 'Nombre del radiogroup.' }, { name: 'density · motion', type: '…', description: 'Gramática común.' }] }],
  keyboard: [['Tab', 'Entra en la opción marcada'], ['← → ↑ ↓', 'Mueve y marca la opción siguiente o anterior'], ['Inicio / Fin', 'Primera / última']],
  a11y: ['role="radiogroup" con role="radio" y aria-checked; roving tabindex.', 'Las opciones deshabilitadas se saltan.'],
};

export const inspectorDoc: ComponentDoc = {
  path: 'widgets/inspector',
  name: 'NexInspectorWidget',
  eyebrow: 'Widgets',
  summary: 'Inspector: pila de NexPanel plegables con propiedades o controles libres. Composición de componentes públicos.',
  status: 'piloto',
  imports: [{ names: ['NexInspectorWidget'], from: '@eclipsis/react/widgets' }],
  origin: <>inspector contextual de NexFrame en Nextudio</>,
  controls: [{ kind: 'boolean', name: 'controls', label: 'Sección con controles', initial: true }],
  render: (v) => (
    <div style={{ width: 320 }}>
      <NexInspectorWidget
        sections={[
          { id: 'file', title: 'Archivo', groups: [{ items: [{ label: 'Nombre', value: 'colas.py' }, { label: 'Lenguaje', value: 'Python 3.12' }] }] },
          ...(v.controls ? [{ id: 'view', title: 'Vista', content: <NexSegmented aria-label="Vista" density="compact" options={[{ value: 'a', label: 'Código' }, { value: 'b', label: 'Salida' }]} /> }] : []),
          { id: 'run', title: 'Ejecución', defaultOpen: false, groups: [{ items: [{ label: 'Duración', value: '1.4 s' }] }] },
        ]}
      />
    </div>
  ),
  code: () => jsx('NexInspectorWidget', { sections: { code: "[{ id: 'file', title: 'Archivo', groups: [{ items: [{ label: 'Nombre', value: 'colas.py' }] }] }]" } }),
  api: [{ component: 'NexInspectorWidget', rows: [{ name: 'sections', type: '{ id; title; groups?; content?; defaultOpen? }[]', description: 'Secciones plegables.' }, { name: 'density', type: 'NexDensity', default: "'compact'", description: 'Densidad de los paneles.' }] }],
  a11y: ['Grupo con nombre; cada sección es una section con título y botón de plegar.'],
};

export const explorerDoc: ComponentDoc = {
  path: 'widgets/explorer',
  name: 'NexExplorerWidget',
  eyebrow: 'Widgets',
  summary: 'Explorador en árbol sobre NexNav: ramas plegables, selección con la gota líquida.',
  status: 'piloto',
  imports: [{ names: ['NexExplorerWidget'], from: '@eclipsis/react/widgets' }],
  origin: <>explorador de archivos de NexCode</>,
  controls: [],
  render: () => (
    <div style={{ width: 280 }}>
      <NexExplorerWidget aria-label="Archivos" defaultSelected="colas.py" defaultExpanded={['src']} nodes={[
        { id: 'src', label: 'src', icon: <NexIcon name="folder" />, children: [{ id: 'colas.py', label: 'colas.py', icon: <NexIcon name="code" /> }, { id: 'datos.csv', label: 'datos.csv', icon: <NexIcon name="grid" /> }] },
        { id: 'README.md', label: 'README.md', icon: <NexIcon name="file" />, trailing: <NexBadge density="compact">MD</NexBadge> },
      ]} />
    </div>
  ),
  code: () => jsx('NexExplorerWidget', { 'aria-label': 'Archivos', nodes: { code: 'tree' }, selected: { code: 'file' }, onSelect: { code: 'setFile' } }),
  api: [{ component: 'NexExplorerWidget', rows: [{ name: 'nodes', type: '{ id; label; icon?; trailing?; children? }[]', description: 'Árbol.' }, { name: 'selected · defaultSelected · onSelect · defaultExpanded', type: '…', description: 'Selección y ramas abiertas.' }, { name: 'aria-label', type: 'string', description: 'Nombre del landmark.' }] }],
  a11y: ['Las ramas son botones con aria-expanded; las hojas, botones con aria-current.'],
};

export const previewDoc: ComponentDoc = {
  path: 'widgets/preview',
  name: 'NexPreviewWidget',
  eyebrow: 'Widgets',
  summary: 'Vista previa: membrana con barra (título, selector de dispositivo, acciones) y un visor cuyo ancho fluye entre dispositivos con física de superficie.',
  status: 'piloto',
  imports: [{ names: ['NexPreviewWidget'], from: '@eclipsis/react/widgets' }],
  origin: <>vistas previas de NexWeb y proyectos</>,
  wide: true,
  controls: [],
  render: () => <PreviewPlayground />,
  code: () => jsx('NexPreviewWidget', { title: 'Página publicada' }, '<PublishedPage />'),
  api: [{ component: 'NexPreviewWidget', rows: [{ name: 'title · children · actions', type: '…', description: 'Cabecera y contenido.' }, { name: 'devices · defaultDevice', type: '{ value; label; width }[]', description: 'Dispositivos (por defecto Fluido, Tableta 768, Móvil 375).' }] }],
  a11y: ['Section con nombre; el selector de dispositivo es un radiogroup.'],
};
