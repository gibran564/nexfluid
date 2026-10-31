/**
 * Cifras medibles de cada preset y coste de cálculo por fotograma.
 * Uso: npm run presets  (escribe docs/MEDICIONES.md)
 */
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { MOTION_PRESETS, type MotionPresetName } from './src/presets.ts';
import { makeHarmonics, sampleContour, toSmoothPath } from './src/shape.ts';
import { dampingRatio, FluidValue, measureStepResponse, naturalFrequency } from './src/spring.ts';

const rows: string[] = [
  '| Preset | k | c | ζ | ω₀ (rad/s) | τ viscoso (s) | Sobrepaso | Asentamiento ±0.1 % | Deformación máx. | Ambiente (amp · ciclos/s) |',
  '|---|---|---|---|---|---|---|---|---|---|',
];
for (const name of Object.keys(MOTION_PRESETS) as MotionPresetName[]) {
  const p = MOTION_PRESETS[name];
  const r = measureStepResponse(p.spring);
  rows.push(
    `| \`${name}\` | ${p.spring.stiffness} | ${p.spring.damping} | ${dampingRatio(p.spring).toFixed(2)} | ${naturalFrequency(p.spring).toFixed(1)} | ${p.viscosity} | ` +
      `${(r.overshoot * 100).toFixed(1)} % | ${(r.settleTime * 1000).toFixed(0)} ms | ${(p.deform * 100).toFixed(0)} % | ${p.ambient.amplitude} · ${p.ambient.speed} |`,
  );
}

/** Coste JS de un fotograma de FluidBlob: 4 resortes + contorno + trazado. Excluye estilo, layout y pintura. */
function bench(points: number): { median: number; p95: number } {
  const harmonics = makeHarmonics(7);
  const values = [0, 1, 2, 3].map(() => new FluidValue(0, MOTION_PRESETS.flow.spring, 0.04));
  values.forEach((v, i) => v.set(i * 0.1));
  const samples: number[] = [];
  let sink = 0;
  for (let round = 0; round < 60; round++) {
    const t0 = performance.now();
    for (let frame = 0; frame < 500; frame++) {
      for (const v of values) v.step(1 / 60);
      const pts = sampleContour({
        points,
        base: { kind: 'superellipse', exponent: 4 },
        harmonics,
        ambient: 0.02,
        phase: frame / 60,
        deformation: { bulge: { angle: 1, amount: values[0]!.value }, squash: { angle: 0, amount: values[1]!.value } },
        preserveArea: true,
      });
      sink += toSmoothPath(pts, { scale: 72 }).length;
    }
    samples.push(((performance.now() - t0) / 500) * 1000);
  }
  if (sink === 0) throw new Error('sin trabajo');
  samples.sort((a, b) => a - b);
  return { median: samples[30]!, p95: samples[57]! };
}

const costRows = ['| Puntos del contorno | Mediana (µs/fotograma) | p95 (µs/fotograma) |', '|---|---|---|'];
for (const n of [16, 24, 48]) {
  bench(n); // calentamiento del JIT
  const b = bench(n);
  costRows.push(`| ${n} | ${b.median.toFixed(1)} | ${b.p95.toFixed(1)} |`);
}

const md = `# Mediciones

Generado por \`npm run presets\` el ${new Date().toISOString().slice(0, 10)} con Node ${process.version} en ${process.platform}/${process.arch}.

## Presets de movimiento

Respuesta a un salto unitario del resorte (sin el filtro viscoso, que añade retraso pero no sobrepaso).

${rows.join('\n')}

## Coste de cálculo por fotograma de FluidBlob

Sólo JavaScript: 4 resortes, muestreo del contorno con conservación de área y generación del trazado. **No incluye** recálculo de estilo, layout, rasterizado del SVG ni composición, que dependen del navegador y del tamaño en pantalla. Por eso no es una cifra de fps.

${costRows.join('\n')}
`;
writeFileSync(new URL('../../docs/MEDICIONES.md', import.meta.url), md);
console.log(md);
