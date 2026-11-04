import { NexCodeBlock } from '@eclipsis/react';
import { NexMarkdownEditor, NexMarkdownWidget, NexPropertiesWidget } from '@eclipsis/react/widgets';
import { FluidBlob } from '@eclipsis/react/motion';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx } from '../docs/kit.tsx';
import { example } from '../examples/index.ts';

const SAMPLE_CODE: Record<string, string> = {
  tsx: `import { NexCard } from '@eclipsis/react';\n\nexport function Project({ title }: { title: string }) {\n  // Toda la tarjeta navega\n  return <NexCard interactive>{title}</NexCard>;\n}`,
  python: `def espera_media(lam: float, mu: float) -> float:\n    """Cola M/M/1."""\n    return lam / (mu * (mu - lam))\n\nprint(espera_media(0.5, 0.75))  # 4.0`,
  css: `.nx-card[data-nx-appearance='editorial'] {\n  border-top: 2px solid var(--nx-fg);\n  padding-inline: 0;\n}`,
  json: `{\n  "name": "@eclipsis/react",\n  "peerDependencies": { "react": "^19.0.0" }\n}`,
  bash: `npm install\nnpm run dev -- --port 5290  # NexDocs`,
};

const snippet = example('code-snippet');

export const codeBlockDoc: ComponentDoc = {
  path: 'componentes/code-block',
  name: 'NexCodeBlock',
  eyebrow: 'Componentes · Contenido',
  summary: 'Código de sólo lectura con resaltado ligero sin dependencias, números y líneas destacadas, ajuste de línea y copia accesible. Admite un resaltador propio (p. ej. Monaco).',
  status: 'piloto',
  imports: [{ names: ['NexCodeBlock'], from: '@eclipsis/react' }],
  origin: <><code>ColorizedCode</code> (Monaco), <code>CopyButton</code>, bloques de <code>MarkdownContent</code></>,
  controls: [
    { kind: 'select', name: 'language', label: 'Lenguaje', options: Object.keys(SAMPLE_CODE), initial: 'tsx' },
    { kind: 'text', name: 'title', label: 'Título', initial: 'project.tsx' },
    { kind: 'boolean', name: 'showLineNumbers', label: 'Números de línea', initial: true },
    { kind: 'boolean', name: 'highlight', label: 'Resaltar línea 4', initial: true },
    { kind: 'boolean', name: 'wrap', label: 'Ajustar líneas', initial: false },
    { kind: 'boolean', name: 'copyable', label: 'Copiable', initial: true },
  ],
  render: (v) => (
    <div style={{ width: '100%' }}>
      <NexCodeBlock code={SAMPLE_CODE[String(v.language)]!} language={String(v.language)} title={String(v.title) || undefined} showLineNumbers={Boolean(v.showLineNumbers)} highlightLines={v.highlight ? [4] : undefined} wrap={Boolean(v.wrap)} copyable={Boolean(v.copyable)} />
    </div>
  ),
  code: (v) => jsx('NexCodeBlock', {
    code: { code: 'source' }, language: String(v.language), title: String(v.title) || undefined, showLineNumbers: Boolean(v.showLineNumbers) || undefined,
    highlightLines: v.highlight ? { code: '[4]' } : undefined, wrap: Boolean(v.wrap) || undefined, copyable: v.copyable ? undefined : false,
  }),
  api: [{
    component: 'NexCodeBlock',
    rows: [
      { name: 'code', type: 'string', description: 'Texto del código. Nunca se interpreta como HTML.' },
      { name: 'language', type: 'string | null', description: 'ts/tsx/js, python, json, css, html/xml, bash/shell, markdown (+ alias). Otro → texto plano.' },
      { name: 'title', type: 'string', description: 'Archivo o título; también nombra la región desplazable.' },
      { name: 'showLineNumbers', type: 'boolean', default: 'false', description: 'Números (aria-hidden, no se copian).' },
      { name: 'highlightLines', type: 'number[]', description: 'Líneas destacadas, desde 1.' },
      { name: 'wrap', type: 'boolean', default: 'false', description: 'Ajusta líneas largas.' },
      { name: 'copyable', type: 'boolean', default: 'true', description: 'Botón Copiar con anuncio en vivo.' },
      { name: 'maxHeight', type: 'number | string', description: 'Alto antes de desplazar.' },
      { name: 'highlighter', type: '(code, language) => Token[] | null', description: 'Resaltador propio que devuelve tokens de texto (Monaco en Nextudio).' },
    ],
  }],
  examples: [{ title: 'Archivo con línea destacada', ...snippet }],
  keyboard: [['Tab', 'Enfoca el botón Copiar y después el código (región desplazable)'], ['← → ↑ ↓', 'Desplaza el código cuando desborda']],
  a11y: [
    'El <pre> es una región con nombre y tabindex=0: el código desbordado se puede desplazar con teclado (axe: scrollable-region-focusable).',
    'Los números de línea son aria-hidden y no entran en la copia.',
    'Copiar anuncia «Código copiado» en una región aria-live; si el portapapeles no está disponible, lo dice.',
    'Colores de tokens derivados de los tokens semánticos del tema.',
  ],
  requires: ['Resaltado integrado de ~150 líneas por expresiones regulares: aproximado en plantillas anidadas, regex literales y heredocs.'],
};

