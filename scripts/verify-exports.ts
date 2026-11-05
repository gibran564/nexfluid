/**
 * Comprueba los contratos publicados (dist), sin la condición de código fuente:
 * cada entrada de `exports` existe, se importa en Node y expone lo documentado.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const EXPECTED: Record<string, string[]> = {
  '@nexfluid/foundation': ['THEMES', 'TYPE_SCALE', 'SPACE', 'DENSITY', 'MOTION', 'ICONS', 'ICON_POSES', 'contrastRatio', 'renderTokensCss', 'hostContrast'],
  '@nexfluid/core': ['stepSpring', 'FluidValue', 'MOTION_PRESETS', 'sharedClock', 'createFluidBlob', 'sampleContour'],
  '@nexfluid/components': ['cx', 'rovingIndex', 'safeUrl', 'tokenize', 'CLASS', 'resolveSpace', 'reorderSlot', 'moveItem', 'keyboardMove', 'normalizeNexViewEvents', 'createSessionStore', 'fromNexBookOutputs', 'composeNexView', 'columnsFor'],
  '@nexfluid/sheets': ['createWorkbook', 'evaluateSheet', 'pasteGrid', 'csvToSheet', 'toCsv', 'createHistory', 'moveSelection', 'fillRange', 'createAxis', 'parseWorkbook'],
  '@nexfluid/react': ['NexProvider', 'NexButton', 'NexIconButton', 'NexBadge', 'NexCard', 'NexCardTitle', 'NexTabs', 'NexTab', 'NexTabsList', 'NexTabsPanel', 'NexFrame', 'NexFrameRegion', 'NexCodeBlock', 'NexIcon', 'NexMenu', 'NexCommandMenu', 'NexFlow', 'NexEditorialBlock', 'useNexFlow', 'NexConsole', 'NexLiveConsole'],
  '@nexfluid/react/markdown': ['NexMarkdown', 'NexMarkdownField'],
  '@nexfluid/react/widgets': ['NexMarkdownWidget', 'NexPropertiesWidget'],
  '@nexfluid/react/motion': ['FluidBlob'],
  '@nexfluid/react/sheets': ['NexSheets', 'NexSheetGrid', 'NexFormulaBar', 'NexSheetTabs', 'useNexSheets', 'createWorkbook', 'NexDataView'],
};

let files = 0;
for (const pkg of ['foundation', 'core', 'components', 'sheets', 'react']) {
  const manifest = JSON.parse(readFileSync(`${root}packages/${pkg}/package.json`, 'utf8'));
  for (const [entry, target] of Object.entries<Record<string, string>>(manifest.exports)) {
    for (const [condition, file] of Object.entries(target)) {
      if (condition === 'nexfluid-source') continue;
      assert.ok(existsSync(`${root}packages/${pkg}/${file}`), `${manifest.name}${entry.slice(1)} → ${file} no existe (¿npm run build:lib?)`);
      files++;
    }
  }
}
for (const [specifier, names] of Object.entries(EXPECTED)) {
  const mod = await import(specifier);
  for (const name of names) assert.ok(name in mod, `${specifier} no exporta ${name}`);
  console.log(`✓ ${specifier} (${Object.keys(mod).length} exportaciones)`);
}
console.log(`✓ ${files} archivos de exports presentes`);
