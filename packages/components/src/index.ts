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
export { reorderSlot, moveItem, edgeScrollStep, keyboardMove } from './reorder.ts';
export {
  NEX_GRID_GAPS, NEX_GRID_LIMITS, clampColumns, clampSpan, normalizeGridLayout, gridRowsOf, gridKeyboardMove, gridResizeStep, gridReorderSlot, gridGapValue,
} from './grid.ts';
export type { NexGridGap, NexGridItemLayout, NexGridLayout, GridRect } from './grid.ts';
export { resolveSpace, columnsToFold, SPACES, DEFAULT_SPACE_THRESHOLDS } from './space.ts';
export type { NexSpace, SpaceThresholds, ColumnFit } from './space.ts';
export * from './console/types.ts';
export { normalizeNexViewEvents, layoutNexViewEvents } from './console/model.ts';
export type { NexViewEvent } from './console/model.ts';
export { diagnoseOutput, pythonLocation } from './console/diagnostics.ts';
export type { NexViewDiagnostic } from './console/diagnostics.ts';
export { recognizePrintedStructures } from './console/printed.ts';
export type { PrintedStructure } from './console/printed.ts';
export { consoleTranscript, splitInputLines, consoleStateLabel, consoleStatus, pendingPrompt, fromNexBookOutputs, fromTerminalSegments } from './console/session.ts';
export type { NexConsoleSegment } from './console/session.ts';
export { createSessionStore, SESSION_CAPABILITIES } from './console/live.ts';
export type { NexSessionKind, NexSessionConnection, NexSessionCapabilities, NexSessionEvent, NexSessionSnapshot, NexSessionTransport, NexTerminalEmulator, NexSessionStore, NexSessionStoreOptions } from './console/live.ts';
export { composeNexView, columnsFor } from './console/compose.ts';
export type { NexViewSection, NexViewItem, NexViewRole, ComposeOptions } from './console/compose.ts';
export { placeFloating, spaceAround, anchorClipped } from './anchor.ts';
export type { NexSide, NexAlign, AnchorRect, PlaceFloatingInput, FloatingPlacement } from './anchor.ts';
export {
  resolveWebAddress, frameSandbox, sandboxDocument, sandboxResource, isPortalMessage, isPortalChannelMessage, portalHostMessage, navHistoryStart, navHistoryPush, navHistoryGo,
  WEB_PAGE_PERMISSIONS, SANDBOX_PERMISSIONS, PORTAL_MESSAGE_MAX,
} from './web.ts';
export type { WebAddress, NexWebPermissions, SandboxSource, SandboxResources, PortalConsoleMessage, PortalChannelMessage, PortalHostMessage, NavHistory } from './web.ts';
