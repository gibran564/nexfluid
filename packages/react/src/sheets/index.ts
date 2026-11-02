/**
 * @eclipsis/react/sheets — NexSheets para React.
 *
 * Consume NexSheets Core (`@eclipsis/sheets`) y NexFluid: rejilla virtual,
 * barra de fórmulas, pestañas, herramientas, estado e inspector.
 * Estilos: los de `@eclipsis/components/styles.css` (clases `nx-sheet*`).
 */
export { NexSheets, NexSheetsEditor, NexFormulaBar, NexSheetTabs, NexSheetToolbar, NexSheetStatusBar, NexCellInspector } from './parts.tsx';
export type { NexSheetsProps } from './parts.tsx';
export { NexDataView } from './data-view.tsx';
export type { NexDataViewProps, NexDataViewMode, NexSheetsOpenRequest } from './data-view.tsx';
export { NexSheetGrid } from './grid.tsx';
export type { NexSheetGridProps } from './grid.tsx';
export { NexSheetsProvider, useNexSheets, useSheetsInteraction } from './controller.tsx';
export type { NexSheetsController, NexSheetsProviderProps, SheetsEditing } from './controller.tsx';
export * from '@eclipsis/sheets';
