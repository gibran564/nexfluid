import { dampingRatio, measureStepResponse, MOTION_PRESETS, type MotionPresetName } from '@nexfluid/core';
import { NexBadge, NexCard } from '@nexfluid/react';
import { FluidBlob } from '@nexfluid/react/motion';
import { PageHeader, Section } from '../docs/kit.tsx';
import { href } from '../router.ts';

const NAMES = Object.keys(MOTION_PRESETS) as MotionPresetName[];

function Response({ name }: { name: MotionPresetName }) {
  const r = measureStepResponse(MOTION_PRESETS[name].spring, { horizon: 2 });
  const W = 240;
  const H = 96;
  const y = (v: number) => H - 14 - v * (H - 34);
  const points = r.samples.filter((_, i) => i % 6 === 0).map(([t, v]) => `${((t / 2) * W).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="doc-response" role="img" aria-label={`Respuesta de ${name}: sobrepaso ${(r.overshoot * 100).toFixed(1)} %, asentamiento ${(r.settleTime * 1000).toFixed(0)} ms`}>
      <line x1="0" x2={W} y1={y(1)} y2={y(1)} className="doc-response-target" />
      <line x1={(Math.min(2, r.settleTime) / 2) * W} x2={(Math.min(2, r.settleTime) / 2) * W} y1="6" y2={H - 8} className="doc-response-settle" />
      <polyline points={points} className="doc-response-curve" />
    </svg>
  );
}

export function MotionOverviewPage() {
  return (
    <article className="doc-page">
      <PageHeader
        eyebrow="Motion · NexFluid"
        title="NexFluid"
        lead="El motor de movimiento orgánico: resortes resueltos de forma exacta (independientes del framerate), viscosidad, geometría con volumen constante y un reloj compartido que se duerme. Es opcional: los componentes funcionan sin él."
      />
      <div className="doc-specimen">
        <FluidBlob motion="morph" intensity={0.8} ambient base={{ kind: 'superellipse', exponent: 4 }} seed={11} style={{ width: 'min(100%, 280px)', aspectRatio: '1' }} />
        <div>
          <p className="doc-section-lead">Pasa el puntero sobre la forma, presiónala y suéltala. Cede hacia lo que la atrae, se aplasta sin perder volumen y recupera su forma exacta. Con movimiento reducido no se mueve.</p>
          <ul className="doc-list">
            <li><a href={href('motion/fluid-blob')}>FluidBlob</a>: la primitiva, con sus propiedades.</li>
            <li><a href={href('componentes/tabs')}>NexTabs</a>: el indicador se estira entre pestañas (borde rápido + borde viscoso).</li>
            <li>Laboratorio del motor (fase 1): <code>npm run dev:playground</code> → <code>http://127.0.0.1:5288</code>.</li>
          </ul>
        </div>
      </div>
      <Section title="Presets medidos" lead="Respuesta a un salto unitario calculada en el navegador con measureStepResponse(). La línea discontinua marca el asentamiento a ±0.1 %.">
        <div className="doc-card-grid">
          {NAMES.map((name) => {
            const p = MOTION_PRESETS[name];
            const r = measureStepResponse(p.spring);
            return (
              <NexCard key={name} density="compact" motion="none" as="section" aria-label={`Preset ${name}`}>
                <NexCard.Header actions={<NexBadge density="compact" appearance="editorial">ζ {dampingRatio(p.spring).toFixed(2)}</NexBadge>}>
                  <NexCard.Title as="h3"><code>{name}</code></NexCard.Title>
                </NexCard.Header>
                <Response name={name} />
                <NexCard.Description>{p.intent}</NexCard.Description>
                <NexCard.Footer>
                  sobrepaso {(r.overshoot * 100).toFixed(1)} % · {(r.settleTime * 1000).toFixed(0)} ms · τ {p.viscosity} s
                </NexCard.Footer>
              </NexCard>
            );
          })}
        </div>
      </Section>
      <Section title="Mediciones y límites">
        <ul className="doc-list">
          <li>Coste JS de un fotograma de FluidBlob (24 puntos): 29 µs de mediana en Node (docs/MEDICIONES.md). No incluye estilo, layout ni pintura: no es una cifra de fps.</li>
          <li>Los fps reales no se han medido todavía en un equipo modesto; el Playground del motor incluye el medidor.</li>
          <li>Metaballs, morphing entre componentes y máscaras editoriales son propuestas (fase 5).</li>
        </ul>
      </Section>
    </article>
  );
}
