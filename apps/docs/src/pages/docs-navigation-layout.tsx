import { NexButton, NexCard, NexFrame, NexIcon, NexNav, NexSegmented, NexTab, NexTabs } from '@nexfluid/react';
import { NexExplorerWidget, NexInspectorWidget } from '@nexfluid/react/widgets';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx } from '../docs/kit.tsx';
import { example } from '../examples/index.ts';

const MOTIONS = ['none', 'subtle', 'fluid', 'elastic'] as const;
const TAB_APPEARANCES = ['liquid', 'thread', 'editorial', 'compact'] as const;

function DemoTabs({ appearance, motion, orientation = 'horizontal', activation = 'automatic', density = 'comfortable', disabled = false }: { appearance: (typeof TAB_APPEARANCES)[number]; motion: (typeof MOTIONS)[number]; orientation?: 'horizontal' | 'vertical'; activation?: 'automatic' | 'manual'; density?: 'compact' | 'comfortable' | 'spacious'; disabled?: boolean }) {
  return (
    <NexTabs defaultValue="preview" appearance={appearance} motion={motion} orientation={orientation} activation={activation} density={density}>
      <NexTabs.List aria-label="Vistas">
        <NexTab value="preview">Vista previa</NexTab>
        <NexTab value="code">Código</NexTab>
        <NexTab value="api" disabled={disabled}>API</NexTab>
        <NexTab value="examples">Ejemplos de uso</NexTab>
      </NexTabs.List>
      <NexTabs.Panel value="preview">El panel nuevo emerge desde la pestaña que lo abrió.</NexTabs.Panel>
      <NexTabs.Panel value="code">Panel «Código».</NexTabs.Panel>
      <NexTabs.Panel value="api">Panel «API».</NexTabs.Panel>
      <NexTabs.Panel value="examples">Panel «Ejemplos de uso».</NexTabs.Panel>
    </NexTabs>
  );
}

const tabNav = example('tab-navigation');
const settings = example('settings-tabs');

