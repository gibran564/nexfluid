import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SANDBOX_PERMISSIONS, WEB_PAGE_PERMISSIONS, frameSandbox, isPortalMessage, navHistoryGo, navHistoryPush, navHistoryStart, resolveWebAddress, sandboxDocument,
} from '../src/web.ts';

describe('resolveWebAddress (lo que se escribe en la barra)', () => {
  it('completa el esquema y respeta http(s)', () => {
    assert.deepEqual(resolveWebAddress('  react.dev/learn '), { ok: true, url: 'https://react.dev/learn' });
    assert.deepEqual(resolveWebAddress('http://example.com'), { ok: true, url: 'http://example.com/' });
    assert.deepEqual(resolveWebAddress('localhost:5290/x'), { ok: true, url: 'http://localhost:5290/x' });
    assert.deepEqual(resolveWebAddress('ejemplo.org:8080'), { ok: true, url: 'https://ejemplo.org:8080/' });
  });
  it('rechaza esquemas peligrosos y lo que no es una dirección', () => {
    for (const bad of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,<b>x</b>', 'file:///etc/passwd', 'blob:https://x/y', 'mailto:a@b.c', 'ftp://x.org']) {
      assert.deepEqual(resolveWebAddress(bad), { ok: false, reason: 'unsafe-scheme' }, bad);
    }
    assert.deepEqual(resolveWebAddress(''), { ok: false, reason: 'empty' });
    assert.deepEqual(resolveWebAddress('hola mundo'), { ok: false, reason: 'invalid' });
    assert.deepEqual(resolveWebAddress('./ref.html'), { ok: false, reason: 'invalid' }); // relativa sin base
  });
  it('rutas relativas con base (recursos propios)', () => {
    assert.deepEqual(resolveWebAddress('reference/cola.html', undefined), { ok: false, reason: 'invalid' });
    assert.deepEqual(resolveWebAddress('./reference/cola.html', 'https://nex.dev/docs/'), { ok: true, url: 'https://nex.dev/docs/reference/cola.html' });
  });
});

describe('frameSandbox (mínimo privilegio)', () => {
  it('página de otro origen: scripts y su propio origen, nunca navegación superior', () => {
    const t = frameSandbox(WEB_PAGE_PERMISSIONS, 'page').split(' ');
    assert.ok(t.includes('allow-scripts') && t.includes('allow-same-origin') && t.includes('allow-forms'));
    assert.ok(!t.some((x) => x.startsWith('allow-top-navigation')));
    assert.ok(!t.includes('allow-modals') && !t.includes('allow-downloads'));
  });
  it('mismo origen que el host con scripts: sin allow-same-origin (no podría quitarse el sandbox)', () => {
    const t = frameSandbox(WEB_PAGE_PERMISSIONS, 'page', true).split(' ');
    assert.ok(t.includes('allow-scripts'));
    assert.ok(!t.includes('allow-same-origin'));
  });
  it('código propio: nunca allow-same-origin, aunque se pida', () => {
    assert.equal(frameSandbox(SANDBOX_PERMISSIONS, 'code'), 'allow-scripts');
    assert.ok(!frameSandbox({ scripts: true, ownOrigin: true, modals: true }, 'code').includes('allow-same-origin'));
    assert.equal(frameSandbox({}, 'code'), '');
  });
});

describe('sandboxDocument', () => {
  const doc = sandboxDocument({ html: '<p>Hola</p>', css: 'p{color:red}</style><script>x()</script>', javascript: 'console.log("</script><b>")', token: 't0k' });
  it('CSP restrictiva: sin red ni formularios por defecto', () => {
    assert.match(doc, /default-src 'none'/);
    assert.match(doc, /connect-src 'none'/);
    assert.match(doc, /form-action 'none'/);
    assert.match(sandboxDocument({ token: 't', network: true }), /connect-src https:/);
  });
  it('el código no cierra antes de tiempo su bloque', () => {
    // Dentro de <style> sólo `</style` cierra; dentro de <script>, sólo `</script`.
    assert.equal(doc.match(/<\/style>/gi)!.length, 1);
    const js = sandboxDocument({ javascript: 'a("</script><b>"); b("</SCRIPT >")', token: 't' });
    assert.equal(js.match(/<\/script/gi)!.length, 2); // puente + código, nada más
    assert.match(doc, /<\\\/script><b>/);
  });
  it('lleva el token de la sesión en el puente', () => assert.match(doc, /const token = "t0k"/));
});

describe('isPortalMessage', () => {
  const ok = { nexPortal: 1, token: 'abc', type: 'console', level: 'log', text: 'hola' };
  it('acepta sólo mensajes bien formados de esta sesión', () => {
    assert.equal(isPortalMessage(ok, 'abc'), true);
    assert.equal(isPortalMessage(ok, 'otro'), false);
    assert.equal(isPortalMessage({ ...ok, type: 'eval' }, 'abc'), false);
    assert.equal(isPortalMessage({ ...ok, level: 'debug' }, 'abc'), false);
    assert.equal(isPortalMessage({ ...ok, text: 'x'.repeat(5000) }, 'abc'), false);
    assert.equal(isPortalMessage({ ...ok, token: '' }, ''), false);
    assert.equal(isPortalMessage('hola', 'abc'), false);
  });
});

describe('historial propio', () => {
  it('atrás/adelante sobre lo abierto desde la barra; abrir otra descarta lo de adelante', () => {
    let h = navHistoryStart('https://a/');
    h = navHistoryPush(h, 'https://b/');
    h = navHistoryPush(h, 'https://c/');
    h = navHistoryGo(h, -1);
    assert.equal(h.entries[h.index], 'https://b/');
    h = navHistoryPush(h, 'https://d/');
    assert.deepEqual(h.entries, ['https://a/', 'https://b/', 'https://d/']);
    assert.equal(navHistoryGo(navHistoryGo(h, 1), 1).index, 2); // no pasa del final
    assert.equal(navHistoryPush(h, 'https://d/'), h); // repetir no duplica
    assert.deepEqual(navHistoryStart(), { entries: [], index: -1 });
  });
});
