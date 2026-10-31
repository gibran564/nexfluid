import type { ReactNode } from 'react';
import { DIRECTIONS, MOTION_FAMILIES, SHAPES, SURFACE_STATES, type DirectionName } from '@nexfluid/foundation';
import { NexBadge, NexButton, NexCard, NexFrame, NexIcon, NexNav, NexPanel, NexProvider, NexSegmented, NexSurface, NexTab, NexTabs } from '@nexfluid/react';
import { NexMarkdownWidget } from '@nexfluid/react/widgets';
import { PageHeader, Section } from '../docs/kit.tsx';

const MD = `## Colas\n\nUn modelo **M/M/1** con λ = 0.5.\n\n> [!TIP]\n> Compara con la simulación.`;

/** La misma batería de componentes reales, para comparar direcciones y temas. */
function Specimen({ compact = false, tag = '' }: { compact?: boolean; tag?: string }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <NexButton appearance="filled">Ejecutar</NexButton>
        <NexButton>Guardar</NexButton>
        <NexButton appearance="ghost" iconStart={<NexIcon name="plus" />}>Nuevo</NexButton>
      </div>
      <NexCard interactive>
        <NexCard.Eyebrow>Proyecto</NexCard.Eyebrow>
        <NexCard.Title>Análisis de demanda</NexCard.Title>
        <NexCard.Description>Python · pandas · 3 archivos</NexCard.Description>
        <NexCard.Footer><NexBadge tone="success" dot>Publicado</NexBadge></NexCard.Footer>
      </NexCard>
      <NexTabs defaultValue="a">
        <NexTabs.List aria-label="Vista de ejemplo">
          <NexTab value="a">Documento</NexTab>
          <NexTab value="b">Código</NexTab>
          <NexTab value="c">Salidas</NexTab>
        </NexTabs.List>
      </NexTabs>
      <NexPanel title={`Propiedades${tag ? ` · ${tag}` : ''}`} collapsible density="compact">
        <p className="nx-type-small" style={{ margin: 0 }}>Lenguaje: Python 3.12 · Guardado hace 2 min</p>
      </NexPanel>
      {!compact && (
        <>
          <NexNav aria-label={`Navegación de ejemplo${tag ? ` · ${tag}` : ''}`}>
            <NexNav.Item href="#/identidad/direcciones" current icon={<NexIcon name="file" />}>Mi estudio</NexNav.Item>
            <NexNav.Item href="#/identidad/direcciones" icon={<NexIcon name="grid" />}>Explorar</NexNav.Item>
          </NexNav>
          <NexMarkdownWidget title={`Enunciado${tag ? ` · ${tag}` : ''}`} source={MD} />
        </>
      )}
    </div>
  );
}

const ANALYSIS: Record<Exclude<DirectionName, 'native'>, { strengths: string[]; weaknesses: string[] }> = {
  'fluid-editorial': {
    strengths: ['Identidad inmediata por la tipografía, incluso inmóvil.', 'Excelente para contenido largo y documentación.', 'Coste visual y de rendimiento muy bajo.'],
    weaknesses: ['Las superficies casi rectas apenas expresan la materia.', 'El hilo como único indicador se pierde en interfaces densas.', 'Cerca de una revista: menos «interfaz viva».'],
  },
  'living-matter': {
    strengths: ['La metáfora de la lámpara de lava se entiende al instante.', 'Estados muy legibles: tensión, presión y selección se ven.', 'Las transiciones evidencian continuidad material.'],
    weaknesses: ['Fatiga en pantallas usadas horas (Nextudio): demasiada expresión.', 'Sombras teñidas y meniscos compiten con el contenido.', 'Más coste de pintura (SVG con filtros en muchas superficies).'],
  },
  'kinetic-minimal': {
    strengths: ['Máxima claridad y la menor carga visual.', 'El movimiento comunica estado sin decorar.', 'Adapta bien a cualquier marca.'],
    weaknesses: ['Inmóvil se vuelve genérico: falla el criterio «identidad sin movimiento».', 'Sin bordes, las superficies se confunden sobre fondos claros.', 'Titulares ligeros pierden jerarquía editorial.'],
  },
};

