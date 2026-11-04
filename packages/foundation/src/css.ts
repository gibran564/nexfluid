/**
 * Genera las hojas de NexFoundation desde los tokens TS. Puro: las pruebas
 * comparan los archivos publicados con esta salida.
 */
import { NEXTUDIO_BRIDGE, NEXTUDIO_DIRECTION } from './compat.ts';
import {
  BREAKPOINTS, COLOR_ROLES, cssVar, DENSITY, DIRECTIONS, FONTS, LAYERS, LAYOUT, MOTION, SHAPES, SPACE, THEMES, TYPE_SCALE,
  type ColorRole, type ColorTheme, type Direction, type ShapeFamily,
} from './tokens.ts';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const block = (selector: string, lines: string[]) => `${selector} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}`;

function colorLines(values: Record<ColorRole, string>, scheme?: string): string[] {
  const lines = COLOR_ROLES.map((r) => `${cssVar(r)}: ${values[r]};`);
  if (scheme) lines.unshift(`color-scheme: ${scheme};`);
  return lines;
}
const themeValues = (t: ColorTheme) => Object.fromEntries(COLOR_ROLES.map((r) => [r, t[r]])) as Record<ColorRole, string>;

function shapeLines(role: 'surface' | 'control' | 'content', family: ShapeFamily, d: Direction): string[] {
  const s = SHAPES[family];
  const radius = s.radius === 'pill' ? '9999px' : `${s.radius}px`;
  const attract = role === 'control' ? Math.min(3, d.attract * 0.6) * (s.attract > 0 ? 1 : 0) : (d.attract * s.attract) / 4;
  const press = role === 'content' || s.press === 0 ? 0 : role === 'control' ? Math.min(0.06, d.press * 3) : d.press;
  return [
    `--nx-${role}-family: ${family};`,
    `--nx-${role}-radius: ${radius};`,
    `--nx-${role}-smoothing: ${s.smoothing};`,
    `--nx-${role}-corner: ${s.cornerShape};`,
    `--nx-${role}-attract: ${+attract.toFixed(2)};`,
    `--nx-${role}-press: ${+press.toFixed(3)};`,
  ];
}

function directionLines(d: Direction, fonts: { display: string; text: string } = { display: FONTS[d.fontDisplay as 'display'], text: FONTS[d.fontText as 'text'] }): string[] {
  return [
    `--nx-font-heading: ${fonts.display};`,
    `--nx-font-body: ${fonts.text};`,
    `--nx-display-weight: ${d.displayWeight};`,
    `--nx-display-stretch: ${d.displayStretch};`,
    `--nx-display-tracking: ${d.displayTracking};`,
    ...shapeLines('surface', d.surfaceShape, d),
    ...shapeLines('control', d.controlShape, d),
    ...shapeLines('content', d.contentShape, d),
    `--nx-edge: ${d.edge}px;`,
    `--nx-edge-active: ${d.edgeActive}px;`,
    `--nx-meniscus: ${d.meniscus};`,
    `--nx-glow: ${d.glow};`,
    `--nx-zone-strength: ${d.zone};`,
    `--nx-gap: ${d.gap};`,
    `--nx-indicator: ${d.indicator};`,
    `--nx-pinch: ${d.pinch};`,
    `--nx-amplitude: ${d.amplitude};`,
  ];
}

