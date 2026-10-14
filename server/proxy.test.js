import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.js';
import { sameOrigin } from './auth.js';

const proxy = config({ mode: 'development' }).server.proxy['/api'];
function check(origin, host, site = 'same-origin') {
  const req = { get: key => ({ origin, host, 'sec-fetch-site': site })[key] };
  const res = { code: 200, status(code) { this.code = code; return this; }, json() {} };
  let allowed = false;
  sameOrigin(req, res, () => { allowed = true; });
  return { allowed, code: res.code };
}
test('Vite preserves frontend Host for authentication origin validation', () => {
  assert.equal(proxy.changeOrigin, false);
  assert.match(proxy.target, /^http:\/\/127\.0\.0\.1:\d+$/);
  for (const host of ['127.0.0.1:5173', 'localhost:5173']) {
    const forwardedHost = proxy.changeOrigin ? new URL(proxy.target).host : host;
    assert.deepEqual(check(`http://${host}`, forwardedHost), { allowed: true, code: 200 });
  }
});
test('foreign origins and cross-site requests remain blocked behind the proxy', () => {
  assert.equal(check('https://attacker.example', '127.0.0.1:5173').code, 403);
  assert.equal(check('http://127.0.0.1:5173', '127.0.0.1:5173', 'cross-site').code, 403);
});
