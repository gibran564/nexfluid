import { NexButton, NexIcon, NexIconButton } from '@eclipsis/react';
import type { ComponentDoc } from '../docs/component-page.tsx';
import { jsx } from '../docs/kit.tsx';
import { example } from '../examples/index.ts';

const APPEARANCES = ['default', 'filled', 'outlined', 'ghost', 'editorial'] as const;
const MOTIONS = ['none', 'subtle', 'fluid', 'elastic'] as const;
const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
const tools = example('tools-panel');

export const buttonDoc: ComponentDoc = {
  path: 'componentes/button',
  name: 'NexButton',
  eyebrow: 'Componentes · Acciones',
  summary: 'Botón de acción con cinco apariencias, tres densidades, estado de carga accesible y presión opcional con resortes. Con href se pinta como enlace.',
  status: 'piloto',
  imports: [{ names: ['NexButton', 'NexIconButton', 'NexIcon'], from: '@eclipsis/react' }],
  origin: <><code>.btn</code>, <code>.btn-primary</code>, <code>.btn-ghost</code> de Nextudio (648 usos)</>,
  controls: [
    { kind: 'text', name: 'label', label: 'Texto', initial: 'Crear proyecto' },
    { kind: 'select', name: 'appearance', label: 'Apariencia', options: APPEARANCES, initial: 'filled' },
    { kind: 'select', name: 'tone', label: 'Tono', options: ['neutral', 'danger'], initial: 'neutral' },
    { kind: 'select', name: 'density', label: 'Densidad', options: DENSITIES, initial: 'comfortable' },
    { kind: 'select', name: 'motion', label: 'Movimiento', options: MOTIONS, initial: 'elastic' },
    { kind: 'boolean', name: 'icon', label: 'Icono inicial', initial: true },
    { kind: 'boolean', name: 'loading', label: 'Cargando', initial: false },
    { kind: 'boolean', name: 'disabled', label: 'Deshabilitado', initial: false },
    { kind: 'boolean', name: 'fullWidth', label: 'Ancho completo', initial: false },
  ],
  render: (v) => (
    <NexButton
      appearance={v.appearance as never}
      tone={v.tone as never}
      density={v.density as never}
      motion={v.motion as never}
      loading={Boolean(v.loading)}
      disabled={Boolean(v.disabled)}
      fullWidth={Boolean(v.fullWidth)}
      iconStart={v.icon ? <NexIcon name="plus" /> : undefined}
    >
      {String(v.label)}
    </NexButton>
  ),
  code: (v) =>
    jsx(
      'NexButton',
      {
        appearance: v.appearance as string, tone: v.tone as string, density: v.density as string, motion: v.motion as string,
        loading: Boolean(v.loading) || undefined, disabled: Boolean(v.disabled) || undefined, fullWidth: Boolean(v.fullWidth) || undefined,
        iconStart: v.icon ? { code: '<NexIcon name="plus" />' } : undefined, onClick: { code: 'createProject' },
      },
      String(v.label),
      { appearance: 'default', tone: 'neutral', density: 'comfortable', motion: 'subtle' },
    ),
  variants: () => (
    <div className="doc-variant-grid">
      {APPEARANCES.map((a) => (
        <figure key={a} className="doc-variant">
          <NexButton appearance={a}>Continuar</NexButton>
          <figcaption><code>{a}</code></figcaption>
        </figure>
      ))}
      {DENSITIES.map((d) => (
        <figure key={d} className="doc-variant">
          <NexButton density={d}>Densidad</NexButton>
          <figcaption><code>density="{d}"</code></figcaption>
        </figure>
      ))}
      <figure className="doc-variant">
        <NexButton appearance="outlined" tone="danger">Eliminar</NexButton>
        <figcaption><code>tone="danger"</code></figcaption>
      </figure>
      <figure className="doc-variant">
        <NexIconButton label="Buscar" icon={<NexIcon name="search" />} appearance="outlined" />
        <figcaption><code>NexIconButton</code></figcaption>
      </figure>
    </div>
  ),
  states: () => (
    <div className="doc-variant-grid">
      {MOTIONS.map((m) => (
        <figure key={m} className="doc-variant">
          <NexButton appearance="editorial" motion={m}>Presiona</NexButton>
          <figcaption><code>motion="{m}"</code></figcaption>
        </figure>
      ))}
      <figure className="doc-variant"><NexButton loading appearance="filled">Guardar</NexButton><figcaption>loading</figcaption></figure>
      <figure className="doc-variant"><NexButton disabled>Guardar</NexButton><figcaption>disabled</figcaption></figure>
      <figure className="doc-variant"><NexButton href="#/componentes/card" appearance="outlined" iconEnd={<NexIcon name="arrow-right" />}>Ir a Card</NexButton><figcaption><code>href</code> → enlace</figcaption></figure>
    </div>
  ),
  api: [
    {
      component: 'NexButton',
      rows: [
        { name: 'appearance', type: "'default' | 'filled' | 'outlined' | 'ghost' | 'editorial'", default: "'default'", description: 'default = secundario; filled = acción principal (una por vista); editorial = tinta.' },
        { name: 'tone', type: "'neutral' | 'danger'", default: "'neutral'", description: 'danger para acciones destructivas; el texto debe nombrar la consecuencia.' },
        { name: 'density', type: "'compact' | 'comfortable' | 'spacious'", default: 'contexto', description: 'Alto 36 / 44 / 50 px. comfortable cumple el objetivo táctil de 44 px.' },
        { name: 'motion', type: "'none' | 'subtle' | 'fluid' | 'elastic'", default: 'contexto', description: 'subtle: escala 0.97 al presionar (CSS). fluid/elastic: resorte de @eclipsis/core. Teclado y movimiento reducido: sin animación.' },
        { name: 'loading', type: 'boolean', default: 'false', description: 'aria-busy, conserva ancho y foco, bloquea onClick.' },
        { name: 'loadingLabel', type: 'string', default: "'Cargando'", description: 'Texto para lectores de pantalla durante loading.' },
        { name: 'iconStart / iconEnd', type: 'ReactNode', description: 'Iconos decorativos (NexIcon).' },
        { name: 'fullWidth', type: 'boolean', default: 'false', description: 'Ocupa el ancho del contenedor.' },
        { name: 'href', type: 'string', description: 'Pinta un <a>. Con disabled pierde el href y anuncia aria-disabled.' },
        { name: '…props', type: 'ButtonHTMLAttributes | AnchorHTMLAttributes', description: 'Se reenvían (onClick, type, aria-*, ref).' },
      ],
    },
    {
      component: 'NexIconButton',
      rows: [
        { name: 'label', type: 'string', description: 'Obligatorio. Se usa como aria-label y title.' },
        { name: 'icon', type: 'ReactNode', description: 'Icono visible.' },
        { name: 'appearance', type: 'NexAppearance', default: "'ghost'", description: 'Como NexButton.' },
      ],
    },
  ],
  examples: [{ title: 'Panel de herramientas', description: 'Acción principal con carga, secundarias, botones de icono con nombre y una destructiva.', ...tools }],
  keyboard: [['Tab', 'Mueve el foco al botón'], ['Intro', 'Activa'], ['Espacio', 'Activa']],
  a11y: [
    'Es un <button type="button"> nativo (o un <a> con href): rol, foco y teclado son los del navegador.',
    'loading no usa disabled: el foco no se pierde a mitad de una acción; se anuncia aria-busy y un texto oculto.',
    'NexIconButton exige label; sin texto visible, el nombre accesible no es opcional.',
    'Foco visible de 2 px en el color de acento con separación de 2 px.',
    'El movimiento físico sólo responde a puntero; con prefers-reduced-motion o motion="none" no hay animación.',
  ],
};