const MD = `## Instalación

Importa los **estilos** una vez y los componentes donde los uses:

\`\`\`tsx
import '@eclipsis/foundation/tokens.css';
import { NexCard } from '@eclipsis/react';
\`\`\`

- [x] Tokens
- [ ] Más componentes

| Paquete | Rol |
|---|---|
| \`@eclipsis/core\` | Motor |
| \`@eclipsis/react\` | Puente React |

## Fórmulas

La espera media de una cola M/M/1 es $W_q = \\dfrac{\\lambda}{\\mu(\\mu - \\lambda)}$, y con $\\lambda = 0.5$ y $\\mu = 0.75$ sale $W_q = 4$.

$$
L_q = \\lambda \\, W_q = \\frac{\\lambda^2}{\\mu(\\mu - \\lambda)}
$$

Un precio no es una fórmula: cuesta $5 y luego $10.

> Prueba a escribir <script>alert(1)</script> o un [enlace peligroso](javascript:alert(1)): no se interpretan.
`;

const viewer = example('markdown-viewer');

export const markdownDoc: ComponentDoc = {
  path: 'componentes/markdown',
  name: 'NexMarkdown',
  eyebrow: 'Componentes · Contenido',
  summary: 'Renderizador de Markdown (GFM) seguro e independiente del editor. Sin HTML en línea, URLs filtradas, código con NexCodeBlock, tablas desplazables y títulos enlazables.',
  status: 'piloto',
  imports: [{ names: ['NexMarkdown'], from: '@eclipsis/react/markdown' }],
  origin: <><code>MarkdownContent</code>, <code>LegalMarkdown</code>, <code>WorkspaceMarkdownPreview</code></>,
  controls: [
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable'], initial: 'comfortable' },
    { kind: 'boolean', name: 'measure', label: 'Medida de lectura (68ch)', initial: true },
    { kind: 'select', name: 'images', label: 'Imágenes', options: ['link', 'https'], initial: 'link' },
    { kind: 'select', name: 'headingOffset', label: 'Desplazar títulos', options: ['0', '1', '2'], initial: '0' },
  ],
  render: (v) => <MarkdownPlayground density={v.density as never} measure={Boolean(v.measure)} images={v.images as never} headingOffset={Number(v.headingOffset) as never} />,
  code: (v) => jsx('NexMarkdown', { source: { code: 'markdown' }, density: v.density as string, measure: Boolean(v.measure) || undefined, images: v.images as string, headingOffset: v.headingOffset === '0' ? undefined : { code: String(v.headingOffset) } }, undefined, { density: 'comfortable', images: 'link' }),
  api: [{
    component: 'NexMarkdown',
    rows: [
      { name: 'source', type: 'string', description: 'Markdown no confiable. El HTML en línea nunca se interpreta (skipHtml, sin rehype-raw).' },
      { name: 'density', type: "'compact' | 'comfortable'", description: 'Escala de cuerpo.' },
      { name: 'measure', type: 'boolean', default: 'false', description: 'Limita a 68ch.' },
      { name: 'headingIds / idPrefix', type: 'boolean · string', default: 'true · único', description: 'id en títulos para anclas, sin colisiones entre instancias.' },
      { name: 'headingOffset', type: '0 | 1 | 2', default: '0', description: 'Con 1, # se pinta como h2 (dentro de tarjetas).' },
      { name: 'images', type: "'link' | 'https'", default: "'link'", description: 'link: la imagen se muestra como enlace. https: se pinta si es https.' },
      { name: 'externalLinksInNewTab', type: 'boolean', default: 'true', description: 'rel="noopener noreferrer" siempre; se anuncia la pestaña nueva.' },
      { name: 'math', type: 'boolean', default: 'true', description: 'Fórmulas $…$ y $$…$$ con KaTeX (motor de NexBook). Requiere katex/dist/katex.min.css. Un $ suelto de precio sigue siendo texto.' },
      { name: 'renderCode', type: '(code, language) => ReactNode', description: 'Sustituye a NexCodeBlock en bloques cercados.' },
      { name: 'components', type: 'Partial<Components>', description: 'Extensiones de react-markdown (van detrás y pueden sustituir).' },
    ],
  }],
  examples: [{ title: 'Visualizador Markdown', description: 'NexMarkdownWidget con vista previa, fuente y dividido.', ...viewer }],
  a11y: [
    'Estructura semántica real: títulos, listas, tablas con encabezados, citas.',
    'Las tablas anchas son regiones desplazables con nombre y foco.',
    'Las casillas de tareas de GFM llegan sin nombre; NexMarkdown las nombra («Tarea hecha/pendiente»). Hallazgo de axe en este trabajo.',
    'Los enlaces externos anuncian que se abren en otra pestaña.',
    'Las fórmulas ($…$ y $$…$$) se pintan con KaTeX en HTML y MathML: los lectores de pantalla leen la expresión. trust: false impide enlaces, imágenes o atributos desde TeX.',
  ],
  requires: [
    <>Entrada aparte <code>@eclipsis/react/markdown</code>: añade <code>react-markdown</code> 10.1.0 y <code>remark-gfm</code> 4.0.1, las mismas versiones que Nextudio. La entrada principal no los carga.</>,
    'Política de URLs: http, https, mailto, anclas y relativas. javascript:, data:, vbscript:, file: y esquemas propios se descartan (pruebas incluidas).',
  ],
};

