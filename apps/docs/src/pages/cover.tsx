import { NexBadge, NexButton, NexCard, NexIcon, NexSegmented, NexSurface, NexTab, NexTabs } from '@eclipsis/react';
import { FluidBlob } from '@eclipsis/react/motion';
import { href } from '../router.ts';

const PRINCIPLES = [
  ['01', 'Emergen', 'Nada aparece de golpe: el contenido nuevo brota desde el control que lo pidió.'],
  ['02', 'Fluyen', 'Los indicadores son gotas: un borde tira, el otro le sigue con viscosidad, y al llegar se recogen.'],
  ['03', 'Se transforman', 'Una tarjeta se convierte en panel sin cortes: es la misma membrana, con otra forma.'],
  ['04', 'Responden', 'El borde cede hacia el puntero, la presión aplasta sin perder volumen y todo se recupera.'],
] as const;

/** Portada: la identidad se reconoce incluso con el movimiento apagado. */
export function CoverPage() {
  return (
    <article className="doc-cover">
      <header className="doc-cover-head">
        <FluidBlob className="doc-cover-blob" motion="morph" intensity={0.85} ambient base={{ kind: 'superellipse', exponent: 3.4 }} seed={11} />
        <div className="doc-cover-title">
          <p className="nx-index"><b>NexFluidUI 0.2</b> · Living Editorial Interfaces</p>
          <h1 className="nx-type-poster" style={{ marginTop: 18 }}>
            Interfaces que se sienten
            <span className="nx-serif">vivas.</span>
          </h1>
        </div>
        <NexSurface className="doc-cover-aside" material="raised" interactive live>
          <p className="doc-lead">
            Un lenguaje de interfaz hecho de <span className="nx-serif">materia</span>: superficies que son membranas, indicadores que son gotas y
            tipografía que sostiene la estructura. Sin movimiento sigue siendo inconfundible; con él, cada cambio tiene continuidad.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <NexButton href={href('componentes/card')} appearance="filled" iconEnd={<NexIcon name="arrow-right" />}>Explorar componentes</NexButton>
            <NexButton href={href('patrones/composition-lab')} appearance="outlined">Composition Lab</NexButton>
          </div>
        </NexSurface>
      </header>

      <section className="doc-specimen" aria-label="Muestra de componentes reales">
        <NexCard appearance="editorial" interactive headingLevel={2}>
          <NexCard.Eyebrow>Práctica 03 · Investigación de operaciones</NexCard.Eyebrow>
          <NexCard.Title><NexCard.Link href={href('patrones/composition-lab')}>Colas que esperan menos</NexCard.Link></NexCard.Title>
          <NexCard.Description>Un modelo M/M/1 contra una simulación de mil clientes. La tarjeta es una membrana de tinta; pasa el puntero cerca de sus bordes.</NexCard.Description>
          <NexCard.Footer>
            <NexBadge tone="success" dot>Publicado</NexBadge>
            <NexCard.Actions><NexButton appearance="ghost" density="compact" iconStart={<NexIcon name="play" />}>Ejecutar</NexButton></NexCard.Actions>
          </NexCard.Footer>
        </NexCard>
        <div className="doc-specimen-stack">
          <NexSurface material="raised" live style={{ padding: 20 }}>
            <NexTabs defaultValue="doc">
              <NexTabs.List aria-label="Vista">
                <NexTab value="doc">Documento</NexTab>
                <NexTab value="code">Código</NexTab>
                <NexTab value="out">Resultados</NexTab>
              </NexTabs.List>
              <NexTabs.Panel value="doc"><p className="nx-type-quote">«La espera media teórica es de cuatro minutos.»</p></NexTabs.Panel>
              <NexTabs.Panel value="code"><p style={{ margin: 0, fontFamily: 'var(--nx-font-mono)' }}>wq = lam / (mu * (mu - lam))</p></NexTabs.Panel>
              <NexTabs.Panel value="out"><p className="nx-type-title" style={{ margin: 0 }}>4.18 min</p></NexTabs.Panel>
            </NexTabs>
          </NexSurface>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <NexSegmented aria-label="Densidad de ejemplo" options={[{ value: 'a', label: 'Compacto' }, { value: 'b', label: 'Cómodo' }, { value: 'c', label: 'Amplio' }]} defaultValue="b" />
            <NexButton appearance="editorial">Publicar</NexButton>
            <NexButton>Borrador</NexButton>
          </div>
          <p className="doc-hint">Todo lo que ves aquí son componentes importados de <code>@eclipsis/react</code>, no maquetas.</p>
        </div>
      </section>

      <section aria-labelledby="manifesto">
        <h2 id="manifesto" className="nx-type-display doc-statement">Los elementos no aparecen: <span className="nx-serif">emergen.</span></h2>
        <div className="doc-manifesto" style={{ marginTop: 32 }}>
          {PRINCIPLES.map(([n, t, d]) => (
            <NexCard key={n} as="section" interactive aria-label={t}>
              <NexCard.Eyebrow>{n}</NexCard.Eyebrow>
              <NexCard.Title>{t}</NexCard.Title>
              <NexCard.Description>{d}</NexCard.Description>
            </NexCard>
          ))}
        </div>
      </section>

      <section aria-labelledby="explore" style={{ display: 'grid', gap: 18 }}>
        <h2 id="explore" className="nx-type-title">Por dónde empezar</h2>
        <div className="doc-card-grid">
          {[
            ['Direcciones', 'Tres exploraciones visuales sobre los mismos componentes y la síntesis elegida.', 'identidad/direcciones'],
            ['Antes y después', 'Biblioteca tradicional · Nextudio · NexFluid Native, con los mismos componentes.', 'identidad/antes-y-despues'],
            ['Gramática', 'Familias geométricas, materiales, estados y física de cada familia.', 'identidad/gramatica'],
            ['Composition Lab', 'Un espacio de trabajo completo hecho sólo con piezas públicas.', 'patrones/composition-lab'],
          ].map(([t, d, p]) => (
            <NexCard key={t} interactive density="compact">
              <NexCard.Title><NexCard.Link href={href(p!)}>{t}</NexCard.Link></NexCard.Title>
              <NexCard.Description>{d}</NexCard.Description>
            </NexCard>
          ))}
        </div>
      </section>
    </article>
  );
}
