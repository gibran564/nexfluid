import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NEXTUDIO_BRIDGE } from '../src/compat.ts';
import { hostContrast, readCssVariables, resolveBridge } from '../src/host.ts';

// Valores de NEX Origen (terracotta claro) tal como los declara un anfitrión. No se lee
// ningún archivo de Nextudio: la prueba fija el contrato, no los colores de otra app.
const HOST = `
/* comentario { con llaves } */
:root { --bg: #f3f1ea; --surface: #fbfaf6; --surface-raised: #ffffff; --surface-sunken: #eceadf;
  --fg: #191a1c; --fg-muted: #56585f; --fg-subtle: #6b6d75; --border: #ded9cc; --border-strong: #c3bcaa;
  --accent: #ad3f1c; --accent-hover: #8c3013; --accent-fg: #fffaf7; --accent-soft: #f4e3da; --accent-line: #e2c3b4;
  --success: #1c6b46; --success-soft: #dcece3; --warning: #8a5c07; --warning-soft: #f5e9cf; --danger: #a52418; --danger-soft: #f6dedb; }
[data-theme='dark'] { --bg: #121316; --fg: #ededee; }
`;

describe('contraste de un anfitrión a través del puente', () => {
  it('lee las variables de un bloque y salta comentarios', () => {
    const vars = readCssVariables(HOST, ':root');
    assert.equal(vars['--bg'], '#f3f1ea');
    assert.equal(Object.keys(vars).length, 20);
    assert.throws(() => readCssVariables(HOST, '.no-existe'), /No se encontró/);
  });

  it('resuelve var(--x, respaldo) con el anfitrión y cae al respaldo si falta', () => {
    const resolved = resolveBridge(NEXTUDIO_BRIDGE, { '--bg': '#000000' });
    assert.equal(resolved.bg, '#000000');
    assert.equal(resolved.fg, '#191a1c');
    assert.equal(resolved.zone, 'transparent');
  });

  it('NEX Origen cumple los requisitos de un tema nativo a través del puente', () => {
    const result = hostContrast(NEXTUDIO_BRIDGE, readCssVariables(HOST, ':root'));
    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.unmeasured, []);
  });

  it('detecta un anfitrión que rompe un requisito', () => {
    const vars = { ...readCssVariables(HOST, ':root'), '--fg-muted': '#9a9a9a' };
    const result = hostContrast(NEXTUDIO_BRIDGE, vars);
    assert.ok(result.failures.some((f) => f.pair[0] === 'fgMuted' && f.ratio < f.min));
  });
});
