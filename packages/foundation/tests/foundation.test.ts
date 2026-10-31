import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { NEXTUDIO_BRIDGE } from '../src/compat.ts';
import { renderCompatCss, renderTokensCss } from '../src/css.ts';
import { ICONS } from '../src/icons.ts';
import {
  COLOR_ROLES, CONTRAST_REQUIREMENTS, contrastRatio, cssVar, customTheme, DIRECTIONS, SHAPES, SPACE, THEMES, TYPE_SCALE,
  type ThemeName,
} from '../src/tokens.ts';

const near = (a: number, b: number, eps: number) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b} (±${eps})`);

describe('temas nativos: contraste medido (WCAG 2.x)', () => {
  for (const name of Object.keys(THEMES) as ThemeName[]) {
    const t = THEMES[name];
    it(t.name, () => {
      const failures = CONTRAST_REQUIREMENTS.filter(([a, b, min]) => contrastRatio(t[a], t[b]) < min).map(
        ([a, b, min, why]) => `${why}: ${a}/${b} = ${contrastRatio(t[a], t[b]).toFixed(2)} < ${min}`,
      );
      assert.deepEqual(failures, []);
    });
  }

  it('la fórmula reproduce valores de referencia', () => {
    near(contrastRatio('#000000', '#ffffff'), 21, 1e-9);
    near(contrastRatio('#777777', '#ffffff'), 4.48, 0.01);
  });
});

describe('identidad propia: tipografía y geometría nuevas', () => {
  it('la paleta vigente se conserva (decisión del usuario): Editorial Light mantiene sus contrastes', () => {
    near(contrastRatio(THEMES['editorial-light'].accent, THEMES['editorial-light'].bg), 5.3, 0.01);
    near(contrastRatio(THEMES['pulse-light'].accent, THEMES['pulse-light'].bg), 5.91, 0.01);
  });
  it('las familias tipográficas nativas no son las de Nextudio', () => {
    const css = renderTokensCss();
    for (const f of ['Space Grotesk', 'Inter', 'JetBrains Mono']) assert.ok(!css.includes(`'${f}`) && !css.includes(` ${f},`), f);
  });
  it('la escala no es la de 8 pasos de Nextudio', () => {
    assert.notEqual(Object.keys(TYPE_SCALE).length, 8);
    assert.ok('poster' in TYPE_SCALE && 'quote' in TYPE_SCALE);
  });
  it('las cinco familias geométricas existen con la superelipse como base', () => {
    assert.deepEqual(Object.keys(SHAPES), ['fluid', 'membrane', 'capsule', 'morph', 'editorial']);
    assert.equal(SHAPES.fluid.smoothing, 1);
  });
});

describe('contrato de tokens', () => {
  it('todos los temas y el puente definen todos los roles', () => {
    for (const t of Object.values(THEMES)) for (const r of COLOR_ROLES) assert.ok(t[r], `${t.name}.${r}`);
    for (const r of COLOR_ROLES) assert.ok(NEXTUDIO_BRIDGE[r], r);
  });
  it('cssVar convierte camelCase a kebab con prefijo --nx-', () => {
    assert.equal(cssVar('surfaceRaised'), '--nx-surface-raised');
    assert.equal(cssVar('codeKeyword'), '--nx-code-keyword');
  });
  it('el espaciado es creciente y par', () => {
    const values = Object.values(SPACE);
    for (let i = 1; i < values.length; i++) assert.ok(values[i]! > values[i - 1]!);
    for (const v of values) assert.equal(v % 2, 0);
  });
  it('customTheme parte de un tema sin mutarlo', () => {
    const before = THEMES['editorial-light'].accent;
    const brand = customTheme('editorial-light', { name: 'Marca', accent: '#0b5cad' });
    assert.equal(brand.accent, '#0b5cad');
    assert.equal(THEMES['editorial-light'].accent, before);
  });
  it('cada dirección define su ADN completo y native es la síntesis', () => {
    assert.deepEqual(Object.keys(DIRECTIONS), ['fluid-editorial', 'living-matter', 'kinetic-minimal', 'native']);
    const n = DIRECTIONS.native;
    assert.equal(n.fontDisplay, DIRECTIONS['fluid-editorial'].fontDisplay, 'tipografía de A');
    assert.ok(n.meniscus > 0 && n.meniscus < DIRECTIONS['living-matter'].meniscus, 'materia de B, contenida');
    assert.ok(n.amplitude <= DIRECTIONS['living-matter'].amplitude);
  });
  it('los iconos son trazos válidos de la retícula de 24 px', () => {
    for (const [name, paths] of Object.entries(ICONS)) {
      for (const d of paths) {
        assert.match(d, /^M[\d.\s,MLHVCSQTAZmlhvcsqtaz-]+$/, name);
        for (const n of d.match(/-?\d+(\.\d+)?/g) ?? []) assert.ok(Math.abs(Number(n)) <= 24, `${name}: ${n}`);
      }
    }
  });
});

describe('hojas generadas', () => {
  it('tokens.css coincide byte a byte con la fuente TS', () => {
    assert.equal(readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8'), renderTokensCss(), 'Ejecuta `npm run tokens`');
  });
  it('compat/nextudio.css coincide y vive aparte', () => {
    assert.equal(readFileSync(new URL('../src/compat/nextudio.css', import.meta.url), 'utf8'), renderCompatCss());
    assert.ok(!renderTokensCss().includes("data-nx-theme='nextudio'"), 'la compatibilidad no está en la hoja nativa');
  });
  it('declara temas, auto, direcciones y densidades', () => {
    const css = renderTokensCss();
    for (const sel of ["[data-nx-theme='editorial-dark']", "[data-nx-theme='auto']", "[data-nx-direction='living-matter']", "[data-nx-density='compact']"]) assert.ok(css.includes(sel), sel);
    assert.ok(css.includes('--nx-surface-corner: superellipse(1.8);'));
  });
  it('el adaptador de Nextudio reproduce sus valores medidos como respaldo', () => {
    near(contrastRatio('#ad3f1c', '#f3f1ea'), 5.3, 0.01);
    assert.ok(NEXTUDIO_BRIDGE.accent.startsWith('var(--accent, #ad3f1c'));
  });
});
