/**
 * Iconografía Nex: retícula de 24 px, trazo de 1.5 px, extremos redondos,
 * `currentColor`. Datos puros (sin framework): cualquier adaptador los pinta.
 *
 * Nextudio no usa una biblioteca de iconos; dibuja SVG en línea con estas
 * mismas reglas. Este conjunto es deliberadamente pequeño: un icono entra
 * cuando un componente lo necesita.
 */
export const ICONS = {
  'arrow-right': ['M5 12h14', 'M13 6l6 6-6 6'],
  'arrow-left': ['M19 12H5', 'M11 6l-6 6 6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  copy: ['M9 9h10v10H9z', 'M5 15V5h10'],
  search: ['M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z', 'M15.5 15.5L20 20'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  external: ['M14 5h5v5', 'M19 5l-8 8', 'M17 14v5H5V7h5'],
  /** Volver a cargar. */
  reload: ['M19.5 12a7.5 7.5 0 1 1-2.2-5.3', 'M19.5 4.5v4h-4'],
  /** Ampliar / reducir una superficie. */
  expand: ['M14 4h6v6', 'M10 20H4v-6', 'M20 4l-6.5 6.5', 'M4 20l6.5-6.5'],
  shrink: ['M20 10h-6V4', 'M4 14h6v6', 'M14 10l6.5-6.5', 'M10 14l-6.5 6.5'],
  /** Una superficie web. */
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3.5 12h17', 'M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z'],
  file: ['M6 3h8l4 4v14H6z', 'M14 3v4h4'],
  folder: ['M3 6.5h6.5l2 2H21V19H3z'],
  code: ['M8.5 8L4.5 12l4 4', 'M15.5 8l4 4-4 4', 'M13.5 5.5l-3 13'],
  eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', 'M12 14.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5z'],
  settings: ['M4 7h10', 'M18 7h2', 'M4 17h2', 'M10 17h10', 'M16 4.5v5', 'M8 14.5v5'],
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2.5v2', 'M12 19.5v2', 'M2.5 12h2', 'M19.5 12h2', 'M5.3 5.3l1.4 1.4', 'M17.3 17.3l1.4 1.4', 'M5.3 18.7l1.4-1.4', 'M17.3 6.7l1.4-1.4'],
  moon: ['M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z'],
  play: ['M7 5l12 7-12 7z'],
  inspector: ['M4 4h16v16H4z', 'M14.5 4v16'],
  sidebar: ['M4 4h16v16H4z', 'M9.5 4v16'],
  grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  dot: ['M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 7.5v.5'],
  alert: ['M12 3.5L21.5 20h-19z', 'M12 10v4.5', 'M12 17v.5'],
  drop: ['M12 3.5C9 8 6.5 10.8 6.5 14a5.5 5.5 0 0 0 11 0c0-3.2-2.5-6-5.5-10.5z'],
  /** Asa de reordenamiento: seis puntos. */
  grip: ['M9 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M15 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M9 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M15 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M9 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M15 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  /** Más acciones. */
  more: ['M6 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'M18 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'],
  /**
   * Generar con IA: una chispa fluida, su burbuja y una partícula, en ese orden.
   * Son trazos separados para animarlos por separado (`data-nx-live` en
   * `@nexfluid/components`); la chispa respira hacia `ICON_POSES['ai-generate']`.
   */
  'ai-generate': [
    'M7.7 11.92C9.5 9.93 8.39 5.87 9.59 5.81C10.79 5.75 10.09 9.9 12.08 11.7C14.07 13.5 17.13 12.44 17.19 13.64C17.25 14.84 14.1 14.09 12.3 16.08C10.5 18.07 11.59 21.73 10.39 21.79C9.19 21.85 9.91 18.1 7.92 16.3C5.93 14.5 3.27 15.54 3.21 14.34C3.15 13.14 5.9 13.91 7.7 11.92z',
    'M18.6 7.15a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z',
    'M20.25 10.75h0',
  ],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/**
 * Otras poses del primer trazo de un icono, con los mismos comandos que el de
 * reposo: así `d` se interpola sin saltos. La hoja de `@nexfluid/components`
 * las copia en sus `@keyframes` y sus pruebas comprueban que coinciden.
 */
export const ICON_POSES = {
  'ai-generate': {
    breath: 'M7.33 11.58C9.13 9.59 8.18 6.58 9.63 6.51C11.07 6.44 10.42 9.53 12.42 11.33C14.41 13.13 16.52 12.22 16.59 13.67C16.66 15.12 14.47 14.42 12.67 16.42C10.87 18.41 11.8 21.02 10.35 21.09C8.91 21.16 9.58 18.47 7.58 16.67C5.59 14.87 3.88 15.76 3.81 14.31C3.74 12.86 5.53 13.58 7.33 11.58z',
  },
} as const satisfies Partial<Record<IconName, Record<string, string>>>;
