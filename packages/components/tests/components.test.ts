import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { cx, rovingIndex, safeUrl, slugify, toDomId } from '../src/behaviour.ts';
import { isSupportedLanguage, normalizeLanguage, splitLines, SUPPORTED_LANGUAGES, tokenize } from '../src/highlight.ts';

describe('rovingIndex (teclado ARIA de pestañas y barras)', () => {
  const none = [false, false, false, false];
  it('flechas horizontales avanzan, retroceden y dan la vuelta', () => {
    assert.equal(rovingIndex('ArrowRight', 0, none), 1);
    assert.equal(rovingIndex('ArrowRight', 3, none), 0);
    assert.equal(rovingIndex('ArrowLeft', 0, none), 3);
  });
  it('Inicio y Fin van al primero y al último habilitados', () => {
    assert.equal(rovingIndex('Home', 2, [true, false, false, true]), 1);
    assert.equal(rovingIndex('End', 1, [true, false, false, true]), 2);
  });
  it('salta deshabilitados', () => {
    assert.equal(rovingIndex('ArrowRight', 0, [false, true, true, false]), 3);
    assert.equal(rovingIndex('ArrowLeft', 3, [false, true, true, false]), 0);
  });
  it('respeta orientación y RTL; otras teclas no navegan', () => {
    assert.equal(rovingIndex('ArrowDown', 0, none, 'vertical'), 1);
    assert.equal(rovingIndex('ArrowRight', 0, none, 'vertical'), null);
    assert.equal(rovingIndex('ArrowLeft', 0, none, 'horizontal', 'rtl'), 1);
    assert.equal(rovingIndex('a', 0, none), null);
  });
  it('sin elementos habilitados no hay destino', () => {
    assert.equal(rovingIndex('ArrowRight', 0, [true, true]), null);
    assert.equal(rovingIndex('Home', 0, []), null);
  });
});

describe('safeUrl (política del Markdown no confiable)', () => {
  it('permite http, https, mailto, anclas y relativas', () => {
    for (const ok of ['https://nextudio.dev', 'http://a.b/c?d=1', 'mailto:hola@ejemplo.org', '#instalacion', './guia.md', '/docs', 'archivo.png']) {
      assert.equal(safeUrl(ok), ok, ok);
    }
  });
  it('rechaza esquemas peligrosos, ofuscados y relativos de protocolo', () => {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', ' javascript:x', 'data:text/html,<b>', 'vbscript:x', 'file:///etc/passwd', '//evil.example/x', 'nex://asset/1', '']) {
      assert.equal(safeUrl(bad), null, JSON.stringify(bad));
    }
  });
  it('mailto puede desactivarse (imágenes)', () => {
    assert.equal(safeUrl('mailto:x@y.z', { allowMailto: false }), null);
  });
});

describe('utilidades', () => {
  it('cx ignora valores vacíos', () => assert.equal(cx('a', false, null, undefined, '', 'b'), 'a b'));
  it('slugify quita diacríticos y signos', () => {
    assert.equal(slugify('Instalación rápida (v1)'), 'instalacion-rapida-v1');
    assert.equal(slugify('¿Qué?'), 'que');
  });
  it('toDomId produce ids válidos y distintos para valores distintos', () => {
    const a = toDomId('tabs', ':r1:', 'vista previa');
    const b = toDomId('tabs', ':r1:', 'vista/previa');
    assert.match(a, /^[A-Za-z0-9_-]+$/);
    assert.notEqual(a, b);
  });
});