export function renderTokensCss(): string {
  const out = ['/* @eclipsis/foundation — NexFluid Native. GENERADO por `npm run tokens` desde src/tokens.ts. No editar a mano. */', ''];

  const scale: string[] = [];
  for (const [k, v] of Object.entries(FONTS)) scale.push(`--nx-font-${k}: ${v};`);
  for (const [k, v] of Object.entries(TYPE_SCALE)) scale.push(`--nx-text-${k}: ${v.size};`, `--nx-text-${k}-leading: ${v.leading};`, `--nx-text-${k}-tracking: ${v.tracking};`);
  for (const [k, v] of Object.entries(SPACE)) scale.push(`--nx-space-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(LAYERS)) scale.push(`--nx-layer-${k}: ${v};`);
  for (const [k, v] of Object.entries(BREAKPOINTS)) scale.push(`--nx-breakpoint-${k}: ${v}px;`);
  scale.push(`--nx-measure: ${LAYOUT.measure};`, `--nx-gutter: ${LAYOUT.gutter};`, `--nx-page: ${LAYOUT.page};`, `--nx-ease: ${MOTION.ease};`);
  for (const k of ['state', 'surface', 'control', 'indicator', 'content'] as const) {
    scale.push(`--nx-motion-${k}-duration: ${MOTION[k].duration}ms;`, `--nx-motion-${k}-easing: ${MOTION[k].easing};`);
  }
  for (const [name, s] of Object.entries(SHAPES)) {
    scale.push(`--nx-shape-${name}-radius: ${s.radius === 'pill' ? '9999px' : `${s.radius}px`};`, `--nx-shape-${name}-smoothing: ${s.smoothing};`, `--nx-shape-${name}-corner: ${s.cornerShape};`);
  }
  out.push('/* ---- Escalas ---- */', block(':root', scale), '');

  out.push('/* ---- Densidad: [data-nx-density] ---- */');
  const density = (d: keyof typeof DENSITY) => Object.entries(DENSITY[d]).map(([k, v]) => `--nx-density-${kebab(k)}: ${v};`);
  out.push(block(":root,\n[data-nx-density='comfortable']", density('comfortable')));
  out.push(block("[data-nx-density='compact']", density('compact')));
  out.push(block("[data-nx-density='spacious']", density('spacious')), '');

  out.push('/* ---- Temas: [data-nx-theme] ---- */');
  for (const name of Object.keys(THEMES) as Array<keyof typeof THEMES>) {
    if (name === 'editorial-light') {
      // `:root` da los valores por defecto, pero NO `color-scheme`: en una isla dentro de
      // otra aplicación, declararlo en `:root` impone el esquema claro al anfitrión
      // (barras de desplazamiento y controles nativos) aunque esté en modo oscuro.
      out.push(block(":root,\n[data-nx-theme='editorial-light']", colorLines(themeValues(THEMES[name]))));
      out.push(block("[data-nx-theme='editorial-light']", [`color-scheme: ${THEMES[name].scheme};`]));
      continue;
    }
    out.push(block(`[data-nx-theme='${name}']`, colorLines(themeValues(THEMES[name]), THEMES[name].scheme)));
  }
  out.push(block("[data-nx-theme='auto']", colorLines(themeValues(THEMES['editorial-light']), 'light')));
  out.push(`@media (prefers-color-scheme: dark) {\n${block("[data-nx-theme='auto']", colorLines(themeValues(THEMES['editorial-dark']), 'dark')).replace(/^/gm, '  ')}\n}`, '');

  out.push('/* ---- Direcciones: [data-nx-direction] ---- */');
  out.push(block(":root,\n[data-nx-direction='native']", directionLines(DIRECTIONS.native)));
  for (const name of ['fluid-editorial', 'living-matter', 'kinetic-minimal'] as const) out.push(block(`[data-nx-direction='${name}']`, directionLines(DIRECTIONS[name])));
  out.push('');
  return out.join('\n');
}

/** Hoja opcional del adaptador de Nextudio. */
export function renderCompatCss(): string {
  return [
    '/* @eclipsis/foundation/compat/nextudio.css — Nextudio Compatibility (opcional). GENERADO desde src/compat.ts. */',
    '/* Lee los tokens de Nextudio; fuera de la aplicación cae a NEX Origen claro. No es la identidad de NexFluidUI. */',
    '',
    block("[data-nx-theme='nextudio']", colorLines(NEXTUDIO_BRIDGE)),
    block("[data-nx-direction='nextudio']", [
      `--nx-font-display: ${NEXTUDIO_DIRECTION.fonts.display};`,
      `--nx-font-text: ${NEXTUDIO_DIRECTION.fonts.text};`,
      `--nx-font-mono: ${NEXTUDIO_DIRECTION.fonts.mono};`,
      ...directionLines(NEXTUDIO_DIRECTION, NEXTUDIO_DIRECTION.fonts),
      '--nx-surface-radius: 6px;',
      '--nx-control-radius: 4px;',
      '--nx-content-radius: 6px;',
    ]),
    '',
  ].join('\n');
}