/** Escribe a la izquierda: NexMarkdown pinta a la derecha en cada pulsación (las propiedades del panel se aplican en vivo). */
function MarkdownPlayground(props: { density: 'compact' | 'comfortable'; measure: boolean; images: 'link' | 'https'; headingOffset: 0 | 1 | 2 }) {
  return (
    <div className="doc-md-playground">
      <NexMarkdownEditor label="entrada.md" defaultValue={MD} markdown={props} rows={18} />
    </div>
  );
}

export const markdownWidgetDoc: ComponentDoc = {
  path: 'widgets/markdown-widget',
  name: 'NexMarkdownWidget',
  eyebrow: 'Widgets',
  summary: 'Bloque de documentación listo para usar: NexCard + NexTabs + NexMarkdown + NexCodeBlock. Una aplicación lo consume con una línea, sin copiar su implementación.',
  status: 'piloto',
  imports: [{ names: ['NexMarkdownWidget'], from: '@eclipsis/react/widgets' }],
  origin: <>Previsualizaciones de enunciados, <code>WorkspaceMarkdownPreview</code></>,
  controls: [
    { kind: 'text', name: 'title', label: 'Título', initial: 'Documentación' },
    { kind: 'select', name: 'defaultMode', label: 'Modo inicial', options: ['preview', 'source', 'split'], initial: 'preview' },
    { kind: 'boolean', name: 'split', label: 'Ofrecer «Dividido»', initial: true },
    { kind: 'select', name: 'appearance', label: 'Apariencia', options: ['outlined', 'filled', 'editorial'], initial: 'outlined' },
    { kind: 'boolean', name: 'editable', label: 'Editable', initial: true },
  ],
  render: (v) => (
    <div style={{ width: '100%' }}>
      <NexMarkdownWidget key={`${String(v.defaultMode)}-${String(v.editable)}`} title={String(v.title)} eyebrow="Widget" source={MD} editable={Boolean(v.editable)} defaultMode={v.defaultMode as never} modes={v.split ? ['preview', 'source', 'split'] : ['preview', 'source']} appearance={v.appearance as never} />
    </div>
  ),
  code: (v) => jsx('NexMarkdownWidget', { title: String(v.title), source: { code: 'markdown' }, editable: Boolean(v.editable) || undefined, onSourceChange: v.editable ? { code: 'setMarkdown' } : undefined, defaultMode: v.defaultMode as string, modes: v.split ? { code: "['preview', 'source', 'split']" } : undefined, appearance: v.appearance as string }, undefined, { defaultMode: 'preview', appearance: 'outlined' }),
  api: [{
    component: 'NexMarkdownWidget',
    rows: [
      { name: 'title · eyebrow · description', type: 'string', description: 'Cabecera de la tarjeta.' },
      { name: 'editable · onSourceChange', type: 'boolean · (source) => void', default: 'false', description: '«Fuente» pasa a ser un campo de texto y «Dividido», texto + vista previa en vivo. Sin onSourceChange, source es el valor inicial.' },
      { name: 'source', type: 'string', description: 'Markdown.' },
      { name: 'mode / defaultMode / onModeChange', type: "'preview' | 'source' | 'split'", default: "'preview'", description: 'Controlado o no.' },
      { name: 'modes', type: 'readonly Mode[]', default: "['preview', 'source']", description: 'Pestañas disponibles; con una sola no hay pestañas.' },
      { name: 'actions', type: 'ReactNode', description: 'Acciones de la cabecera.' },
      { name: 'markdown', type: 'Omit<NexMarkdownProps, "source">', description: 'Opciones de NexMarkdown.' },
      { name: 'appearance · density · motion', type: 'variantes comunes', description: 'Se pasan a NexCard y NexTabs.' },
    ],
  }],
  examples: [{ title: 'Enunciado de práctica', ...viewer }],
  a11y: ['Es una <section> con nombre (el título).', 'Hereda el teclado de NexTabs y la seguridad de NexMarkdown.', 'La fuente es un NexCodeBlock con números de línea.'],
};

