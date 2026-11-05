/**
 * @nexfluid/react — NexBridge para React 19.
 *
 * Estilos necesarios (una vez, en la raíz de la aplicación):
 *   import '@nexfluid/foundation/tokens.css';
 *   import '@nexfluid/components/styles.css';
 *
 * Entradas aparte: `@nexfluid/react/markdown` (react-markdown), `/widgets`, `/motion`.
 * Los compuestos tienen también nombres planos (`NexCardTitle`, `NexTabsList`)
 * para usarlos desde Server Components, donde `NexCard.Title` no está disponible.
 */
export { NexProvider, useNex, useMotionPreference } from './provider.tsx';
export type { NexProviderProps, NexContextValue } from './provider.tsx';
export { NexSurface } from './surface.tsx';
export type { NexSurfaceProps, SurfaceKind } from './surface.tsx';
export { NexIcon } from './icon.tsx';
export type { NexIconProps } from './icon.tsx';
export { NexButton, NexIconButton } from './button.tsx';
export type { NexButtonProps, NexIconButtonProps } from './button.tsx';
export { NexBadge } from './badge.tsx';
export type { NexBadgeProps } from './badge.tsx';
export {
  NexCard, NexCardMedia, NexCardHeader, NexCardEyebrow, NexCardTitle, NexCardDescription, NexCardContent,
  NexCardFooter, NexCardActions, NexCardLink,
} from './card.tsx';
export type { NexCardProps } from './card.tsx';
export { NexTabs, NexTabsList, NexTab, NexTabsPanel } from './tabs.tsx';
export type { NexTabsProps, NexTabsListProps, NexTabProps, NexTabsPanelProps } from './tabs.tsx';
export { NexPanel } from './panel.tsx';
export type { NexPanelProps } from './panel.tsx';
export { NexNav, NexNavItem, NexNavGroup } from './nav.tsx';
export type { NexNavProps, NexNavItemProps } from './nav.tsx';
export { NexSegmented } from './segmented.tsx';
export type { NexSegmentedProps, NexSegmentedOption } from './segmented.tsx';
export { NexFrame, NexFrameRegion, useNexFrame } from './frame.tsx';
export type { NexFrameProps, NexFrameRegionName } from './frame.tsx';
export { NexCodeBlock } from './code-block.tsx';
export type { NexCodeBlockProps } from './code-block.tsx';
export type { NexAppearance, NexDensity, NexMotion, NexTone } from '@nexfluid/components';
export type { ShapeFamily, Material, DirectionName } from '@nexfluid/foundation';
export {
  NexMorph, NexMorphSource, NexMorphTarget, NexMorphTrigger, NexMorphTitle, NexMorphClose, NexMorphIncoming, NexMorphShared,
  useNexMorph, useNexMorphSource,
} from './morph.tsx';
export type { NexMorphProps, NexMorphController, NexMorphSourceProps, NexMorphTargetProps } from './morph.tsx';
export type { MorphFrame, MorphPhysics, MorphPhysicsName, MorphState } from '@nexfluid/core';
export { NexActionButton } from './action-button.tsx';
export type { NexActionButtonProps, NexActionStatus } from './action-button.tsx';
export { NexDock } from './dock.tsx';
export type { NexDockProps, NexDockItem } from './dock.tsx';
export { NexPreviewBoundary, useNexBoundary } from './boundary.tsx';
export type { NexPreviewBoundaryProps, NexBoundaryState } from './boundary.tsx';
export type { NexSpace } from '@nexfluid/components';
export {
  NexScroll, NexScrollArea, NexScrollRoot, NexScrollViewport, NexScrollRail, NexScrollThumb, NexScrollProgress, NexScrollLabel, NexScrollMarkers, NexScrollPercent, NexScrollChapter, NexScrollLane,
} from './scroll.tsx';
export type { NexScrollAreaProps, NexScrollRootProps, NexScrollViewportProps, NexScrollController, NexScrollVariant, NexScrollSection } from './scroll.tsx';
export type { ScrollState as NexScrollState } from '@nexfluid/core';
export { NexInput, NexCheckbox } from './fields.tsx';
export type { NexInputProps, NexCheckboxProps } from './fields.tsx';
export { NexPortal } from './portal.tsx';
export type { NexPortalProps, NexPortalMode, NexPortalStatus, NexPortalConsoleEntry } from './portal.tsx';
export type { NexWebPermissions } from '@nexfluid/components';
export { NexAnchoredLayer } from './anchored-layer.tsx';
export type { NexAnchoredLayerProps, NexLayerAnchor, NexLayerDismissReason, NexAnchoredLayerPresentation } from './anchored-layer.tsx';
export { useAnchoredLayer } from './anchored.ts';
export type { AnchoredLayerOptions, NexAnchorTarget, NexVirtualAnchor } from './anchored.ts';
export type { NexSide, NexAlign, FloatingPlacement } from '@nexfluid/components';
export { NexInk, matchesShortcut } from './ink.tsx';
export type { NexInkProps, NexInkAdapter, NexInkCommand, NexInkSelection, NexInkState } from './ink.tsx';
export { NexMenu, NexCommandMenu } from './menu.tsx';
export type { NexMenuProps, NexMenuItem, NexCommandMenuProps } from './menu.tsx';
export { NexFlow, NexEditorialBlock, useNexFlow } from './flow.tsx';
export type { NexFlowProps, NexEditorialBlockProps, NexEditorialBlockState, NexFlowMode, NexFlowController } from './flow.tsx';
export { NexSelect } from './select.tsx';
export type { NexSelectProps, NexSelectOption } from './select.tsx';
export { NexConsole, NexLiveConsole, NexTerminalSurface, useNexSession } from './console.tsx';
export type { NexConsoleProps, NexConsoleView, NexConsoleRenderers, NexLiveConsoleProps } from './console.tsx';
export type { NexConsoleOutput, NexConsoleState } from '@nexfluid/components';