export function DirectionsPage() {
  const names = ['fluid-editorial', 'living-matter', 'kinetic-minimal'] as const;
  return (
    <article className="doc-page doc-page--wide">
      <PageHeader
        eyebrow="Identidad · 01"
        title="Tres direcciones, una síntesis"
        lead={<>Las mismas piezas reales (botón, tarjeta, pestañas, panel, navegación y un widget de contenido) bajo tres ADN distintos. Cada columna es un <code>NexProvider direction</code>: nada se reescribe, sólo cambian tokens y física.</>}
      />
      <div className="doc-directions">
        {names.map((d) => (
          <section key={d} className="doc-direction" aria-labelledby={`dir-${d}`}>
            <div className="doc-direction-head">
              <h2 id={`dir-${d}`} className="nx-type-title">{DIRECTIONS[d].name}</h2>
              <p className="doc-muted" style={{ margin: 0 }}>{DIRECTIONS[d].summary}</p>
            </div>
            <NexProvider direction={d} motion="fluid">
              <Specimen tag={DIRECTIONS[d].name.slice(0, 1)} />
            </NexProvider>
            <div>
              <p className="nx-index">Fortalezas</p>
              <ul className="doc-list">{ANALYSIS[d].strengths.map((s) => <li key={s}>{s}</li>)}</ul>
              <p className="nx-index" style={{ marginTop: 14 }}>Debilidades</p>
              <ul className="doc-list">{ANALYSIS[d].weaknesses.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          </section>
        ))}
      </div>

      <Section index="02" title="Decisión: NexFluid Native" lead="La síntesis toma de cada dirección lo que cumple los criterios de aceptación y descarta lo que los rompe.">
        <div className="doc-directions">
          <section className="doc-direction" data-chosen="" aria-labelledby="dir-native">
            <div className="doc-direction-head">
              <h3 id="dir-native" className="nx-type-title">{DIRECTIONS.native.name}</h3>
              <p className="doc-muted" style={{ margin: 0 }}>{DIRECTIONS.native.summary}</p>
            </div>
            <NexProvider direction="native" motion="fluid">
              <Specimen tag="Native" />
            </NexProvider>
          </section>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            {[
              ['De A · tipografía', 'Titulares en Bricolage Grotesque pesada con tracking cerrado y cursivas Instrument Serif: la identidad sobrevive sin movimiento.'],
              ['De B · materia', 'Membranas con esquinas superelípticas, menisco y profundidad teñida al 45 %: la superficie se lee como material sin competir con el texto.'],
              ['De C · disciplina', 'El color sólo marca interacción y estado; el movimiento sólo responde (puntero, selección, apertura). Nada se mueve solo salvo el ambiente opcional.'],
              ['Descartado', 'Las superficies rectas de A como norma, la intensidad de B en pantallas de trabajo y la ausencia de bordes de C.'],
            ].map(([t, d]) => (
              <NexCard key={t} density="compact" as="section" aria-label={t}>
                <NexCard.Title>{t}</NexCard.Title>
                <NexCard.Description>{d}</NexCard.Description>
              </NexCard>
            ))}
          </div>
        </div>
      </Section>
    </article>
  );
}

function Column({ title, note, theme, direction, children }: { title: string; note: string; theme: string; direction: string; children: ReactNode }) {
  return (
    <section className="doc-direction" aria-label={title}>
      <div className="doc-direction-head">
        <h2 className="nx-type-heading">{title}</h2>
        <p className="doc-muted" style={{ margin: 0, fontSize: 'var(--nx-text-small)' }}>{note}</p>
      </div>
      <NexProvider theme={theme} direction={direction} motion="fluid" canvas style={{ padding: 16, borderRadius: 18 }}>
        {children}
      </NexProvider>
    </section>
  );
}

export function ComparePage() {
  const columns = [
    { title: 'Biblioteca tradicional', note: 'Tokens genéricos de referencia (radio 8 px, azul, fuente del sistema). No forma parte de NexFluidUI.', theme: 'reference', direction: 'reference' },
    { title: 'Nextudio hoy', note: 'Adaptador «Nextudio Compatibility»: filetes de 1 px, radios pequeños, Space Grotesk / Inter.', theme: 'nextudio', direction: 'nextudio' },
    { title: 'NexFluid Native', note: 'La nueva identidad: misma paleta, gramática propia.', theme: 'editorial-light', direction: 'native' },
  ];
  return (
    <article className="doc-page doc-page--wide">
      <PageHeader
        eyebrow="Identidad · 02"
        title="Antes y después"
        lead="Los mismos componentes, el mismo código, tres lenguajes. La paleta de Nextudio se conserva en Native: lo que cambia es la geometría, la materia, la tipografía, la composición y la física."
      />
      <div className="doc-directions">
        {columns.map((c) => (
          <Column key={c.title} {...c}>
            <Specimen compact tag={c.title} />
          </Column>
        ))}
      </div>
      <Section index="02" title="Qué es realmente nuevo" lead="Comparación pieza a pieza con el estado anterior de NexFluidUI (que reproducía Nextudio).">
        <div className="doc-table-wrap" role="region" aria-label="Comparación de componentes" tabIndex={0}>
          <table className="doc-table">
            <thead><tr><th scope="col">Pieza</th><th scope="col">Antes (heredado)</th><th scope="col">NexFluid Native</th></tr></thead>
            <tbody>
              {[
                ['Superficie', '.panel: rectángulo con filete de 1 px y radio de 6 px', 'Membrana: contorno superelíptico dibujado por el motor, borde con tensión, menisco y profundidad teñida; cinco familias geométricas'],
                ['Tarjeta', 'Regla de acento superior que crecía al pasar', 'Ciclo rest → attract → deform → activate → settle: el borde cede hacia el puntero, la presión aplasta con área constante, la activación inunda la zona cromática; se transforma en panel (morfología de membrana)'],
                ['Pestañas', 'Indicador en tres piezas (de NexTabs de NexFrame)', 'Gota líquida: borde magnético + borde viscoso, cuello tipo metaball al estirarse, inclinación hacia la pestaña bajo el puntero; el panel emerge desde la pestaña'],
                ['Botón', '.btn de 44 px con escala 0.97', 'Cápsula de membrana con presión elástica, zona cromática y carga con tres gotas'],
                ['Marco', 'Superficie de papel con radio de 14 px y filas fijas', 'Campo con zonas cromáticas y membranas flotantes separadas por costuras; regiones que se retraen a rieles, disposiciones split/focus, hoja inferior en móvil'],
                ['Tipografía', 'Space Grotesk / Inter / JetBrains Mono, escala de 8 pasos', 'Bricolage Grotesque / Geist / Geist Mono + Instrument Serif; escala con póster y cita; índices con gota'],
                ['Markdown', 'Estilos de MarkdownContent', 'Citas en serif con gota, avisos GFM como membranas, separador en onda, listas con rombos de materia, secciones numeradas'],
                ['Navegación y selectores', 'No existían como componentes', 'NexNav y NexSegmented comparten la gota líquida con las pestañas'],
              ].map(([p, a, n]) => (
                <tr key={p}><th scope="row">{p}</th><td className="doc-muted">{a}</td><td>{n}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </article>
  );
}

export function GrammarPage() {
  return (
    <article className="doc-page">
      <PageHeader eyebrow="Identidad · 03" title="La gramática" lead={<>Cinco familias de forma, ocho materiales, seis estados y cuatro familias de física. Todo componente es una combinación de estas piezas; ninguno inventa su propio estilo.</>} />

      <Section index="01" title="Familias geométricas" lead="Contornos superelípticos (curvatura continua). Pasa el puntero: la atracción de cada familia es distinta; editorial no se deforma.">
        <div className="doc-shapes">
          {(Object.keys(SHAPES) as Array<keyof typeof SHAPES>).map((s) => (
            <figure key={s} className="doc-variant">
              <NexSurface shape={s} material={s === 'capsule' ? 'accent' : 'raised'} interactive activatable className="doc-shape-demo" style={s === 'capsule' ? { height: 48 } : undefined} aria-label={`Familia ${s}`} ariaRole="img" />
              <figcaption><code>{s}</code> · {SHAPES[s].radius === 'pill' ? 'cápsula' : `${SHAPES[s].radius}px`} · suavizado {SHAPES[s].smoothing}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section index="02" title="Materiales" lead="El material decide relleno, borde y tinta sobre la membrana. La paleta no cambia.">
        <div className="doc-shapes">
          {(['base', 'raised', 'sunken', 'clear', 'accent', 'solid', 'ink', 'fluid'] as const).map((m) => (
            <figure key={m} className="doc-variant">
              <NexSurface material={m} live className="doc-shape-demo" style={{ display: 'grid', placeItems: 'center' }}><span className="nx-type-small">Texto</span></NexSurface>
              <figcaption><code>{m}</code></figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section index="03" title="Estados" lead="rest → attract → deform → activate → morph → settle. Cada superficie de esta fila está fijada en un estado para verlo inmóvil.">
        <div className="doc-states">
          {SURFACE_STATES.map((s) => (
            <div key={s} className="doc-state">
              <NexSurface material="raised" live data-nx-state={s} selected={s === 'activate'}>
                <span className="nx-index"><b>{s}</b></span>
              </NexSurface>
            </div>
          ))}
        </div>
        <p className="doc-hint">Teclado: el foco visible equivale a attract; Intro o Espacio, a activate. Movimiento reducido: los estados cambian de color, no de forma.</p>
      </Section>

      <Section index="04" title="Física por familia" lead="No todo se mueve igual. Cada familia de interacción comparte un preset del motor.">
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead><tr><th scope="col">Familia</th><th scope="col">Preset</th><th scope="col">Componentes</th><th scope="col">Comportamiento</th></tr></thead>
            <tbody>
              <tr><th scope="row">surface</th><td><code>{MOTION_FAMILIES.surface.preset}</code></td><td>NexCard, NexPanel, NexFrame</td><td>Viscosa, sin rebote: la materia pesa.</td></tr>
              <tr><th scope="row">control</th><td><code>{MOTION_FAMILIES.control.preset}</code></td><td>NexButton, NexSegmented</td><td>Presión breve y recuperación elástica.</td></tr>
              <tr><th scope="row">indicator</th><td><code>{MOTION_FAMILIES.indicator.preset} + {MOTION_FAMILIES.indicator.trail}</code></td><td>NexTabs, NexNav, NexSegmented</td><td>Un borde tira, el otro sigue; cuello al estirarse.</td></tr>
              <tr><th scope="row">content</th><td><code>{MOTION_FAMILIES.content.preset}</code></td><td>Paneles de pestaña, expansión</td><td>Emerge una vez; nunca se mueve mientras se lee.</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section index="05" title="Tipografía cinética" lead="Los ejes variables de Bricolage Grotesque responden al puntero (peso y tracking). Con movimiento reducido el cambio es inmediato.">
        <p className="nx-type-display doc-kinetic">
          <span className="nx-visually-hidden">Materia viva</span>
          {'Materia viva'.split('').map((c, i) => <span key={i} aria-hidden="true">{c === ' ' ? ' ' : c}</span>)}
        </p>
      </Section>

      <Section index="06" title="Composición espacial" lead="NexFrame en disposición focus: las regiones laterales se retraen a rieles; el lienzo crece.">
        <NexFrame height={300} canvasAs="div" layout="focus" density="compact" identity={<strong>Lab</strong>} explorer={<p style={{ padding: 14, margin: 0 }}>Archivos</p>} inspector={<p style={{ padding: 14, margin: 0 }}>Propiedades</p>}>
          <div style={{ padding: 20 }}><NexSegmented aria-label="Ejemplo" options={[{ value: 'a', label: 'Lienzo' }, { value: 'b', label: 'Vista' }]} /></div>
        </NexFrame>
      </Section>
    </article>
  );
}