export const propertiesWidgetDoc: ComponentDoc = {
  path: 'widgets/properties-widget',
  name: 'NexPropertiesWidget',
  eyebrow: 'Widgets',
  summary: 'Panel clave → valor agrupado para inspectores y metadatos, con listas de definición reales.',
  status: 'piloto',
  imports: [{ names: ['NexPropertiesWidget'], from: '@eclipsis/react/widgets' }],
  origin: <>Paneles de propiedades del inspector de NexFrame, <code>Stat</code> y <code>Field</code> de Aula</>,
  controls: [
    { kind: 'select', name: 'material', label: 'Material', options: ['raised', 'base', 'sunken', 'clear'], initial: 'raised' },
    { kind: 'select', name: 'density', label: 'Densidad', options: ['compact', 'comfortable'], initial: 'compact' },
  ],
  render: (v) => (
    <div style={{ width: 320 }}>
      <NexPropertiesWidget material={v.material as never} collapsible density={v.density as never} title="Bloque de código" groups={[{ label: 'Archivo', items: [{ label: 'Nombre', value: 'colas.py' }, { label: 'Lenguaje', value: 'Python 3.12' }] }, { label: 'Ejecución', items: [{ label: 'Último', value: 'hace 2 min' }, { label: 'Duración', value: '1.4 s' }] }]} />
    </div>
  ),
  code: (v) => jsx('NexPropertiesWidget', { title: 'Bloque de código', material: v.material as string, collapsible: true, density: v.density as string, groups: { code: "[{ label: 'Archivo', items: [{ label: 'Nombre', value: 'colas.py' }] }]" } }, undefined, { material: 'raised' }),
  api: [{
    component: 'NexPropertiesWidget',
    rows: [
      { name: 'title', type: 'string', description: 'Título y nombre de la sección.' },
      { name: 'groups', type: '{ label?: string; items: { label: string; value: ReactNode }[] }[]', description: 'Grupos con título en mono.' },
      { name: 'items', type: '{ label; value }[]', description: 'Alternativa sin grupos.' },
      { name: 'material · density · actions · collapsible', type: 'variantes comunes', description: 'De NexPanel.' },
    ],
  }],
  a11y: ['Es un NexPanel con nombre; cada grupo es un <dl> con nombre: los lectores anuncian pares término/definición.'],
};