describe('tokenize (resaltado ligero)', () => {
  const samples: Record<string, string> = {
    ts: "import { NexCard } from '@nexfluid/react';\nconst n: number = 42; // nota\nexport function A() { return <NexCard appearance=\"editorial\" />; }",
    python: 'def total(xs):\n    """Suma."""\n    return sum(xs)  # fin\nprint(True, None, 3.5)',
    json: '{ "name": "@nexfluid/react", "version": 1, "ok": true }',
    css: '.nx-card { border: 1px solid var(--nx-border); color: #191a1c; }',
    html: '<a href="https://x.y" class=\'z\'>Hola</a><!-- c -->',
    bash: 'npm run dev -- --port 5290 # docs\nexport NODE_ENV="test"',
    markdown: '# Título\n\n- **negrita** y `código` [enlace](https://x.y)',
  };

  for (const [lang, code] of Object.entries(samples)) {
    it(`${lang}: los tokens reconstruyen el texto exacto`, () => {
      assert.equal(tokenize(code, lang).map((t) => t.text).join(''), code);
    });
  }

  it('reconoce lo esencial de TypeScript', () => {
    const t = tokenize(samples.ts!, 'tsx');
    const of = (type: string) => t.filter((x) => x.type === type).map((x) => x.text.trim());
    assert.ok(of('keyword').includes('import'));
    assert.ok(of('string').some((s) => s.includes('@nexfluid/react')));
    assert.ok(of('comment').some((s) => s.includes('nota')));
    assert.ok(of('number').includes('42'));
    assert.ok(of('tag').some((s) => s.startsWith('<NexCard')));
  });

  it('un comparador no es una etiqueta', () => {
    assert.ok(!tokenize('if (a > b && c < d) {}', 'ts').some((t) => t.type === 'tag'));
  });

  it('un lenguaje desconocido es texto plano; los alias se normalizan', () => {
    assert.deepEqual(tokenize('x := 1', 'go'), [{ type: 'plain', text: 'x := 1' }]);
    assert.equal(normalizeLanguage('TSX'), 'typescript');
    assert.equal(normalizeLanguage('sh'), 'shell');
    assert.ok(isSupportedLanguage('py'));
    assert.ok(SUPPORTED_LANGUAGES.length >= 8);
  });

  it('el texto con marcado nunca se interpreta: sigue siendo texto', () => {
    const code = '<img src=x onerror=alert(1)>';
    assert.equal(tokenize(code, 'html').map((t) => t.text).join(''), code);
  });

  it('splitLines conserva el número de líneas', () => {
    const lines = splitLines(tokenize('a\n\n/* x\ny */\nb', 'js'));
    assert.equal(lines.length, 5);
  });
});

describe('contrato CSS', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  it('sólo usa tokens --nx-* definidos por NexFoundation (ningún color literal)', () => {
    const tokens = readFileSync(new URL('../../foundation/src/tokens.css', import.meta.url), 'utf8');
    const defined = new Set(tokens.match(/--nx-[a-z0-9-]+(?=:)/g));
    // Locales: declarados en la propia hoja o fijados en línea por el componente (alto del marco, ancho del inspector…).
    const local = new Set([...(css.match(/--nx-[a-z0-9-]+(?=:)/g) ?? []), '--nx-frame-height', '--nx-frame-inspector-w', '--nx-frame-navigation-w', '--nx-frame-explorer-w', '--nx-code-max-height',
      // Fijadas por los componentes en tiempo de ejecución (puntero, columnas, nivel…).
      '--nx-zone-x', '--nx-zone-y', '--nx-emerge-x', '--nx-nav-level', '--nx-frame-cols', '--nx-frame-areas', '--nx-preview-w', '--nx-morph-p', '--nx-morph-in', '--nx-morph-i', '--nx-explorer-w', '--nx-explorer-reveal', '--nx-inspector-w', '--nx-inspector-reveal',
      '--nx-scroll-max', '--nx-scroll-fill', '--nx-scroll-at', '--nx-scroll-marker', '--nx-near', '--nx-sheets-height', '--nx-aspect', '--nx-sheet-rowhead', '--nx-font-serif', '--nx-danger', '--nx-anchor-arrow', '--nx-portal-height']);
    const used = new Set(css.match(/var\(--nx-[a-z0-9-]+/g)?.map((v) => v.slice(4)));
    const unknown = [...used].filter((v) => !defined.has(v) && !local.has(v));
    assert.deepEqual(unknown, []);
    assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-f]{3,8}\b(?![\w-])/i, 'sin colores hexadecimales');
  });
  it('todas las clases usan el prefijo nx-', () => {
    const classes = new Set(css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, '').match(/\.[a-z][\w-]*/g));
    const foreign = [...classes].filter((c) => !c.startsWith('.nx-') && !c.startsWith('.nf-blob') && !c.startsWith('.katex'));
    assert.deepEqual(foreign, []);
  });
  it('respeta prefers-reduced-motion', () => assert.match(css, /@media \(prefers-reduced-motion: reduce\)/));
});

