import { useState } from 'react';
import { NexBadge, NexButton, NexCard, NexIcon } from '@nexfluid/react';
import { PageHeader, Section } from '../docs/kit.tsx';

interface Measure { frames: number; mean: number; p95: number; max: number; long: number; surfaces: number }

async function measure(ms: number): Promise<Measure> {
  const intervals: number[] = [];
  await new Promise<void>((resolve) => {
    let last: number | null = null;
    const start = performance.now();
    const frame = (now: number) => {
      if (last !== null) intervals.push(now - last);
      last = now;
      if (now - start < ms) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
  intervals.sort((a, b) => a - b);
  const mean = intervals.reduce((s, v) => s + v, 0) / Math.max(1, intervals.length);
  return {
    frames: intervals.length,
    mean,
    p95: intervals[Math.floor(intervals.length * 0.95)] ?? 0,
    max: intervals.at(-1) ?? 0,
    long: intervals.filter((v) => v > 20).length,
    surfaces: document.querySelectorAll('.nx-surface[data-nx-drawn]').length,
  };
}

export function QualityPage() {
  const [result, setResult] = useState<Measure | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <article className="doc-page">
      <PageHeader eyebrow="Calidad" title="Accesibilidad y rendimiento" lead="Lo que se garantiza con pruebas, lo que se mide aquí mismo y lo que todavía no se ha medido." />

      <Section index="01" title="Garantías de accesibilidad">
        <ul className="doc-list">
          <li>Patrones ARIA reales: tabs, radiogroup, navigation con aria-current, diálogo modal en la expansión, separador con valores, regiones con nombre.</li>
          <li>Teclado equivalente al puntero: el foco visible pone la membrana en tensión; Intro/Espacio la activan. Flechas, Inicio y Fin en pestañas, selectores y explorador.</li>
          <li>Todo dibujo decorativo (membranas SVG, gotas, zonas cromáticas) es <code>aria-hidden</code>.</li>
          <li>El color nunca es la única señal; 23 pares de contraste por tema verificados en pruebas.</li>
          <li>axe-core sin infracciones en las pruebas de cada componente (jsdom) y en todas las vistas de NexDocs (navegador real).</li>
          <li>SSR + hidratación sin discrepancias; sin JavaScript, la selección y las superficies se ven igual (CSS estático).</li>
        </ul>
      </Section>

      <Section index="02" title="Movimiento reducido" lead="prefers-reduced-motion (o el selector «Quieto» de arriba) desactiva atracción, presión, gotas animadas, emergencias y transiciones de marco. Los estados siguen cambiando de color: la información nunca depende del movimiento.">
        <NexCard density="compact"><NexCard.Description>Las animaciones sólo responden al puntero: con teclado todo es inmediato (política heredada de NexFrame).</NexCard.Description></NexCard>
      </Section>

      <Section index="03" title="Rendimiento" lead="Coste medido, no prometido.">
        <ul className="doc-list">
          <li>Resortes analíticos: independientes del framerate (probado a 1e‑9).</li>
          <li>Un único requestAnimationFrame compartido que se duerme en reposo, fuera de pantalla y con la pestaña oculta.</li>
          <li>Coste JS de FluidBlob: ~29 µs por fotograma con 24 puntos (Node, docs/MEDICIONES.md). Las membranas usan 48 puntos y sólo se recalculan mientras se mueven.</li>
          <li>Las regiones de NexFrame, el código y las tablas son membranas estáticas (CSS, sin SVG).</li>
        </ul>
        <div className="doc-perf" style={{ marginTop: 18 }}>
          <NexButton appearance="filled" loading={busy} loadingLabel="Midiendo" iconStart={<NexIcon name="play" />} onClick={async () => { setBusy(true); setResult(await measure(5000)); setBusy(false); }}>
            Medir 5 s en este navegador
          </NexButton>
          <p className="doc-hint" role="status" aria-live="polite">
            {result
              ? `${result.frames} fotogramas · media ${result.mean.toFixed(2)} ms (${(1000 / result.mean).toFixed(1)} fps) · p95 ${result.p95.toFixed(1)} ms · máx ${result.max.toFixed(1)} ms · >20 ms: ${result.long} · membranas vivas en la página: ${result.surfaces}`
              : 'Mide intervalos de requestAnimationFrame mientras mueves el puntero por la página. No es una garantía para otros equipos.'}
          </p>
          {result && <NexBadge tone={result.long / Math.max(1, result.frames) < 0.05 ? 'success' : 'warning'} dot>{result.long / Math.max(1, result.frames) < 0.05 ? 'Menos del 5 % de fotogramas largos' : 'Fotogramas largos por encima del 5 %'}</NexBadge>}
        </div>
      </Section>

      <Section index="04" title="Limitaciones conocidas">
        <ul className="doc-list">
          <li>Fluidez no medida aún en un equipo modesto; sólo en Chromium del panel de la app.</li>
          <li><code>corner-shape</code> (superelipse en CSS) sólo existe en Chromium reciente; en otros navegadores el modo estático cae a <code>border-radius</code>. El modo vivo (SVG) es igual en todos.</li>
          <li>La versión publicada de Bricolage Grotesque no trae eje de anchura.</li>
          <li>La expansión tarjeta → panel atrapa el foco de forma básica y no bloquea el desplazamiento de la página.</li>
        </ul>
      </Section>
    </article>
  );
}
