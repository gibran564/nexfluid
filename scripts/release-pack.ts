/**
 * Empaqueta una versión de forma reproducible y trazable. NO publica.
 *
 *   node scripts/release-pack.ts            # exige árbol limpio y tag vX.Y.Z en HEAD
 *   node scripts/release-pack.ts --draft    # sin exigir tag (PR de versión); sigue exigiendo árbol limpio
 *
 * Compila dos veces desde cero (`build:lib`), empaqueta cada paquete con
 * `npm pack` y falla si las dos tandas no dan la misma integridad sha512: lo
 * publicado tiene que poder reconstruirse desde el commit. Deja los tarballs y
 * `release/<versión>/manifest.json` (nombre, versión, integridad, commit) para
 * comparar después con lo que sirva npm.
 *
 * La publicación es un paso aparte y manual, desde el mismo commit:
 *   npm publish --provenance release/<versión>/<tarball>.tgz
 * (`--provenance` sólo funciona desde CI con OIDC; ver docs/RELEASE.md).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ORDER = ['foundation', 'core', 'components', 'sheets', 'react'] as const;
const DRAFT = process.argv.includes('--draft');
const run = (cmd: string, args: string[], cwd = root) => execFileSync(cmd, args, { cwd, encoding: 'utf8' }).trim();

/**
 * Windows no ejecuta npm.cmd mediante execFileSync sin shell. Invocamos
 * npm-cli.js con Node directamente, sin shell ni reinterpretar argumentos.
 * npm_execpath lo proporciona `npm run`; la ruta junto a node.exe permite
 * también `node scripts/release-pack.ts` en instalaciones estándar de Windows.
 */
function runNpm(args: string[], cwd = root): string {
  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  const cli = candidates.find((candidate) => candidate && /npm-cli\\.[cm]?js$/i.test(candidate) && existsSync(candidate));
  if (cli) return run(process.execPath, [cli, ...args], cwd);
  if (process.platform === 'win32') {
    throw new Error('No se encontró npm-cli.js. Ejecuta el script con npm run release:pack, o instala npm junto a Node.js.');
  }
  return run('npm', args, cwd);
}

const versions = new Set(ORDER.map((p) => JSON.parse(readFileSync(`${root}packages/${p}/package.json`, 'utf8')).version as string));
if (versions.size !== 1) throw new Error(`Los paquetes no comparten versión: ${[...versions].join(', ')}`);
const [version] = [...versions] as [string];

const dirty = run('git', ['status', '--porcelain', '--untracked-files=no']);
if (dirty) throw new Error(`El árbol tiene cambios sin commit; una versión sólo sale de un commit:\n${dirty}`);
const commit = run('git', ['rev-parse', 'HEAD']);
const tags = run('git', ['tag', '--points-at', 'HEAD']).split('\n').filter(Boolean);
if (!DRAFT && !tags.includes(`v${version}`)) throw new Error(`HEAD no tiene el tag v${version}. Etiqueta el commit o usa --draft.`);

const integrity = (file: string) => `sha512-${createHash('sha512').update(readFileSync(file)).digest('base64')}`;

function packAll(outDir: string): Record<string, { file: string; integrity: string }> {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  execFileSync(process.execPath, [`${root}scripts/build-lib.ts`], { cwd: root, stdio: 'ignore' });
  const out: Record<string, { file: string; integrity: string }> = {};
  for (const pkg of ORDER) {
    const name = runNpm(['pack', '--silent', '--pack-destination', outDir], `${root}packages/${pkg}`).split('\n').pop()!;
    out[`@nexfluid/${pkg}`] = { file: name, integrity: integrity(`${outDir}/${name}`) };
  }
  return out;
}

const target = `${root}release/${version}`;
const first = packAll(`${target}.a`);
const second = packAll(`${target}.b`);
const mismatched = Object.keys(first).filter((name) => first[name]!.integrity !== second[name]!.integrity);
rmSync(`${target}.b`, { recursive: true, force: true });
if (mismatched.length) throw new Error(`Empaquetado no reproducible: ${mismatched.join(', ')}`);

rmSync(target, { recursive: true, force: true });
renameSync(`${target}.a`, target);
const manifest = { version, commit, tags, draft: DRAFT, node: process.version, packages: first };
writeFileSync(`${target}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
for (const [name, { file, integrity: sri }] of Object.entries(first)) console.log(`✓ ${name}@${version}  ${file}  ${sri.slice(0, 30)}…`);
console.log(`Reproducible (2 compilaciones idénticas) · commit ${commit.slice(0, 7)}${DRAFT ? ' · BORRADOR, sin tag' : ` · v${version}`}`);
