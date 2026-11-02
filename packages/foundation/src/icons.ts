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
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];
