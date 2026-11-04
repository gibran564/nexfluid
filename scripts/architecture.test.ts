/**
 * Reglas de arquitectura comprobadas sobre el código fuente:
 * capas, ausencia de ciclos, entradas públicas y aislamiento de dependencias pesadas.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = /\.(ts|tsx)$/;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : SOURCE.test(name) ? [path] : [];
  });
}

function imports(file: string): string[] {
  // Sin comentarios: la documentación de un módulo puede mostrar imports de ejemplo.
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [...text.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g)].map(
    (m) => (m[1] ?? m[2] ?? m[3])!,
  );
}

const PACKAGES = ['foundation', 'core', 'components', 'sheets', 'react'] as const;
const ALLOWED: Record<string, readonly string[]> = {
  foundation: [],
  core: [],
  components: ['foundation'],
  // NexSheets Core: modelo puro, sin estilos ni motor visual.
  sheets: [],
  react: ['foundation', 'core', 'components', 'sheets'],
};
const EXTERNAL: Record<string, readonly string[]> = {
  foundation: [],
  core: [],
  components: [],
  sheets: [],
  react: ['react', 'react-dom', 'react/jsx-runtime', 'react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex'],
};

describe('arquitectura', () => {
  for (const pkg of PACKAGES) {
    it(`@eclipsis/${pkg} sólo depende de las capas permitidas`, () => {
      const problems: string[] = [];
      for (const file of walk(`${root}packages/${pkg}/src`)) {
        for (const spec of imports(file)) {
          if (spec.startsWith('.')) {
            const target = resolve(dirname(file), spec);
            if (!target.startsWith(resolve(`${root}packages/${pkg}/src`))) problems.push(`${relative(root, file)} sale del paquete: ${spec}`);
            continue;
          }
          if (spec.startsWith('node:')) { problems.push(`${relative(root, file)} usa ${spec} (los paquetes son de navegador)`); continue; }
          const nex = /^@eclipsis\/([a-z]+)/.exec(spec)?.[1];
          if (nex) {
            if (!ALLOWED[pkg]!.includes(nex)) problems.push(`${relative(root, file)} importa @eclipsis/${nex}`);
            if (spec.split('/').length > 2) problems.push(`${relative(root, file)} hace una importación profunda: ${spec}`);
            continue;
          }
          if (!EXTERNAL[pkg]!.includes(spec)) problems.push(`${relative(root, file)} importa ${spec}`);
        }
      }
      assert.deepEqual(problems, []);
    });
  }

  it('no hay importaciones circulares entre archivos', () => {
    const graph = new Map<string, string[]>();
    for (const pkg of PACKAGES) {
      for (const file of walk(`${root}packages/${pkg}/src`)) {
        graph.set(file, imports(file).filter((s) => s.startsWith('.')).map((s) => resolve(dirname(file), s)));
      }
    }
    const state = new Map<string, 'visiting' | 'done'>();
    const cycles: string[] = [];
    const visit = (node: string, path: string[]) => {
      if (state.get(node) === 'done') return;
      if (state.get(node) === 'visiting') { cycles.push([...path.slice(path.indexOf(node)), node].map((p) => relative(root, p)).join(' → ')); return; }
      state.set(node, 'visiting');
      for (const next of graph.get(node) ?? []) visit(next, [...path, node]);
      state.set(node, 'done');
    };
    for (const node of graph.keys()) visit(node, []);
    assert.deepEqual(cycles, []);
  });

  it('la entrada principal de @eclipsis/react no arrastra react-markdown', () => {
    const seen = new Set<string>();
    const heavy: string[] = [];
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      for (const spec of imports(file)) {
        if (spec === 'react-markdown' || spec === 'remark-gfm') heavy.push(relative(root, file));
        if (spec.startsWith('.')) visit(resolve(dirname(file), spec));
      }
    };
    visit(`${root}packages/react/src/index.ts`);
    assert.deepEqual(heavy, []);
  });

  it('NexDocs consume sólo entradas públicas declaradas en exports', () => {
    const declared = new Set<string>();
    for (const pkg of PACKAGES) {
      const manifest = JSON.parse(readFileSync(`${root}packages/${pkg}/package.json`, 'utf8'));
      for (const entry of Object.keys(manifest.exports)) declared.add(manifest.name + entry.slice(1));
    }
    const problems: string[] = [];
    const files = walk(`${root}apps/docs/src`);
    assert.ok(files.length > 0, 'apps/docs/src no tiene archivos');
    for (const file of files) {
      for (const spec of imports(file)) {
        if (spec.startsWith('.') && resolve(dirname(file), spec).includes(`${join('nexfluid', 'packages')}`)) problems.push(`${relative(root, file)} → ${spec}`);
        if (spec.startsWith('@eclipsis/') && !declared.has(spec)) problems.push(`${relative(root, file)} → ${spec} (no es una entrada pública)`);
      }
    }
    assert.deepEqual(problems, []);
  });

  it('ningún paquete depende de NexDocs ni del Playground', () => {
    for (const pkg of PACKAGES) {
      const manifest = readFileSync(`${root}packages/${pkg}/package.json`, 'utf8');
      assert.doesNotMatch(manifest, /@eclipsis\/(docs|playground)/);
    }
  });
});
