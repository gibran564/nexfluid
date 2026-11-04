import {
  createFluidBlob,
  dampingRatio,
  isMotionPresetName,
  measureStepResponse,
  MOTION_PRESETS,
  resolveMotion,
  sharedClock,
  sharedMotionPreference,
  type BaseGeometry,
  type FluidBlobHandle,
  type MotionMode,
  type MotionOverrides,
  type MotionPresetName,
} from '@eclipsis/core';
import { applyTheme, THEMES, type ThemeName } from '@eclipsis/foundation';

const $ = <T extends Element>(sel: string) => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Falta ${sel}`);
  return el;
};

const form = $<HTMLFormElement>('#form');
const field = <T extends HTMLInputElement | HTMLSelectElement | HTMLOutputElement>(name: string) => form.elements.namedItem(name) as T;

const themeSelect = field<HTMLSelectElement>('theme');
for (const [id, t] of Object.entries(THEMES)) themeSelect.add(new Option(t.name, id));
const presetSelect = field<HTMLSelectElement>('preset');
for (const id of Object.keys(MOTION_PRESETS)) presetSelect.add(new Option(id, id));
presetSelect.value = 'flow';

const BASES: Record<string, BaseGeometry> = {
  circle: { kind: 'circle' },
  squircle: { kind: 'superellipse', exponent: 4 },
  ellipse: { kind: 'ellipse', aspect: 1.4 },
};

const clock = sharedClock();
const motionPref = sharedMotionPreference();
const stage = createFluidBlob($('#stage'));

const COMPARED: MotionPresetName[] = ['calm', 'flow', 'elastic', 'viscous'];
const compared: FluidBlobHandle[] = COMPARED.map((name, i) => {
  const cell = document.createElement('figure');
  cell.className = 'compare-cell';
  const host = document.createElement('div');
  host.className = 'compare-blob';
  const cap = document.createElement('figcaption');
  cap.textContent = name;
  cell.append(host, cap);
  $('#compare').append(cell);
  return createFluidBlob(host, { motion: name, seed: 11 + i, points: 20 });
});

function presetName(): MotionPresetName {
  return isMotionPresetName(presetSelect.value) ? presetSelect.value : 'flow';
}

/** Lleva ζ y τ a los valores del preset elegido. */
function loadPresetDefaults(): void {
  const p = MOTION_PRESETS[presetName()];
  field<HTMLInputElement>('zeta').value = dampingRatio(p.spring).toFixed(2);
  field<HTMLInputElement>('tau').value = String(p.viscosity);
}

function readOverrides(): MotionOverrides {
  const p = MOTION_PRESETS[presetName()];
  const zeta = Number(field<HTMLInputElement>('zeta').value);
  const tau = Number(field<HTMLInputElement>('tau').value);
  const intensity = Number(field<HTMLInputElement>('intensity').value);
  const out: MotionOverrides = {};
  if (Math.abs(zeta - dampingRatio(p.spring)) > 0.005) out.dampingRatio = zeta;
  if (Math.abs(tau - p.viscosity) > 0.0005) out.viscosity = tau;
  if (intensity !== 0.5) out.intensity = intensity;
  return out;
}

function renderCode(preset: MotionPresetName, overrides: MotionOverrides, base: string, seed: number, points: number, ambient: boolean): void {
  const lines = [`import { createFluidBlob } from 'nexfluid';`, ``, `const blob = createFluidBlob(host, {`, `  motion: '${preset}',`];
  const o = Object.entries(overrides).map(([k, v]) => `${k}: ${Number(v.toFixed(3))}`);
  if (o.length) lines.push(`  overrides: { ${o.join(', ')} },`);
  if (base !== 'circle') {
    const fields = Object.entries(BASES[base] ?? {}).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`);
    lines.push(`  base: { ${fields.join(', ')} },`);
  }
  if (seed !== 7) lines.push(`  seed: ${seed},`);
  if (points !== 24) lines.push(`  points: ${points},`);
  if (!ambient) lines.push(`  ambient: false,`);
  lines.push(`});`, ``, `// Al desmontar:`, `blob.destroy();`);
  $('#code').textContent = lines.join('\n');
}

