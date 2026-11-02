import { NexBadge, NexButton, NexCard, NexIcon } from '@eclipsis/react';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx } from '../docs/kit.tsx';
import { example } from '../examples/index.ts';

const TONES = ['neutral', 'accent', 'success', 'warning', 'danger'] as const;
const CARD_APPEARANCES = ['outlined', 'filled', 'ghost', 'editorial'] as const;
const MOTIONS = ['none', 'subtle', 'fluid', 'elastic'] as const;

export const badgeDoc: ComponentDoc = {
  path: 'componentes/badge',
  name: 'NexBadge',
  eyebrow: 'Componentes · Superficies',
  summary: 'Etiqueta no interactiva para estado y metadatos. El color acompaña al texto; nunca lo sustituye.',
  status: 'piloto',
  imports: [{ names: ['NexBadge'], from: '@eclipsis/react' }],
  origin: <><code>StatusBadge</code>, <code>.tag</code>, <code>SubmissionBadge</code>, <code>ResourceStatusBadge</code></>,
  controls: [
    { kind: 'text', name: 'label', label: 'Texto', initial: 'Publicado' },
    { kind: 'select', name: 'tone', label: 'Tono', options: TONES, initial: 'success' },
    { kind: 'select', name: 'appearance', label: 'Apariencia', options: ['outlined', 'filled', 'editorial'], initial: 'outlined' },
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable', 'spacious'], initial: 'comfortable' },
    { kind: 'boolean', name: 'dot', label: 'Punto de estado', initial: true },
  ],
  render: (v) => <NexBadge tone={v.tone as never} appearance={v.appearance as never} density={v.density as never} dot={Boolean(v.dot)}>{String(v.label)}</NexBadge>,
  code: (v) => jsx('NexBadge', { tone: v.tone as string, appearance: v.appearance as string, density: v.density as string, dot: Boolean(v.dot) || undefined }, String(v.label), { tone: 'neutral', appearance: 'outlined', density: 'comfortable' }),
  variants: () => (
    <div className="doc-matrix">
      {(['outlined', 'filled', 'editorial'] as const).map((a) => (
        <div key={a} className="doc-matrix-row">
          <code>{a}</code>
          {TONES.map((t) => <NexBadge key={t} tone={t} appearance={a} dot={a !== 'editorial'}>{t}</NexBadge>)}
        </div>
      ))}
    </div>
  ),
  api: [{
    component: 'NexBadge',
    rows: [
      { name: 'tone', type: "'neutral' | 'accent' | 'success' | 'warning' | 'danger'", default: "'neutral'", description: 'Intención semántica. Contraste ≥ 4.5:1 en todos los temas (probado).' },
      { name: 'appearance', type: "'outlined' | 'filled' | 'editorial'", default: "'outlined'", description: 'editorial: metadato en mono y versalitas.' },
      { name: 'density', type: 'NexDensity', description: 'Alto 20 / 24 / 28 px.' },
      { name: 'dot', type: 'boolean', default: 'false', description: 'Punto decorativo (aria-hidden).' },
      { name: 'children', type: 'ReactNode', description: 'Texto obligatorio.' },
    ],
  }],
  a11y: ['Es un <span> sin rol: se lee como texto en su contexto.', 'El punto es aria-hidden; el estado siempre está en palabras (WCAG 1.4.1).', 'No es interactivo: para filtrar usa un botón (chip), no una insignia.'],
};

const projectCard = example('project-card');
const cardExpansion = example('card-expansion');

