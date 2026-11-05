/**
 * Mide el contraste de los temas de una aplicación anfitriona a través de un puente.
 *
 *   node --conditions=nexfluid-source scripts/host-contrast.ts <hoja.css> "<selector base>" ["<selector que se superpone>"...]
 *
 * Cada selector añade sus variables sobre las anteriores, como la cascada. Ejemplo
 * para el estilo terracotta oscuro de Nextudio:
 *   … globals.css "[data-style='terracotta']" "[data-theme='dark'],\n[data-theme='dark'] [data-style='terracotta']"
 * Sale con código 1 si algún requisito de `CONTRAST_REQUIREMENTS` no se cumple.
 */
import { readFileSync } from 'node:fs';
import { hostContrast, NEXTUDIO_BRIDGE, readCssVariables } from '@nexfluid/foundation';

const [file, ...selectors] = process.argv.slice(2).map((a) => a.replace(/\\n/g, '\n'));
if (!file || !selectors.length) throw new Error('Uso: host-contrast.ts <hoja.css> "<selector>" [...]');
const css = readFileSync(file, 'utf8');
const vars = Object.assign({}, ...selectors.map((s) => readCssVariables(css, s)));
const { failures, unmeasured } = hostContrast(NEXTUDIO_BRIDGE, vars);
for (const f of failures) console.log(`✗ ${f.why}: ${f.pair.join('/')} = ${f.ratio.toFixed(2)} < ${f.min}`);
if (unmeasured.length) console.log(`Sin medir (no hexadecimal): ${unmeasured.join(', ')}`);
console.log(failures.length ? `${failures.length} requisito(s) sin cumplir` : 'Cumple todos los requisitos de contraste');
process.exitCode = failures.length ? 1 : 0;