function renderResponse(preset: MotionPresetName, overrides: MotionOverrides): void {
  const m = resolveMotion(preset, overrides);
  const r = measureStepResponse(m.spring, { horizon: 2 });
  const W = 400;
  const H = 160;
  const y = (v: number) => H - 24 - v * (H - 56);
  const x = (t: number) => (t / 2) * W;
  const pts = r.samples.filter((_, i) => i % 4 === 0).map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`);
  const svg = $<SVGSVGElement>('#response');
  svg.innerHTML = `
    <line class="axis" x1="0" x2="${W}" y1="${y(1)}" y2="${y(1)}" />
    <line class="axis axis-faint" x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}" />
    <line class="settle" x1="${x(Math.min(2, r.settleTime))}" x2="${x(Math.min(2, r.settleTime))}" y1="8" y2="${H - 16}" />
    <polyline class="curve" points="${pts.join(' ')}" />
    <text class="tick" x="4" y="${y(1) - 6}">objetivo</text>
    <text class="tick" x="${W - 4}" y="${H - 4}" text-anchor="end">2 s</text>`;
  $('#response-cap').textContent =
    `ζ ${dampingRatio(m.spring).toFixed(2)} · k ${m.spring.stiffness} · sobrepaso ${(r.overshoot * 100).toFixed(1)} % · ` +
    `asentamiento ±0.1 % en ${(r.settleTime * 1000).toFixed(0)} ms · τ ${m.viscosity.toFixed(2)} s (la curva no incluye τ)`;
  $('#intent').textContent = m.intent;
}

function apply(): void {
  const theme = themeSelect.value as ThemeName;
  applyTheme(document.documentElement, THEMES[theme]);
  document.documentElement.dataset.scheme = THEMES[theme].scheme;

  const preset = presetName();
  const overrides = readOverrides();
  const baseKey = field<HTMLSelectElement>('base').value;
  const seed = Math.max(1, Math.min(9999, Number(field<HTMLInputElement>('seed').value) || 7));
  const points = Number(field<HTMLInputElement>('points').value);
  const ambient = field<HTMLInputElement>('ambient').checked;
  clock.timeScale = Number(field<HTMLInputElement>('speed').value);
  motionPref.mode = field<HTMLSelectElement>('motionMode').value as MotionMode;

  stage.update({ motion: preset, overrides, base: BASES[baseKey] ?? BASES.circle!, seed, points, ambient });
  for (const blob of compared) blob.update({ ambient, overrides: { intensity: overrides.intensity ?? 0.5 } });

  const out = (name: string, text: string) => (field<HTMLOutputElement>(name).value = text);
  out('pointsOut', String(points));
  out('intensityOut', Number(field<HTMLInputElement>('intensity').value).toFixed(2));
  out('zetaOut', Number(field<HTMLInputElement>('zeta').value).toFixed(2));
  out('tauOut', `${Number(field<HTMLInputElement>('tau').value).toFixed(2)} s`);
  out('speedOut', `${clock.timeScale.toFixed(2)}×`);

  renderCode(preset, overrides, baseKey, seed, points, ambient);
  renderResponse(preset, overrides);
}

presetSelect.addEventListener('change', loadPresetDefaults);
form.addEventListener('input', apply);
form.addEventListener('change', apply);
form.addEventListener('submit', (e) => e.preventDefault());
$('#reset').addEventListener('click', () => {
  loadPresetDefaults();
  field<HTMLInputElement>('intensity').value = '0.5';
  apply();
});

$('#pulse').addEventListener('click', () => {
  for (const blob of compared) blob.press();
  setTimeout(() => compared.forEach((blob) => blob.release()), 180);
});

// ---------------------------------------------------------------- medición
$('#measure').addEventListener('click', async (e) => {
  const button = e.currentTarget as HTMLButtonElement;
  button.disabled = true;
  $('#perf').textContent = 'Midiendo…';
  const intervals: number[] = [];
  await new Promise<void>((resolve) => {
    let last: number | null = null;
    const start = performance.now();
    const frame = (now: number) => {
      if (last !== null) intervals.push(now - last);
      last = now;
      if (now - start < 5000) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
  intervals.sort((a, b) => a - b);
  const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
  const pct = (p: number) => intervals[Math.min(intervals.length - 1, Math.floor(p * intervals.length))]!;
  const long = intervals.filter((v) => v > 20).length;
  $('#perf').textContent =
    `${intervals.length} fotogramas · media ${mean.toFixed(2)} ms (${(1000 / mean).toFixed(1)} fps) · ` +
    `p95 ${pct(0.95).toFixed(2)} ms · máx ${intervals.at(-1)!.toFixed(1)} ms · >20 ms: ${long} · ` +
    `tareas en el reloj: ${clock.size} · reducido: ${motionPref.reduced ? 'sí' : 'no'}`;
  button.disabled = false;
});

loadPresetDefaults();
apply();