export const tabsDoc: ComponentDoc = {
  path: 'componentes/tabs',
  name: 'NexTabs',
  eyebrow: 'Componentes · Navegación',
  summary: 'Pestañas accesibles con una gota líquida: el borde que avanza tira, el otro le sigue con viscosidad y, mientras se estira, se le forma un cuello. Al pasar sobre otra pestaña, la gota se inclina hacia ella; el panel nuevo emerge desde la pestaña.',
  status: 'piloto',
  imports: [{ names: ['NexTabs', 'NexTab'], from: '@nexfluid/react' }],
  origin: <>necesidad de 20 <code>role="tablist"</code> propios y de <code>CellViewTabs</code> en Nextudio</>,
  controls: [
    { kind: 'select', name: 'appearance', label: 'Apariencia', options: TAB_APPEARANCES, initial: 'liquid' },
    { kind: 'select', name: 'motion', label: 'Movimiento', options: MOTIONS, initial: 'fluid' },
    { kind: 'select', name: 'orientation', label: 'Orientación', options: ['horizontal', 'vertical'], initial: 'horizontal' },
    { kind: 'select', name: 'activation', label: 'Activación', options: ['automatic', 'manual'], initial: 'automatic' },
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable', 'spacious'], initial: 'comfortable' },
    { kind: 'boolean', name: 'disabled', label: 'Pestaña API deshabilitada', initial: false },
  ],
  render: (v) => (
    <div style={{ width: '100%' }}>
      <DemoTabs key={`${v.orientation}${v.appearance}`} appearance={v.appearance as never} motion={v.motion as never} orientation={v.orientation as never} activation={v.activation as never} density={v.density as never} disabled={Boolean(v.disabled)} />
    </div>
  ),
  code: (v) =>
    jsx('NexTabs', { defaultValue: 'preview', appearance: v.appearance as string, motion: v.motion as string, orientation: v.orientation as string, activation: v.activation as string, density: v.density as string }, [
      jsx('NexTabs.List', { 'aria-label': 'Vistas' }, [
        jsx('NexTab', { value: 'preview' }, 'Vista previa'),
        jsx('NexTab', { value: 'code' }, 'Código'),
        jsx('NexTab', { value: 'api', disabled: Boolean(v.disabled) || undefined }, 'API'),
      ]),
      jsx('NexTabs.Panel', { value: 'preview' }, '<Preview />'),
      jsx('NexTabs.Panel', { value: 'code' }, '<Code />'),
      jsx('NexTabs.Panel', { value: 'api' }, '<Api />'),
    ], { appearance: 'liquid', motion: 'subtle', orientation: 'horizontal', activation: 'automatic', density: 'comfortable' }),
  variants: () => (
    <div className="doc-stack">
      {TAB_APPEARANCES.map((a) => (
        <figure key={a} className="doc-variant doc-variant--wide">
          <DemoTabs appearance={a} motion="fluid" />
          <figcaption><code>appearance="{a}"</code> · {a === 'liquid' ? 'gota rellena sobre pista hundida' : a === 'thread' ? 'hilo que se estrecha al estirarse' : a === 'editorial' ? 'titulares con hilo de tinta' : 'gota pequeña de acento'}</figcaption>
        </figure>
      ))}
    </div>
  ),
  states: () => (
    <div className="doc-stack">
      {MOTIONS.map((m) => (
        <figure key={m} className="doc-variant doc-variant--wide">
          <DemoTabs appearance="liquid" motion={m} />
          <figcaption><code>motion="{m}"</code></figcaption>
        </figure>
      ))}
    </div>
  ),
  api: [
    {
      component: 'NexTabs',
      rows: [
        { name: 'value / defaultValue', type: 'string', description: 'Controlado o no controlado.' },
        { name: 'onValueChange', type: '(value: string) => void', description: 'Al seleccionar por puntero o teclado.' },
        { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Cambia las flechas y aria-orientation; la gota fluye en vertical.' },
        { name: 'activation', type: "'automatic' | 'manual'", default: "'automatic'", description: 'manual: las flechas mueven el foco; Intro/Espacio seleccionan.' },
        { name: 'appearance', type: "'liquid' | 'thread' | 'editorial' | 'compact'", default: "'liquid'", description: 'Forma de la gota y de la pista.' },
        { name: 'density · motion', type: 'NexDensity · NexMotion', default: 'contexto', description: 'Sólo el puntero anima; teclado y movimiento reducido son inmediatos.' },
      ],
    },
    { component: 'NexTabs.List (NexTabsList)', rows: [{ name: 'aria-label', type: 'string', description: 'Nombre del grupo. Las pestañas deben ser hijas directas. Puede vivir en otra región (p. ej. herramientas de NexFrame).' }] },
    { component: 'NexTab', rows: [{ name: 'value', type: 'string', description: 'Identificador; genera los id de pestaña y panel.' }, { name: 'disabled · icon · trailing · textValue', type: 'boolean · ReactNode · string', description: 'Deshabilitada (las flechas la saltan), icono, contenido final y reserva de ancho en negrita.' }] },
    { component: 'NexTabs.Panel (NexTabsPanel)', rows: [{ name: 'value', type: 'string', description: 'Pestaña asociada.' }, { name: 'keepMounted', type: 'boolean', default: 'false', description: 'Mantiene montado el contenido oculto.' }] },
  ],
  examples: [
    { title: 'Navegación por pestañas', description: 'Documento, código y salidas, con iconos y contador.', ...tabNav },
    { title: 'Configuración en vertical', description: 'Activación manual y una pestaña deshabilitada.', ...settings },
  ],
  keyboard: [
    ['Tab', 'Entra en la pestaña activa; el siguiente Tab va al panel'],
    ['→ / ←', 'Siguiente / anterior (vertical: ↓ / ↑), salta deshabilitadas y da la vuelta'],
    ['Inicio / Fin', 'Primera / última pestaña habilitada'],
    ['Intro / Espacio', 'Selecciona (activación manual)'],
  ],
  a11y: [
    'Patrón ARIA Tabs con id estables (useId) válidos en SSR; aria-controls sólo apunta a paneles montados.',
    'Roving tabindex: una sola pestaña alcanzable con Tab; el panel es enfocable.',
    'La gota es un SVG aria-hidden; sin JavaScript, la pestaña activa se marca con CSS.',
    'La negrita de la pestaña activa no cambia su ancho.',
  ],
};

const inspector = example('inspector-layout');
const region = example('frame-region');

export const frameDoc: ComponentDoc = {
  path: 'layouts/frame',
  name: 'NexFrame',
  eyebrow: 'Layouts',
  summary: 'El espacio como sistema: un campo con zonas cromáticas sobre el que flotan membranas (superior, navegación, explorador, lienzo, inspector, dock). Las regiones vacías no ocupan columna; las cerradas se retraen a un riel; en foco, el lienzo crece; en móvil el inspector es una hoja.',
  status: 'piloto',
  wide: true,
  imports: [{ names: ['NexFrame', 'NexFrameRegion'], from: '@nexfluid/react' }],
  origin: <>el contrato de regiones del marco de Nextudio</>,
  controls: [
    { kind: 'select', name: 'variant', label: 'Variante', options: ['floating', 'joined', 'flush'], initial: 'floating' },
    { kind: 'select', name: 'layout', label: 'Disposición', options: ['split', 'focus'], initial: 'split' },
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable'], initial: 'compact' },
    { kind: 'boolean', name: 'navigation', label: 'Navegación', initial: true },
    { kind: 'boolean', name: 'explorer', label: 'Explorador', initial: true },
    { kind: 'boolean', name: 'inspector', label: 'Inspector', initial: true },
    { kind: 'boolean', name: 'resizable', label: 'Inspector redimensionable', initial: true },
    { kind: 'boolean', name: 'bottom', label: 'Dock inferior', initial: false },
  ],
  render: (v) => (
    <NexFrame
      key={String(v.layout)}
      height={560}
      canvasAs="div"
      variant={v.variant as never}
      layout={v.layout as never}
      density={v.density as never}
      identity={<strong>NexBook</strong>}
      heading={<span className="doc-muted">Práctica 3 · Colas</span>}
      actions={<NexButton appearance="filled" density="compact">Publicar</NexButton>}
      navigation={v.navigation ? <div style={{ padding: 10 }}><NexNav aria-label="Demo"><NexNav.Item href="#/layouts/frame" current icon={<NexIcon name="file" />}>Mi estudio</NexNav.Item><NexNav.Item href="#/layouts/frame" icon={<NexIcon name="grid" />}>Explorar</NexNav.Item></NexNav></div> : undefined}
      navigationLabel="Navegación de la demo"
      explorer={v.explorer ? <NexExplorerWidget aria-label="Archivos" defaultSelected="a" nodes={[{ id: 'a', label: 'enunciado.md', icon: <NexIcon name="file" /> }, { id: 'b', label: 'colas.py', icon: <NexIcon name="code" /> }]} /> : undefined}
      tools={<NexTabs defaultValue="doc" density="compact" appearance="compact"><NexTabs.List aria-label="Modo"><NexTab value="doc">Documento</NexTab><NexTab value="code">Código</NexTab></NexTabs.List></NexTabs>}
      inspector={v.inspector ? <div style={{ padding: 10 }}><NexInspectorWidget sections={[{ id: 'b', title: 'Bloque', groups: [{ items: [{ label: 'Tipo', value: 'Código' }, { label: 'Líneas', value: '14' }] }] }]} /></div> : undefined}
      inspectorResizable={Boolean(v.resizable)}
      bottom={v.bottom ? <div style={{ padding: '10px 16px', fontFamily: 'var(--nx-font-mono)', fontSize: 13 }}>&gt; python colas.py · 4.2 min</div> : undefined}
    >
      <div style={{ padding: 24, display: 'grid', gap: 16 }}>
        <NexCard appearance="editorial"><NexCard.Title>Lienzo</NexCard.Title><NexCard.Description>El marco no conoce rutas, sesiones ni permisos: coloca, retrae y expande.</NexCard.Description></NexCard>
        <NexSegmented aria-label="Ejemplo" options={[{ value: 'a', label: 'Uno' }, { value: 'b', label: 'Dos' }]} />
      </div>
    </NexFrame>
  ),
  code: (v) =>
    jsx('NexFrame', {
      variant: v.variant as string, layout: v.layout as string, density: v.density as string,
      identity: { code: '<Logo />' }, heading: { code: '<DocumentTitle />' }, actions: { code: '<PublishButton />' },
      navigation: v.navigation ? { code: '<AppNavigation />' } : undefined,
      explorer: v.explorer ? { code: '<FileExplorer />' } : undefined,
      tools: { code: '<ModeTabs />' },
      inspector: v.inspector ? { code: '<PropertiesPanel />' } : undefined,
      inspectorResizable: v.inspector && v.resizable ? true : undefined,
      bottom: v.bottom ? { code: '<Console />' } : undefined,
    }, '<EditorWorkspace />', { variant: 'floating', layout: 'split', density: 'comfortable' }),
  variants: () => (
    <div className="doc-stack">
      {(['floating', 'joined', 'flush'] as const).map((variant) => (
        <figure key={variant} className="doc-variant doc-variant--wide">
          <NexFrame height={220} canvasAs="div" variant={variant} density="compact" explorerLabel={`Explorador (${variant})`} inspectorLabel={`Inspector (${variant})`} canvasLabel={`Lienzo (${variant})`} identity={<strong>Nex</strong>} heading={`variant="${variant}"`} explorer={<p style={{ padding: 12, margin: 0 }}>Explorador</p>} inspector={<p style={{ padding: 12, margin: 0 }}>Inspector</p>} inspectorToggle={false}>
            <p style={{ padding: 16, margin: 0 }}>Lienzo</p>
          </NexFrame>
          <figcaption><code>{variant}</code> · {variant === 'floating' ? 'membranas separadas por costuras' : variant === 'joined' ? 'una superficie con costuras finas' : 'a sangre, para incrustar'}</figcaption>
        </figure>
      ))}
    </div>
  ),
  api: [
    {
      component: 'NexFrame',
      rows: [
        { name: 'children', type: 'ReactNode', description: 'Lienzo.' },
        { name: 'identity · heading · actions · tools · filters', type: 'ReactNode', description: 'Membrana superior.' },
        { name: 'navigation · explorer · inspector · bottom', type: 'ReactNode', description: 'Regiones. Navegación: cajón bajo 1080 px. Inspector: hoja inferior bajo 760 px.' },
        { name: 'variant', type: "'floating' | 'joined' | 'flush'", default: "'floating'", description: 'Separación y unión de superficies.' },
        { name: 'layout', type: "'split' | 'focus'", default: "'split'", description: 'focus retrae explorador e inspector a rieles.' },
        { name: 'explorerOpen / inspectorOpen (+ default…, on…Change)', type: 'boolean', description: 'Abiertos o retraídos a riel.' },
        { name: 'inspectorResizable · inspectorWidth · …MinWidth · …MaxWidth', type: 'boolean · number', default: '300 (220–480)', description: 'Separador con arrastre y teclado.' },
        { name: 'height · canvasAs · *Label', type: '…', description: 'Alto, elemento del lienzo y nombres de regiones.' },
      ],
    },
    { component: 'NexFrameRegion / useNexFrame', rows: [{ name: 'region', type: 'NexFrameRegionName', description: 'Destino del portal; en SSR se pinta en su sitio hasta hidratar.' }] },
  ],
  examples: [
    { title: 'Layout con inspector', description: 'Explorador en árbol, inspector plegable y disposición Dividido/Foco.', ...inspector },
    { title: 'Regiones desde el lienzo', description: 'Una pantalla coloca herramientas y acciones en el marco con NexFrameRegion.', ...region },
  ],
  keyboard: [
    ['Tab', 'Recorre la membrana superior, las regiones y el lienzo'],
    ['Escape', 'Cierra el cajón o la hoja del inspector y devuelve el foco'],
    ['← / → (separador)', 'Ensancha / estrecha el inspector 16 px (Mayús: 64 px)'],
  ],
  a11y: [
    'Regiones con nombre: navegación, explorador (region), lienzo, inspector (complementary), dock.',
    'Una región retraída deja un riel con un botón con nombre («Mostrar inspector») y su contenido inerte.',
    'Botones de cajón e inspector con aria-expanded y aria-controls; separador con role="separator" y valores.',
    'Con teclado, el marco no anima (data-nx-input="keyboard").',
  ],
};
