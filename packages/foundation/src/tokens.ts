/**
 * NexFoundation — NexFluid Native.
 *
 * Fuente única de verdad del lenguaje «Living Editorial Interfaces». El CSS
 * (`tokens.css`) se GENERA desde aquí y una prueba impide la deriva.
 *
 * Tres capas independientes que se combinan en cualquier contenedor:
 *   · tema (`data-nx-theme`): color y profundidad;
 *   · dirección (`data-nx-direction`): tipografía, geometría, materia y física;
 *   · densidad (`data-nx-density`): tamaño de controles.
 * Nextudio no define nada de esto: su adaptador vive en `compat.ts`.
 */

// ===================================================================== color

export interface ColorTheme {
  name: string;
  scheme: 'light' | 'dark';
  /** Campo: el fondo sobre el que flotan las membranas. */
  bg: string;
  /** Membrana base. */
  surface: string;
  /** Membrana elevada (controles, menús). */
  surfaceRaised: string;
  /** Membrana hundida (código, pistas). */
  surfaceSunken: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  /** Borde de reposo de una membrana (decorativo). */
  border: string;
  /** Borde con tensión (atracción, foco cercano). */
  borderStrong: string;
  /** Interacción, selección y foco. */
  accent: string;
  accentHover: string;
  accentFg: string;
  accentSoft: string;
  accentLine: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  /** Materia fluida: blobs, activación, zonas cromáticas. */
  fluid: string;
  fluidSoft: string;
  /** Texto sobre la materia. */
  fluidFg: string;
  /** Zona cromática bajo el puntero (semitransparente). */
  zone: string;
  /** Color de profundidad para sombras teñidas. */
  depth: string;
  codeKeyword: string;
  codeString: string;
  codeNumber: string;
  codeComment: string;
  codeType: string;
}

