/**
 * Nextudio Compatibility — adaptador opcional, nunca fundacional.
 *
 * Permite usar los componentes de NexFluidUI dentro de Nextudio con su
 * apariencia actual mientras se adopta NexFluid Native. Lee las variables
 * de Nextudio (`--bg`, `--accent`…) y, fuera de Nextudio, cae a los valores
 * de NEX Origen claro. Se publica en una hoja aparte
 * (`@nexfluid/foundation/compat/nextudio.css`): quien no la importa no la carga.
 */
import type { ColorRole, Direction } from './tokens.ts';

/** Valores de NEX Origen claro (globals.css de Nextudio) como respaldo fuera de la aplicación. */
const ORIGEN: Record<ColorRole, string> = {
  bg: '#f3f1ea', surface: '#fbfaf6', surfaceRaised: '#ffffff', surfaceSunken: '#eceadf',
  fg: '#191a1c', fgMuted: '#56585f', fgSubtle: '#6b6d75', border: '#ded9cc', borderStrong: '#c3bcaa',
  accent: '#ad3f1c', accentHover: '#8c3013', accentFg: '#fffaf7', accentSoft: '#f4e3da', accentLine: '#e2c3b4',
  success: '#1c6b46', successSoft: '#dcece3', warning: '#8a5c07', warningSoft: '#f5e9cf', danger: '#a52418', dangerSoft: '#f6dedb',
  fluid: '#ad3f1c', fluidSoft: '#e2c3b4', fluidFg: '#fffaf7', zone: 'transparent', depth: 'rgb(25 26 28 / 0.12)',
  codeKeyword: '#ad3f1c', codeString: '#1c6b46', codeNumber: '#8a5c07', codeComment: '#56585f', codeType: '#8c3013',
};

const NEXTUDIO_VAR: Partial<Record<ColorRole, string>> = {
  bg: '--bg', surface: '--surface', surfaceRaised: '--surface-raised', surfaceSunken: '--surface-sunken',
  fg: '--fg', fgMuted: '--fg-muted', fgSubtle: '--fg-subtle', border: '--border', borderStrong: '--border-strong',
  accent: '--accent', accentHover: '--accent-hover', accentFg: '--accent-fg', accentSoft: '--accent-soft', accentLine: '--accent-line',
  success: '--success', successSoft: '--success-soft', warning: '--warning', warningSoft: '--warning-soft',
  danger: '--danger', dangerSoft: '--danger-soft', fluid: '--accent', fluidSoft: '--accent-line', fluidFg: '--accent-fg',
  codeKeyword: '--accent', codeString: '--success', codeNumber: '--warning', codeComment: '--fg-muted', codeType: '--accent-hover',
};

/** Rol → `var(--nextudio, respaldo Origen)`. */
export const NEXTUDIO_BRIDGE: Record<ColorRole, string> = Object.fromEntries(
  (Object.keys(ORIGEN) as ColorRole[]).map((role) => {
    const v = NEXTUDIO_VAR[role];
    return [role, v ? `var(${v}, ${ORIGEN[role]})` : ORIGEN[role]];
  }),
) as Record<ColorRole, string>;

/** Dirección de compatibilidad: la geometría y la tipografía actuales de Nextudio. */
export const NEXTUDIO_DIRECTION: Direction & { fonts: { display: string; text: string; mono: string } } = {
  name: 'Nextudio Compatibility',
  summary: 'Apariencia actual de Nextudio (NEX Origen): filetes de 1 px, radios de 2–10 px, Space Grotesk / Inter. Sólo para adopción gradual.',
  fontDisplay: 'display', fontText: 'text', displayWeight: 600, displayStretch: '100%', displayTracking: '-0.02em',
  surfaceShape: 'editorial', controlShape: 'editorial', contentShape: 'editorial',
  attract: 0, press: 0, edge: 1, edgeActive: 1, meniscus: 0, glow: 0, zone: 0,
  gap: '0px', indicator: 'thread', pinch: 0, amplitude: 0.5,
  fonts: {
    display: "var(--font-space-grotesk, 'Space Grotesk'), ui-sans-serif, system-ui, sans-serif",
    text: "var(--font-inter, Inter), ui-sans-serif, system-ui, sans-serif",
    mono: "var(--font-jetbrains-mono, 'JetBrains Mono'), ui-monospace, monospace",
  },
};
