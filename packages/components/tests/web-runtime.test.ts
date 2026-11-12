import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { frameSandbox, isPortalChannelMessage, portalHostMessage, sandboxDocument, sandboxResource } from '../src/web.ts';

const cspOf = (doc: string) => /content="([^"]+)"/.exec(doc)![1]!;

describe('NexPortal sandbox para runtimes (workers, wasm, recursos explícitos)', () => {
  it('por defecto: sin workers, sin wasm, sin recursos', () => {
    const csp = cspOf(sandboxDocument({ token: 't' }));
    assert.doesNotMatch(csp, /worker-src|wasm-unsafe-eval|unsafe-eval/);
    assert.match(csp, /connect-src 'none'/);
  });

  it('workers sólo desde data:, wasm sin eval de JS, recursos como prefijos exactos', () => {
    const csp = cspOf(sandboxDocument({
      token: 't', workers: true, wasm: true, network: true,
      resources: {
        scripts: ['https://app.test/runtime/'],
        connect: ['http://localhost:3000/runtime/', 'https://*.evil', 'https://x.test/a b', 'javascript:alert(1)', 'https://u:p@x.test/', 'https://x.test/?q=1'],
      },
    }));
    assert.match(csp, /worker-src data:(;|$)/);
    assert.match(csp, /script-src 'unsafe-inline' 'wasm-unsafe-eval' https:\/\/app\.test\/runtime\//);
    assert.match(csp, /connect-src https: http:\/\/localhost:3000\/runtime\/(;|$)/);
    assert.doesNotMatch(csp, /evil|javascript|u:p|\?q=|worker-src[^;]*blob:/);
    assert.doesNotMatch(csp, /'unsafe-eval'/);
  });

  it('sandboxResource rechaza comodines, credenciales, consulta y esquemas no web', () => {
    assert.equal(sandboxResource('https://app.test/runtime/'), 'https://app.test/runtime/');
    for (const bad of ['https://*.x.test/', 'data:text/js,1', 'https://a:b@x.test/', 'https://x.test/?a', 'https://x.test/#a', "https://x.test/'none'", 'x.test']) {
      assert.equal(sandboxResource(bad), null, bad);
    }
  });

  it('nunca concede allow-same-origin a un sandbox, aunque se pidan workers', () => {
    assert.equal(frameSandbox({ scripts: true, workers: true, wasm: true, ownOrigin: true }, 'code'), 'allow-scripts');
  });

  it('canal de datos: token y forma, en ambos sentidos', () => {
    assert.equal(isPortalChannelMessage({ nexPortal: 1, token: 'k', type: 'message', data: { a: 1 } }, 'k'), true);
    assert.equal(isPortalChannelMessage({ nexPortal: 1, token: 'k', type: 'message' }, 'k'), false);
    assert.equal(isPortalChannelMessage({ nexPortal: 1, token: 'otro', type: 'message', data: 1 }, 'k'), false);
    assert.equal(isPortalChannelMessage({ nexPortal: 1, token: '', type: 'message', data: 1 }, ''), false);
    assert.deepEqual(portalHostMessage('k', 5), { nexPortal: 1, token: 'k', type: 'host', data: 5 });
    const doc = sandboxDocument({ token: 'k' });
    assert.match(doc, /e\.source !== parent/);
    assert.match(doc, /Object\.defineProperty\(window, 'nexPortal'/);
  });
});