export const THEMES = {
  /** Papel, tinta y terracota: se conserva la paleta vigente (decisión del usuario). */
  'editorial-light': {
    name: 'Editorial Light', scheme: 'light',
    bg: '#f3f1ea', surface: '#fbfaf6', surfaceRaised: '#ffffff', surfaceSunken: '#eceadf',
    fg: '#191a1c', fgMuted: '#56585f', fgSubtle: '#6b6d75', border: '#ded9cc', borderStrong: '#c3bcaa',
    accent: '#ad3f1c', accentHover: '#8c3013', accentFg: '#fffaf7', accentSoft: '#f4e3da', accentLine: '#e2c3b4',
    success: '#1c6b46', successSoft: '#dcece3', warning: '#8a5c07', warningSoft: '#f5e9cf', danger: '#a52418', dangerSoft: '#f6dedb',
    fluid: '#ad3f1c', fluidSoft: '#e2c3b4', fluidFg: '#fffaf7', zone: 'rgb(173 63 28 / 0.1)', depth: 'rgb(25 26 28 / 0.16)',
    codeKeyword: '#ad3f1c', codeString: '#1c6b46', codeNumber: '#7a5106', codeComment: '#56585f', codeType: '#8c3013',
  },
  'editorial-dark': {
    name: 'Editorial Dark', scheme: 'dark',
    bg: '#121316', surface: '#191a1e', surfaceRaised: '#212328', surfaceSunken: '#0d0e10',
    fg: '#f0eee9', fgMuted: '#a7aab3', fgSubtle: '#878a93', border: '#2c2e34', borderStrong: '#414450',
    accent: '#ff8a5c', accentHover: '#ffa887', accentFg: '#1a0d07', accentSoft: '#2a1a12', accentLine: '#4a2c1c',
    success: '#55d19a', successSoft: '#14261e', warning: '#e8b45c', warningSoft: '#2a2114', danger: '#ff8a80', dangerSoft: '#2c1715',
    fluid: '#ff8a5c', fluidSoft: '#4a2c1c', fluidFg: '#1a0d07', zone: 'rgb(255 138 92 / 0.12)', depth: 'rgb(0 0 0 / 0.6)',
    codeKeyword: '#ff8a5c', codeString: '#55d19a', codeNumber: '#e8b45c', codeComment: '#a7aab3', codeType: '#ffa887',
  },
  'pulse-light': {
    name: 'Pulse Light', scheme: 'light',
    bg: '#f7f5fa', surface: '#ffffff', surfaceRaised: '#ffffff', surfaceSunken: '#f0eff4',
    fg: '#201f22', fgMuted: '#59585b', fgSubtle: '#6d6c6f', border: '#e0dfe3', borderStrong: '#8f8d91',
    accent: '#b9006d', accentHover: '#930055', accentFg: '#ffffff', accentSoft: '#ffeef4', accentLine: '#ffb0ce',
    success: '#1c6b46', successSoft: '#dcece3', warning: '#8a5c07', warningSoft: '#f5e9cf', danger: '#a52418', dangerSoft: '#f6dedb',
    fluid: '#b9006d', fluidSoft: '#ffb0ce', fluidFg: '#ffffff', zone: 'rgb(185 0 109 / 0.08)', depth: 'rgb(32 31 34 / 0.13)',
    codeKeyword: '#b9006d', codeString: '#1c6b46', codeNumber: '#7a5106', codeComment: '#59585b', codeType: '#930055',
  },
  'pulse-dark': {
    name: 'Pulse Dark', scheme: 'dark',
    bg: '#131315', surface: '#1d1c1f', surfaceRaised: '#28272a', surfaceSunken: '#171619',
    fg: '#f0eff4', fgMuted: '#bbbabe', fgSubtle: '#a2a1a5', border: '#37363a', borderStrong: '#6f6e71',
    accent: '#ffa5c8', accentHover: '#ffc4db', accentFg: '#2a0016', accentSoft: '#3a1a29', accentLine: '#6b2c48',
    success: '#55d19a', successSoft: '#14261e', warning: '#e8b45c', warningSoft: '#2a2114', danger: '#ff8a80', dangerSoft: '#2c1715',
    fluid: '#ffa5c8', fluidSoft: '#6b2c48', fluidFg: '#2a0016', zone: 'rgb(255 165 200 / 0.12)', depth: 'rgb(0 0 0 / 0.6)',
    codeKeyword: '#ffa5c8', codeString: '#55d19a', codeNumber: '#e8b45c', codeComment: '#bbbabe', codeType: '#ffc4db',
  },
  'monochrome-ink': {
    name: 'Monochrome Ink', scheme: 'light',
    bg: '#ffffff', surface: '#fafaf9', surfaceRaised: '#ffffff', surfaceSunken: '#f1f1ef',
    fg: '#0d0d0d', fgMuted: '#555555', fgSubtle: '#666666', border: '#dcdcd8', borderStrong: '#9a9a96',
    accent: '#0d0d0d', accentHover: '#333333', accentFg: '#ffffff', accentSoft: '#ececea', accentLine: '#bdbdb8',
    success: '#1c6b46', successSoft: '#dcece3', warning: '#8a5c07', warningSoft: '#f5e9cf', danger: '#a52418', dangerSoft: '#f6dedb',
    fluid: '#0d0d0d', fluidSoft: '#cfcfcb', fluidFg: '#ffffff', zone: 'rgb(13 13 13 / 0.06)', depth: 'rgb(0 0 0 / 0.12)',
    codeKeyword: '#0d0d0d', codeString: '#1c6b46', codeNumber: '#7a5106', codeComment: '#555555', codeType: '#333333',
  },
  'chromatic-fluid': {
    name: 'Chromatic Fluid', scheme: 'dark',
    bg: '#0f1024', surface: '#171833', surfaceRaised: '#1f2142', surfaceSunken: '#0b0c1c',
    fg: '#f4f1ff', fgMuted: '#b2acd6', fgSubtle: '#9f99c9', border: '#2a2b52', borderStrong: '#454775',
    accent: '#ff7a63', accentHover: '#ff9a88', accentFg: '#1b0a06', accentSoft: '#2e1a2a', accentLine: '#5a2f3a',
    success: '#55d19a', successSoft: '#14261e', warning: '#e8b45c', warningSoft: '#2a2114', danger: '#ff8a80', dangerSoft: '#2c1715',
    fluid: '#8577ff', fluidSoft: '#ff7a63', fluidFg: '#0b0820', zone: 'rgb(133 119 255 / 0.14)', depth: 'rgb(0 0 0 / 0.55)',
    codeKeyword: '#ff7a63', codeString: '#55d19a', codeNumber: '#e8b45c', codeComment: '#b2acd6', codeType: '#a99fff',
  },
} as const satisfies Record<string, ColorTheme>;

