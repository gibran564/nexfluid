/**
 * @nexfluid/foundation — NexFoundation (NexFluid Native).
 *
 * Contrato público: estos tokens en TS, la hoja `@nexfluid/foundation/tokens.css`
 * y, opcionalmente, el adaptador `@nexfluid/foundation/compat/nextudio.css`.
 */
export {
  THEMES, COLOR_ROLES, FONTS, TYPE_SCALE, SPACE, SHAPES, MATERIALS, BREAKPOINTS, LAYERS, LAYOUT, DENSITY, MOTION,
  MOTION_FAMILIES, MOTION_LEVELS, MOTION_LEVEL_PRESET, SURFACE_STATES, DIRECTIONS, GEOMETRY_TOKENS, CONTRAST_REQUIREMENTS,
  cssVar, customTheme, applyTheme, contrastRatio, relativeLuminance,
} from './tokens.ts';
export type { ColorTheme, ColorRole, ThemeName, Density, MotionLevel, ShapeFamily, Material, SurfaceState, Direction, DirectionName } from './tokens.ts';
export { NEXTUDIO_BRIDGE, NEXTUDIO_DIRECTION } from './compat.ts';
export { ICONS, ICON_NAMES } from './icons.ts';
export type { IconName } from './icons.ts';
export { renderTokensCss, renderCompatCss } from './css.ts';
