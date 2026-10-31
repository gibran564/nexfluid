/**
 * Compila los paquetes en orden de dependencias (foundation → core →
 * components → react) a `dist/` con declaraciones, y copia las hojas CSS.
 * Cada paquete se compila contra el `dist` de los anteriores, como lo haría
 * un consumidor: así se detecta cualquier import que sólo funcione desde el código fuente.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const ORDER = ['foundation', 'core', 'components', 'sheets', 'react'] as const;
const CSS: Record<string, string[]> = { foundation: ['tokens.css', 'compat/nextudio.css'], components: ['styles.css'] };

for (const pkg of ORDER) {
  const dir = `${root}packages/${pkg}/`;
  rmSync(`${dir}dist`, { recursive: true, force: true });
  execFileSync(process.execPath, [tsc, '-p', `${dir}tsconfig.build.json`], { stdio: 'inherit' });
  for (const file of CSS[pkg] ?? []) {
    mkdirSync(dirname(`${dir}dist/${file}`), { recursive: true });
    copyFileSync(`${dir}src/${file}`, `${dir}dist/${file}`);
  }
  console.log(`✓ @nexfluid/${pkg}`);
}