export type ThemeName = keyof typeof THEMES;
export type ColorRole = Exclude<keyof ColorTheme, 'name' | 'scheme'>;

export const COLOR_ROLES: readonly ColorRole[] = [
  'bg', 'surface', 'surfaceRaised', 'surfaceSunken', 'fg', 'fgMuted', 'fgSubtle', 'border', 'borderStrong',
  'accent', 'accentHover', 'accentFg', 'accentSoft', 'accentLine', 'success', 'successSoft', 'warning', 'warningSoft',
  'danger', 'dangerSoft', 'fluid', 'fluidSoft', 'fluidFg', 'zone', 'depth',
  'codeKeyword', 'codeString', 'codeNumber', 'codeComment', 'codeType',
];

/** `surfaceRaised` → `--nx-surface-raised`. */
export function cssVar(role: string): string {
  return `--nx-${role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/** Tema de marca: parte de uno nativo y sustituye lo necesario. */
export function customTheme(base: ThemeName, overrides: Partial<ColorTheme> & { name: string }): ColorTheme {
  return { ...THEMES[base], ...overrides };
}

/** Declara un tema en línea sobre un elemento (alternativa a `data-nx-theme`). */
export function applyTheme(el: HTMLElement, theme: ColorTheme | Record<ColorRole, string>): void {
  for (const role of COLOR_ROLES) el.style.setProperty(cssVar(role), theme[role]);
  if ('scheme' in theme) el.style.colorScheme = theme.scheme;
}

// ================================================================ tipografía

/** Familias nativas. La aplicación carga las fuentes (p. ej. @fontsource); aquí sólo hay pilas. */
export const FONTS = {
  /** Grotesca variable en anchura y peso: la tipografía cinética se apoya en su eje `wdth`. */
  display: "'Bricolage Grotesque Variable', 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
  text: "'Geist Variable', Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'Geist Mono Variable', 'Geist Mono', ui-monospace, 'SF Mono', Consolas, monospace",
  /** Contrapunto editorial: cursivas de cita y énfasis, nunca en controles. */
  serif: "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
} as const;

/**
 * Escala editorial con un salto deliberado entre `title` y `display`/`poster`:
 * la tipografía es estructura (portadas, cabeceras de sección), no sólo texto.
 */
export const TYPE_SCALE = {
  poster: { size: 'clamp(3.25rem, 1.6rem + 7.2vw, 9.5rem)', leading: '0.84', tracking: '-0.055em', family: 'display', weight: 700 },
  display: { size: 'clamp(2.5rem, 1.5rem + 3.8vw, 5.25rem)', leading: '0.9', tracking: '-0.045em', family: 'display', weight: 650 },
  title: { size: 'clamp(1.75rem, 1.35rem + 1.5vw, 2.6rem)', leading: '0.98', tracking: '-0.03em', family: 'display', weight: 620 },
  heading: { size: '1.375rem', leading: '1.12', tracking: '-0.02em', family: 'display', weight: 600 },
  subhead: { size: '1.125rem', leading: '1.35', tracking: '-0.01em', family: 'text', weight: 500 },
  body: { size: '1rem', leading: '1.6', tracking: '0', family: 'text', weight: 400 },
  small: { size: '0.875rem', leading: '1.5', tracking: '0', family: 'text', weight: 400 },
  micro: { size: '0.75rem', leading: '1.35', tracking: '0.01em', family: 'mono', weight: 450 },
  quote: { size: 'clamp(1.5rem, 1.2rem + 1.1vw, 2.25rem)', leading: '1.12', tracking: '-0.01em', family: 'serif', weight: 400 },
} as const;

// ============================================================ espacio y forma

/** Ritmo de 4 px con saltos editoriales amplios arriba. Índice → px. */
export const SPACE = { 0: 0, 1: 2, 2: 4, 3: 8, 4: 12, 5: 16, 6: 24, 7: 32, 8: 48, 9: 64, 10: 96, 11: 128 } as const;

/**
 * Familias geométricas. Cada componente tiene una por defecto y acepta `shape`.
 * `radius` en px (o `pill`), `smoothing` 0–1 (superelipse), `attract` px de
 * abombamiento máximo hacia el puntero, `press` aplastamiento con área constante.
 */
export const SHAPES = {
  /** Contorno orgánico suave: superficies que flotan. */
  fluid: { radius: 28, smoothing: 1, attract: 7, press: 0.018, cornerShape: 'squircle' },
  /** Superficie con tensión controlada: tarjetas, paneles, regiones. */
  membrane: { radius: 20, smoothing: 0.85, attract: 4, press: 0.012, cornerShape: 'superellipse(1.8)' },
  /** Forma alargada deformable: controles, indicadores, insignias. */
  capsule: { radius: 'pill', smoothing: 1, attract: 3, press: 0.045, cornerShape: 'round' },
  /** Membrana preparada para transformarse (tarjeta → panel). */
  morph: { radius: 22, smoothing: 0.9, attract: 4, press: 0.012, cornerShape: 'superellipse(1.8)' },
  /** Estructural: contenido largo, tablas, código. Casi recta, sin deformación. */
  editorial: { radius: 6, smoothing: 0.3, attract: 0, press: 0, cornerShape: 'round' },
} as const;
export type ShapeFamily = keyof typeof SHAPES;

/** Materiales de una membrana: relleno y comportamiento del borde. */
export const MATERIALS = ['base', 'raised', 'sunken', 'clear', 'accent', 'solid', 'ink', 'fluid'] as const;
export type Material = (typeof MATERIALS)[number];

export const BREAKPOINTS = { sm: 600, md: 760, lg: 1080, xl: 1360 } as const;

export const LAYERS = { base: 0, raised: 10, frame: 30, overlay: 40, popover: 50, toast: 60 } as const;

export const LAYOUT = { measure: '64ch', columns: 12, gutter: '24px', page: '1240px' } as const;

/** Densidad: alto de control y relleno. comfortable cumple el objetivo táctil de 44 px. */
export const DENSITY = {
  compact: { control: '34px', padX: '14px', gap: '8px', cardPad: '16px', font: '0.8125rem' },
  comfortable: { control: '44px', padX: '20px', gap: '14px', cardPad: '24px', font: '0.9375rem' },
  spacious: { control: '52px', padX: '26px', gap: '20px', cardPad: '32px', font: '1rem' },
} as const;
export type Density = keyof typeof DENSITY;

// ================================================================ movimiento

/**
 * Familias de interacción: cada una comparte una física. Los presets son los
 * de @nexfluid/core; las duraciones CSS se usan en el nivel `subtle`.
 */
export const MOTION_FAMILIES = {
  /** Superficies (tarjetas, paneles, regiones): viscosas, nunca rebotan. */
  surface: { preset: 'viscous', css: { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
  /** Controles (botones, segmentos): presión elástica breve. */
  control: { preset: 'elastic', css: { duration: 140, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' } },
  /** Indicadores (pestañas, navegación): borde magnético que tira + borde viscoso que sigue. */
  indicator: { preset: 'magnetic', trail: 'viscous', css: { duration: 300, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' } },
  /** Contenido: emerge una vez; nunca se mueve mientras se lee. */
  content: { preset: 'calm', css: { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' } },
} as const;

export const MOTION = {
  ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
  state: { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  ...Object.fromEntries(Object.entries(MOTION_FAMILIES).map(([k, v]) => [k, v.css])),
} as {
  ease: string;
  state: { duration: number; easing: string };
  surface: { duration: number; easing: string };
  control: { duration: number; easing: string };
  indicator: { duration: number; easing: string };
  content: { duration: number; easing: string };
};

/** Escala común de movimiento. Teclado y movimiento reducido son siempre inmediatos. */
export const MOTION_LEVELS = ['none', 'subtle', 'fluid', 'elastic'] as const;
export type MotionLevel = (typeof MOTION_LEVELS)[number];
export const MOTION_LEVEL_PRESET = { fluid: 'flow', elastic: 'elastic' } as const;

/** Ciclo de estados de toda superficie interactiva. */
export const SURFACE_STATES = ['rest', 'attract', 'deform', 'activate', 'morph', 'settle'] as const;
export type SurfaceState = (typeof SURFACE_STATES)[number];

// ================================================================ direcciones

/**
 * Una dirección es el ADN no cromático: tipografía, geometría, materia y física.
 * Tres exploraciones (A, B, C) y la síntesis elegida, `native`.
 */
export interface Direction {
  name: string;
  summary: string;
  fontDisplay: string;
  fontText: string;
  /** Peso y anchura (eje wdth, %) de los titulares. */
  displayWeight: number;
  displayStretch: string;
  displayTracking: string;
  /** Radio de superficie, de control y de contenido. */
  surfaceShape: ShapeFamily;
  controlShape: ShapeFamily;
  contentShape: ShapeFamily;
  /** Abombamiento máximo (px) y presión de las superficies. */
  attract: number;
  press: number;
  /** Grosor del borde en reposo y bajo tensión (px). */
  edge: number;
  edgeActive: number;
  /** 0–1: brillo interior del menisco, profundidad teñida y zona cromática bajo el puntero. */
  meniscus: number;
  glow: number;
  zone: number;
  /** Separación entre membranas de un NexFrame. */
  gap: string;
  /** Indicador: `liquid` (gota rellena) o `thread` (hilo); `pinch` 0–1 del cuello al estirarse. */
  indicator: 'liquid' | 'thread';
  pinch: number;
  /** Multiplicador de amplitud del movimiento. */
  amplitude: number;
}

export const DIRECTIONS = {
  /** A · Fluid Editorial: la tipografía manda; superficies contenidas, contraste preciso. */
  'fluid-editorial': {
    name: 'A · Fluid Editorial',
    summary: 'Tipografía dominante y condensada, composición asimétrica, superficies estructurales y un hilo líquido como indicador.',
    fontDisplay: 'display', fontText: 'text', displayWeight: 760, displayStretch: '76%', displayTracking: '-0.05em',
    surfaceShape: 'editorial', controlShape: 'capsule', contentShape: 'editorial',
    attract: 2, press: 0.01, edge: 1, edgeActive: 1.5, meniscus: 0, glow: 0, zone: 0.4,
    gap: '2px', indicator: 'thread', pinch: 0.5, amplitude: 0.7,
  },
  /** B · Living Matter: materia expresiva, tensión superficial visible, transformaciones evidentes. */
  'living-matter': {
    name: 'B · Living Matter',
    summary: 'Superficies orgánicas con menisco y profundidad teñida, zonas cromáticas, gotas rellenas con cuello y física elástica.',
    fontDisplay: 'display', fontText: 'text', displayWeight: 600, displayStretch: '100%', displayTracking: '-0.035em',
    surfaceShape: 'fluid', controlShape: 'capsule', contentShape: 'membrane',
    attract: 9, press: 0.03, edge: 1.25, edgeActive: 2.5, meniscus: 0.9, glow: 1, zone: 1,
    gap: '14px', indicator: 'liquid', pinch: 0.9, amplitude: 1.3,
  },
  /** C · Kinetic Minimalism: casi sin decoración; la identidad es la transformación. */
  'kinetic-minimal': {
    name: 'C · Kinetic Minimalism',
    summary: 'Monocromía, sin bordes ni sombras; el estado se comunica por movimiento y forma. Titulares ligeros y anchos.',
    fontDisplay: 'text', fontText: 'text', displayWeight: 380, displayStretch: '100%', displayTracking: '-0.04em',
    surfaceShape: 'membrane', controlShape: 'capsule', contentShape: 'membrane',
    attract: 5, press: 0.02, edge: 0, edgeActive: 1, meniscus: 0, glow: 0, zone: 0.6,
    gap: '8px', indicator: 'thread', pinch: 0.85, amplitude: 1.1,
  },
  /** Síntesis elegida: tipografía de A, materia de B contenida, disciplina de C. */
  native: {
    name: 'NexFluid Native',
    summary: 'Titulares condensados de A con cursivas serif; membranas de B con menisco y profundidad sutiles; color y movimiento sólo con propósito, como en C.',
    fontDisplay: 'display', fontText: 'text', displayWeight: 680, displayStretch: '84%', displayTracking: '-0.045em',
    surfaceShape: 'membrane', controlShape: 'capsule', contentShape: 'editorial',
    attract: 5, press: 0.015, edge: 1, edgeActive: 1.75, meniscus: 0.45, glow: 0.45, zone: 0.75,
    gap: '10px', indicator: 'liquid', pinch: 0.7, amplitude: 1,
  },
} as const satisfies Record<string, Direction>;
export type DirectionName = keyof typeof DIRECTIONS;

/** Compatibilidad hacia atrás del motor (FluidBlob). */
export const GEOMETRY_TOKENS = { curvature: 1, elasticity: 0.84, viscosity: 0.04, smoothness: 24, radius: 20, maxDeform: 0.12, fusion: 0.5, amplitude: 0.02 } as const;

// ================================================================= contraste

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new TypeError(`Color no soportado: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** Razón de contraste WCAG 2.x entre dos colores hexadecimales. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Pares que cada tema nativo debe cumplir: [primer plano, fondo, mínimo, motivo]. */
export const CONTRAST_REQUIREMENTS: ReadonlyArray<readonly [ColorRole, ColorRole, number, string]> = [
  ['fg', 'bg', 7, 'texto sobre el campo'],
  ['fg', 'surface', 7, 'texto en membranas'],
  ['fg', 'surfaceRaised', 7, 'texto en controles'],
  ['fg', 'surfaceSunken', 7, 'texto en zonas hundidas'],
  ['fgMuted', 'bg', 4.5, 'texto secundario'],
  ['fgMuted', 'surface', 4.5, 'texto secundario en membranas'],
  ['fgSubtle', 'surface', 4.5, 'metadatos'],
  ['accentFg', 'accent', 4.5, 'acción principal'],
  ['accent', 'bg', 3, 'indicador de foco y selección'],
  ['accent', 'surface', 4.5, 'enlaces y texto de acento'],
  ['accent', 'accentSoft', 4.5, 'texto sobre selección'],
  ['fg', 'accentSoft', 7, 'texto sobre gota de selección'],
  ['success', 'successSoft', 4.5, 'aviso de éxito'],
  ['warning', 'warningSoft', 4.5, 'aviso de advertencia'],
  ['danger', 'dangerSoft', 4.5, 'aviso de error'],
  ['danger', 'surface', 4.5, 'texto de error'],
  ['fluid', 'bg', 3, 'materia como gráfico'],
  ['fluidFg', 'fluid', 4.5, 'texto sobre magma'],
  ['codeKeyword', 'surfaceSunken', 4.5, 'código: palabras clave'],
  ['codeString', 'surfaceSunken', 4.5, 'código: cadenas'],
  ['codeNumber', 'surfaceSunken', 4.5, 'código: números'],
  ['codeComment', 'surfaceSunken', 4.5, 'código: comentarios'],
  ['codeType', 'surfaceSunken', 4.5, 'código: tipos'],
];