export const cardDoc: ComponentDoc = {
  path: 'componentes/card',
  name: 'NexCard',
  eyebrow: 'Componentes · Superficies',
  summary: 'Una membrana viva con composición editorial: índice, titular, descripción, contenido, pie y acciones. El borde cede hacia el puntero, la presión aplasta sin perder volumen y, con expansion, la tarjeta se transforma en un panel.',
  status: 'piloto',
  imports: [{ names: ['NexCard', 'NexButton', 'NexBadge'], from: '@eclipsis/react' }],
  origin: <><code>.panel</code> (115 usos), <code>ProjectCard</code>, <code>LinkCard</code>, <code>ResourceCard</code></>,
  controls: [
    { kind: 'select', name: 'appearance', label: 'Apariencia', options: CARD_APPEARANCES, initial: 'outlined' },
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable', 'spacious'], initial: 'comfortable' },
    { kind: 'select', name: 'motion', label: 'Movimiento', options: MOTIONS, initial: 'fluid' },
    { kind: 'boolean', name: 'interactive', label: 'Interactiva (enlace)', initial: true },
    { kind: 'boolean', name: 'selected', label: 'Seleccionada', initial: false },
    { kind: 'boolean', name: 'footer', label: 'Pie con acciones', initial: true },
    { kind: 'text', name: 'title', label: 'Título', initial: 'Análisis de demanda' },
  ],
  render: (v) => (
    <div style={{ maxWidth: 380, width: '100%' }}>
      <NexCard appearance={v.appearance as never} density={v.density as never} motion={v.motion as never} interactive={Boolean(v.interactive)} selected={Boolean(v.selected)}>
        <NexCard.Header>
          <NexCard.Eyebrow>Proyecto</NexCard.Eyebrow>
          <NexCard.Title>{v.interactive ? <NexCard.Link href="#/componentes/card">{String(v.title)}</NexCard.Link> : String(v.title)}</NexCard.Title>
          <NexCard.Description>Ana Ruiz · Estadística I</NexCard.Description>
        </NexCard.Header>
        <NexCard.Content>Modelo de demanda semanal con pandas y un informe en NexBook.</NexCard.Content>
        {v.footer && (
          <NexCard.Footer>
            <NexBadge tone="success" dot>Publicado</NexBadge>
            <NexCard.Actions><NexButton appearance="ghost" density="compact" iconStart={<NexIcon name="copy" />}>Duplicar</NexButton></NexCard.Actions>
          </NexCard.Footer>
        )}
      </NexCard>
    </div>
  ),
  code: (v) =>
    jsx('NexCard', { appearance: v.appearance as string, density: v.density as string, motion: v.motion as string, interactive: Boolean(v.interactive) || undefined, selected: Boolean(v.selected) || undefined }, [
      jsx('NexCard.Header', {}, [
        jsx('NexCard.Eyebrow', {}, 'Proyecto'),
        jsx('NexCard.Title', {}, v.interactive ? jsx('NexCard.Link', { href: '/p/analisis-de-demanda' }, String(v.title)) : String(v.title)),
        jsx('NexCard.Description', {}, 'Ana Ruiz · Estadística I'),
      ]),
      jsx('NexCard.Content', {}, 'Modelo de demanda semanal con pandas.'),
      ...(v.footer ? [jsx('NexCard.Footer', {}, [jsx('NexBadge', { tone: 'success', dot: true }, 'Publicado'), jsx('NexCard.Actions', {}, jsx('NexButton', { appearance: 'ghost', density: 'compact' }, 'Duplicar'))])] : []),
    ], { appearance: 'outlined', density: 'comfortable', motion: 'subtle' }),
  variants: () => (
    <div className="doc-card-grid">
      {CARD_APPEARANCES.map((a) => (
        <NexCard key={a} appearance={a} interactive motion="subtle">
          <NexCard.Header>
            <NexCard.Eyebrow>{a}</NexCard.Eyebrow>
            <NexCard.Title><NexCard.Link href="#/componentes/card">Fluid Editorial</NexCard.Link></NexCard.Title>
          </NexCard.Header>
          <NexCard.Content>La misma materia, cuatro superficies.</NexCard.Content>
        </NexCard>
      ))}
    </div>
  ),
  states: () => (
    <div className="doc-card-grid">
      {MOTIONS.map((m) => (
        <NexCard key={m} interactive motion={m}>
          <NexCard.Header><NexCard.Eyebrow>motion="{m}"</NexCard.Eyebrow><NexCard.Title><NexCard.Link href="#/componentes/card">Pasa o enfoca</NexCard.Link></NexCard.Title></NexCard.Header>
        </NexCard>
      ))}
      <NexCard selected><NexCard.Header><NexCard.Eyebrow>selected</NexCard.Eyebrow><NexCard.Title>Elemento actual</NexCard.Title></NexCard.Header></NexCard>
    </div>
  ),
  api: [
    {
      component: 'NexCard',
      rows: [
        { name: 'appearance', type: "'default' | 'outlined' | 'filled' | 'ghost' | 'editorial'", default: "'outlined'", description: 'Material: base · hundido · transparente · tinta con titular grande.' },
        { name: 'shape', type: 'ShapeFamily', description: 'Familia geométrica (por defecto la de superficie; morph si se amplía).' },
        { name: 'expansion · expansionTitle', type: 'ReactNode · string', description: 'Contenido del panel ampliado; añade el botón Ampliar.' },
        { name: 'density', type: 'NexDensity', default: 'contexto', description: 'Relleno 14 / 20 / 28 px.' },
        { name: 'motion', type: 'NexMotion', default: 'contexto', description: 'La regla de acento superior crece al pasar o enfocar (CSS en subtle, resortes en fluid/elastic).' },
        { name: 'interactive', type: 'boolean', default: 'false', description: 'Respuesta de puntero. Usa NexCard.Link en el título para extender el área de clic.' },
        { name: 'selected', type: 'boolean', default: 'false', description: 'Borde y regla de acento. Añade aria-current si representa el elemento actual.' },
        { name: 'as', type: "'article' | 'section' | 'div' | 'li'", default: "'article'", description: 'Elemento raíz.' },
        { name: 'headingLevel', type: '2 | 3 | 4', default: '3', description: 'Nivel de NexCard.Title.' },
      ],
    },
    {
      component: 'Partes (también NexCardHeader, NexCardTitle… para Server Components)',
      rows: [
        { name: 'NexCard.Header', type: '{ actions?: ReactNode }', description: 'Agrupa antetítulo, título y descripción; acciones a la derecha.' },
        { name: 'NexCard.Eyebrow', type: 'HTMLParagraphElement', description: 'Antetítulo en mono con raya de acento (patrón kicker de Nextudio).' },
        { name: 'NexCard.Title', type: "{ as?: 'h2' | 'h3' | 'h4' | 'p' }", description: 'Título en Space Grotesk.' },
        { name: 'NexCard.Link', type: 'AnchorHTMLAttributes', description: 'Enlace cuya área cubre la tarjeta. Los controles internos quedan por encima.' },
        { name: 'NexCard.Media / Content / Footer / Actions / Description', type: 'HTMLAttributes', description: 'Contenedores con el ritmo de la tarjeta.' },
      ],
    },
  ],
  examples: [
    { title: 'Tarjeta → panel', description: 'Ampliar transforma la membrana de la tarjeta en un panel modal; Escape la devuelve.', ...cardExpansion },
    { title: 'Tarjetas de proyecto', description: 'Título navegable, metadatos, insignias de estado y una acción.', ...projectCard },
  ],
  keyboard: [['Tab', 'Llega al enlace del título y después a cada acción']],
  a11y: [
    'El área ampliada de NexCard.Link es un pseudoelemento: sólo hay un enlace en el orden de foco, con el nombre del título.',
    'Botones y enlaces internos quedan por encima del área (z-index) y conservan su propio foco.',
    'El foco del enlace se dibuja alrededor de la tarjeta entera.',
    'La membrana SVG y la zona cromática son aria-hidden; selected debe acompañarse de aria-current o texto.',
    'Ampliar abre un diálogo modal con nombre; Escape lo cierra y devuelve el foco al botón.',
  ],
};