export const fluidBlobDoc: ComponentDoc = {
  path: 'motion/fluid-blob',
  name: 'FluidBlob',
  eyebrow: 'Motion · NexFluid',
  summary: 'La primitiva orgánica del motor: contorno con volumen constante, atracción hacia el puntero y presión elástica. Es decorativa por defecto y se detiene sola en reposo.',
  status: 'laboratorio',
  imports: [{ names: ['FluidBlob'], from: '@eclipsis/react/motion' }],
  origin: <>Fase 1 de NexFluid (<code>createFluidBlob</code> de <code>@eclipsis/core</code>)</>,
  controls: [
    { kind: 'select', name: 'motion', label: 'Preset', options: ['calm', 'flow', 'elastic', 'viscous', 'magnetic', 'morph', 'spring', 'ambient'], initial: 'morph' },
    { kind: 'number', name: 'intensity', label: 'Intensidad', initial: 0.7, min: 0, max: 1, step: 0.05 },
    { kind: 'select', name: 'base', label: 'Geometría', options: ['circle', 'squircle', 'ellipse'], initial: 'squircle' },
    { kind: 'boolean', name: 'ambient', label: 'Deriva ambiental', initial: true },
    { kind: 'number', name: 'seed', label: 'Semilla', initial: 7, min: 1, max: 40, step: 1 },
  ],
  render: (v) => (
    <FluidBlob
      motion={v.motion as never}
      intensity={Number(v.intensity)}
      ambient={Boolean(v.ambient)}
      seed={Number(v.seed)}
      base={v.base === 'squircle' ? { kind: 'superellipse', exponent: 4 } : v.base === 'ellipse' ? { kind: 'ellipse', aspect: 1.4 } : { kind: 'circle' }}
      style={{ width: 'min(100%, 300px)', aspectRatio: '1' }}
    />
  ),
  code: (v) => jsx('FluidBlob', {
    motion: String(v.motion), intensity: { code: String(v.intensity) }, seed: { code: String(v.seed) }, ambient: Boolean(v.ambient) || undefined,
    base: v.base === 'squircle' ? { code: "{ kind: 'superellipse', exponent: 4 }" } : v.base === 'ellipse' ? { code: "{ kind: 'ellipse', aspect: 1.4 }" } : undefined,
    style: { code: "{ width: 240, aspectRatio: '1' }" },
  }),
  api: [{
    component: 'FluidBlob',
    rows: [
      { name: 'motion', type: 'MotionPresetName', default: "'flow'", description: 'Uno de los ocho presets medidos.' },
      { name: 'intensity · dampingRatio · viscosity', type: 'number', description: 'Ajustes sobre el preset (resolveMotion).' },
      { name: 'base', type: 'BaseGeometry', default: "{ kind: 'circle' }", description: 'Círculo, elipse o superelipse.' },
      { name: 'ambient', type: 'boolean', default: 'false', description: 'Deriva lenta. Apagada por defecto: en productos, ambiente sólo con propósito.' },
      { name: 'interactive · seed · points · label', type: 'boolean · number · string', description: 'Puntero, carácter de la forma, suavidad y nombre accesible.' },
    ],
  }],
  a11y: ['Decorativa (aria-hidden) salvo que reciba label.', 'Con movimiento reducido no hay deriva ni atracción: presionar es un cambio instantáneo.', 'Un único requestAnimationFrame compartido que se duerme en reposo y fuera de pantalla.'],
  requires: ['Sólo cliente: en SSR es un contenedor vacío que se rellena al hidratar.'],
};