describe('integridad espacial', () => {
  it('el modo depende del ancho del contenedor', async () => {
    const { resolveSpace } = await import('../src/space.ts');
    assert.equal(resolveSpace(1200), 'expanded');
    assert.equal(resolveSpace(700), 'compact');
    assert.equal(resolveSpace(375), 'constrained');
    assert.equal(resolveSpace(0), 'expanded'); // sin medir (servidor): composición completa
    assert.equal(resolveSpace(700, { compactBelow: 600, constrainedBelow: 400 }), 'expanded');
  });
  it('las columnas laterales se pliegan antes de comprimir la principal', async () => {
    const { columnsToFold } = await import('../src/space.ts');
    // 933 px: inspector 300 + explorador 240 dejarían 353 px al lienzo (< 420).
    assert.equal(columnsToFold({ available: 913, sides: [300, 240], gap: 10, mainMin: 420 }), 1);
    assert.equal(columnsToFold({ available: 1400, sides: [300, 240], gap: 10, mainMin: 420 }), 0);
    assert.equal(columnsToFold({ available: 500, sides: [300, 240], gap: 10, mainMin: 420 }), 2);
  });
});

describe('foco: un solo indicador en campos compuestos', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  /** Especificidad (a, b, c) de un selector simple de esta hoja (clases, atributos, pseudo-clases; :is cuenta su argumento más fuerte). */
  const specificity = (sel: string): [number, number, number] => {
    let s = sel.replace(/:is\(([^)]*)\)/g, (_, inner: string) => {
      const best = inner.split(',').map((x) => specificity(x.trim())).sort((x, y) => y[1] - x[1] || y[2] - x[2])[0]!;
      return ' .__x'.repeat(best[1]);
    }).replace(/:where\([^)]*\)/g, '').replace(/::[\w-]+/g, '');
    const b = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) ?? []).length;
    s = s.replace(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g, ' ');
    const c = (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
    return [(sel.match(/#[\w-]+/g) ?? []).length, b, c];
  };
  const beats = (x: [number, number, number], y: [number, number, number]) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  // Reglas genéricas típicas de una aplicación que NO deben volver a pintar un rectángulo dentro del campo.
  const HOSTILE = [':where(.app) :focus-visible', 'input:focus-visible', '.app input:focus'];
  const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({ selectors: m[1]!.split(/,(?![^(]*\))/).map((s) => s.trim()), body: m[2]! }));
  const winner = (control: string) => rules.filter((r) => /outline:\s*none/.test(r.body)).flatMap((r) => r.selectors).filter((s) => s.includes(control) && /:focus/.test(s));

  for (const control of ['.nx-input__control', '.nx-select__search', '.nx-formula-bar__input', '.nx-sheet__editor', '.nx-md-editor__input']) {
    it(`${control}: outline none al enfocar, más fuerte que las reglas globales`, () => {
      const candidates = winner(control);
      assert.ok(candidates.length, `falta una regla :focus con outline: none para ${control}`);
      const best = candidates.map(specificity).sort((x, y) => -beats(x, y))[0]!;
      for (const hostile of HOSTILE) assert.ok(beats(best, specificity(hostile)) > 0, `${control} pierde frente a «${hostile}»`);
    });
  }

  it('el foco de NexInput lo pinta el contenedor redondeado (:focus-within), no el input', () => {
    assert.match(css, /\.nx-input:focus-within\s*\{[^}]*box-shadow:[^}]*var\(--nx-accent\)/);
    const own = rules.filter((r) => r.selectors.some((s) => /\.nx-input__control/.test(s)) && /(?:^|;)\s*(?:border|box-shadow)\s*:\s*(?!\s|none\b|0\b)/.test(r.body));
    assert.deepEqual(own.map((r) => r.selectors.join(', ')), [], 'el input interno no debe tener borde ni sombra propios');
  });
});

describe('NexFrame: el estado de un marco no alcanza a los marcos anidados', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('las reglas .nx-frame[estado] llegan a sus regiones por hijos directos, no por descendencia', () => {
    // Un laboratorio (NexFrame) dentro del catálogo (otro NexFrame) no debe heredar
    // su modo compacto, su superposición del inspector ni su modo de pestaña.
    const leaks = css.match(/\.nx-frame(?:\[[^\]]+\])+ (?!>)\.nx-frame__[a-z-]+/g) ?? [];
    assert.deepEqual(leaks, []);
    const morph = css.match(/\.nx-frame__layout\[data-nx-morphing\] (?!>)[.:]/g) ?? [];
    assert.deepEqual(morph, []);
  });
});
