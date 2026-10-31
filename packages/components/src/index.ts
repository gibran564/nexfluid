/**
 * @nexfluid/components — NexComponents sin framework.
 *
 * Dos contratos: la hoja `@nexfluid/components/styles.css` (clases `nx-*` y
 * atributos `data-nx-*`) y estos ayudantes puros de comportamiento.
 */
export { cx, rovingIndex, toDomId, slugify, safeUrl, isExternalUrl } from './behaviour.ts';
export type { Orientation } from './behaviour.ts';
export { tokenize, splitLines, normalizeLanguage, isSupportedLanguage, SUPPORTED_LANGUAGES } from './highlight.ts';
export type { Token, TokenType } from './highlight.ts';
export { APPEARANCES, DENSITIES, MOTIONS, TONES, CLASS, variantAttributes } from './contract.ts';
export type { NexAppearance, NexDensity, NexMotion, NexTone } from './contract.ts';
export { resolveSpace, columnsToFold, SPACES, DEFAULT_SPACE_THRESHOLDS } from './space.ts';
export type { NexSpace, SpaceThresholds, ColumnFit } from './space.ts';
