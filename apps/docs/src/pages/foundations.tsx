import {
  BREAKPOINTS, COLOR_ROLES, CONTRAST_REQUIREMENTS, contrastRatio, cssVar, DENSITY, DIRECTIONS, FONTS, ICON_NAMES, LAYOUT, MOTION,
  SPACE, THEMES, TYPE_SCALE, type ThemeName,
} from '@eclipsis/foundation';
import { NexBadge, NexButton, NexCard, NexCodeBlock, NexIcon, NexProvider, NexTab, NexTabs } from '@eclipsis/react';
import { PageHeader, Section } from '../docs/kit.tsx';

const THEME_NAMES = Object.keys(THEMES) as ThemeName[];
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

export function ColorPage() {
  return (
    <article className="doc-page">
      <PageHeader
        eyebrow="Fundamentos · color"
        title="Color con propósito"
        lead={<>La paleta vigente se conserva (papel, tinta y terracota, y sus temas hermanos). Lo nuevo es su <span className="nx-serif">uso</span>: el acento sólo marca interacción y estado; la materia (<code>--nx-fluid</code>) aparece en gotas, zonas cromáticas y activaciones; cada membrana tiñe su profundidad.</>}
      />
      {THEME_NAMES.map((name, i) => {
        const t = THEMES[name];
        return (
          <Section key={name} index={String(i + 1).padStart(2, '0')} title={t.name} lead={<><code>data-nx-theme="{name}"</code> · esquema {t.scheme === 'light' ? 'claro' : 'oscuro'}</>}>
            <div className="doc-swatches" data-nx-theme={name}>
              {COLOR_ROLES.filter((r) => isHex(t[r])).map((role) => (
                <div key={role} className="doc-swatch">
                  <span className="doc-swatch-chip" style={{ background: `var(${cssVar(role)})` }} />
                  <code>{cssVar(role)}</code>
                  <span className="doc-muted">{t[role]}</span>
                </div>
              ))}
            </div>
            <details className="doc-details">
              <summary>Contrastes medidos en el navegador ({CONTRAST_REQUIREMENTS.length} pares; todos superan su mínimo)</summary>
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead><tr><th scope="col">Uso</th><th scope="col">Par</th><th scope="col">Razón</th><th scope="col">Mínimo</th></tr></thead>
                  <tbody>
                    {CONTRAST_REQUIREMENTS.map(([a, b, min, why]) => {
                      const ratio = contrastRatio(t[a], t[b]);
                      return (
                        <tr key={`${a}-${b}`}>
                          <td>{why}</td>
                          <td><code>{a}</code> / <code>{b}</code></td>
                          <td><strong>{ratio.toFixed(2)}:1</strong></td>
                          <td>{ratio >= min ? <NexBadge tone="success" density="compact" dot>≥ {min}:1</NexBadge> : <NexBadge tone="danger" density="compact" dot>&lt; {min}:1</NexBadge>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          </Section>
        );
      })}
    </article>
  );
}

export function TypographyPage() {
  return (
    <article className="doc-page">
      <PageHeader
        eyebrow="Fundamentos · tipografía"
        title="Tipografía como estructura"
        lead={<>Bricolage Grotesque para titulares (pesada, tracking cerrado, tamaño óptico), Geist para interfaz y lectura, Geist Mono para código e índices e <span className="nx-serif">Instrument Serif</span> como contrapunto editorial. Una escala con salto deliberado: póster y display construyen la página.</>}
      />
      <div className="doc-type-scale">
        {Object.entries(TYPE_SCALE).map(([name, s]) => (
          <div key={name} className="doc-type-row">
            <div className="doc-type-meta"><code>--nx-text-{name}</code><span className="doc-muted">{s.family} · {s.weight} · {s.leading}</span></div>
            <p
              className={['poster', 'display', 'title', 'heading'].includes(name) ? `nx-type-${name}` : name === 'quote' ? 'nx-type-quote' : undefined}
              style={['poster', 'display', 'title', 'heading', 'quote'].includes(name) ? undefined : { margin: 0, fontFamily: `var(--nx-font-${s.family === 'text' ? 'body' : s.family})`, fontSize: s.size, lineHeight: s.leading, fontWeight: s.weight }}
            >
              {name === 'poster' ? 'Materia viva' : name === 'display' ? 'Interfaces que emergen' : name === 'quote' ? 'La misma materia, otra forma.' : 'Cada componente comparte reglas de forma, materia y movimiento.'}
            </p>
          </div>
        ))}
        <div className="doc-type-row">
          <div className="doc-type-meta"><code>.nx-index</code><span className="doc-muted">mono · gota de materia</span></div>
          <p className="nx-index"><b>03</b> Índice editorial</p>
        </div>
      </div>
      <Section index="02" title="Familias" lead="Pilas definidas en @eclipsis/foundation; la aplicación carga las fuentes (por ejemplo, con @fontsource).">
        <NexCodeBlock language="css" title="tokens.css" code={Object.entries(FONTS).map(([k, v]) => `--nx-font-${k}: ${v};`).join('\n')} wrap />
        <p className="doc-hint">Limitación conocida: la versión variable publicada de Bricolage Grotesque incluye los ejes de peso y tamaño óptico, pero no el de anchura; <code>--nx-display-stretch</code> sólo surte efecto con una fuente que lo tenga.</p>
      </Section>
    </article>
  );
}

export function SpacingPage() {
  return (
    <article className="doc-page">
      <PageHeader eyebrow="Fundamentos · espacio" title="Espacio, costuras y densidad" lead="Ritmo de 4 px con saltos editoriales amplios. Entre membranas no hay filetes: hay costuras (--nx-gap) que cada dirección ajusta." />
      <Section index="01" title="Escala">
        <div className="doc-stack">
          {Object.entries(SPACE).map(([k, v]) => (
            <div key={k} style={{ display: 'grid', gridTemplateColumns: '140px auto 1fr', alignItems: 'center', gap: 14, fontSize: '0.75rem' }}>
              <code>--nx-space-{k}</code>
              <span style={{ width: v * 2, height: 12, borderRadius: 9999, background: 'var(--nx-fluid)' }} />
              <span className="doc-muted">{v}px</span>
            </div>
          ))}
        </div>
      </Section>
      <Section index="02" title="Breakpoints y medida" lead={`Medida de lectura ${LAYOUT.measure} · página ${LAYOUT.page}. NexFrame aplica los cortes a su propio ancho (container queries).`}>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead><tr><th scope="col">Nombre</th><th scope="col">min-width</th><th scope="col">Comportamiento</th></tr></thead>
            <tbody>
              <tr><td><code>sm</code></td><td>{BREAKPOINTS.sm}px</td><td>Teléfonos grandes</td></tr>
              <tr><td><code>md</code></td><td>{BREAKPOINTS.md}px</td><td>NexFrame: el inspector deja de ser hoja inferior</td></tr>
              <tr><td><code>lg</code></td><td>{BREAKPOINTS.lg}px</td><td>NexFrame: la navegación deja de ser cajón</td></tr>
              <tr><td><code>xl</code></td><td>{BREAKPOINTS.xl}px</td><td>Escritorio amplio</td></tr>
            </tbody>
          </table>
        </div>
      </Section>
      <Section index="03" title="Densidad">
        <div className="doc-card-grid">
          {(Object.keys(DENSITY) as Array<keyof typeof DENSITY>).map((d) => (
            <NexProvider key={d} density={d}>
              <NexCard>
                <NexCard.Eyebrow>{d} · control {DENSITY[d].control}</NexCard.Eyebrow>
                <NexCard.Title>Densidad {d}</NexCard.Title>
                <NexCard.Footer><NexButton appearance="filled">Acción</NexButton><NexButton>Otra</NexButton></NexCard.Footer>
              </NexCard>
            </NexProvider>
          ))}
        </div>
      </Section>
    </article>
  );
}

export function MotionTokensPage() {
  return (
    <article className="doc-page">
      <PageHeader eyebrow="Fundamentos · movimiento" title="Movimiento con causa" lead="Cuatro niveles comunes. subtle usa CSS; fluid y elastic usan los resortes de NexFluid. Teclado y movimiento reducido son siempre inmediatos." />
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead><tr><th scope="col">Nivel</th><th scope="col">Técnica</th><th scope="col">Parámetros</th></tr></thead>
          <tbody>
            <tr><td><code>none</code></td><td>Sin transición</td><td>Estado final inmediato</td></tr>
            <tr><td><code>subtle</code></td><td>CSS + resortes calmados</td><td>estado {MOTION.state.duration} ms · superficie {MOTION.surface.duration} ms · contenido {MOTION.content.duration} ms</td></tr>
            <tr><td><code>fluid</code></td><td>Resortes analíticos</td><td>familias surface / control / indicator / content</td></tr>
            <tr><td><code>elastic</code></td><td>Resortes con sobrepaso acotado (≤ 25 %)</td><td>presión y recuperación más vivas</td></tr>
          </tbody>
        </table>
      </div>
      <Section index="02" title="Compáralo" lead="Pulsa con el puntero y pasa sobre las pestañas (la gota se inclina). Después recórrelas con las flechas: con teclado nada se anima.">
        <div className="doc-stack">
          {(['none', 'subtle', 'fluid', 'elastic'] as const).map((m) => (
            <figure key={m} className="doc-variant doc-variant--wide">
              <NexTabs defaultValue="a" motion={m}>
                <NexTabs.List aria-label={`Movimiento ${m}`}>
                  <NexTab value="a">Documento</NexTab><NexTab value="b">Código</NexTab><NexTab value="c">Vista previa ampliada</NexTab>
                </NexTabs.List>
              </NexTabs>
              <figcaption><code>motion="{m}"</code></figcaption>
            </figure>
          ))}
        </div>
      </Section>
    </article>
  );
}

export function IconsPage() {
  return (
    <article className="doc-page">
      <PageHeader eyebrow="Fundamentos · iconos" title="Iconos" lead="Retícula de 24 px, trazo de 1.6 px, extremos redondos y currentColor. Datos puros en @eclipsis/foundation; NexIcon los pinta." />
      <div className="doc-icons">
        {ICON_NAMES.map((name) => (
          <figure key={name} className="doc-icon-cell"><NexIcon name={name} size={24} /><figcaption><code>{name}</code></figcaption></figure>
        ))}
      </div>
      <NexCodeBlock language="tsx" code={`import { NexIcon } from '@eclipsis/react';\n\n<NexIcon name="drop" />                 // decorativo (aria-hidden)\n<NexIcon name="drop" label="Materia" />  // con nombre accesible`} />
    </article>
  );
}

export function ThemesPage() {
  return (
    <article className="doc-page doc-page--wide">
      <PageHeader eyebrow="Fundamentos · temas" title="Temas × direcciones" lead={<>Dos ejes independientes: el <strong>tema</strong> (color) y la <strong>dirección</strong> (forma, materia, tipografía y física). Se declaran en cualquier contenedor y se anidan.</>} />
      <Section index="01" title="Seis temas con la dirección Native">
        <div className="doc-theme-grid">
          {THEME_NAMES.map((name) => (
            <NexProvider key={name} theme={name} direction="native" canvas className="doc-theme-tile">
              <p className="nx-index"><b>{THEMES[name].name}</b></p>
              <NexCard interactive>
                <NexCard.Title>Proyecto</NexCard.Title>
                <NexCard.Description>Misma materia, otro tema.</NexCard.Description>
                <NexCard.Footer><NexBadge tone="success" dot>Publicado</NexBadge><NexCard.Actions><NexButton appearance="filled" density="compact">Abrir</NexButton></NexCard.Actions></NexCard.Footer>
              </NexCard>
            </NexProvider>
          ))}
        </div>
      </Section>
      <Section index="02" title="Cuatro direcciones con el mismo tema">
        <div className="doc-theme-grid">
          {Object.entries(DIRECTIONS).map(([id, d]) => (
            <NexProvider key={id} direction={id} canvas className="doc-theme-tile">
              <p className="nx-index"><b>{d.name}</b></p>
              <NexCard interactive>
                <NexCard.Title>Proyecto</NexCard.Title>
                <NexCard.Description>Mismo tema, otro ADN.</NexCard.Description>
                <NexCard.Footer><NexCard.Actions><NexButton appearance="filled" density="compact">Abrir</NexButton></NexCard.Actions></NexCard.Footer>
              </NexCard>
            </NexProvider>
          ))}
        </div>
      </Section>
      <Section index="03" title="Tema de marca y compatibilidad">
        <NexCodeBlock language="ts" code={`import { customTheme, applyTheme } from '@eclipsis/foundation';\n\nconst brand = customTheme('editorial-light', { name: 'Marca', accent: '#0b5cad', accentHover: '#084a8b', fluid: '#0b5cad' });\napplyTheme(document.documentElement, brand);\n\n// Adaptador opcional para Nextudio (nunca fundacional):\nimport '@eclipsis/foundation/compat/nextudio.css';\n// <html data-nx-theme="nextudio" data-nx-direction="nextudio">`} />
      </Section>
    </article>
  );
}
