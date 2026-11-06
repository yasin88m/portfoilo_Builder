import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import { createPortfolioServer } from '../portfolio-server.mjs';

test('admin pages and data require a separate, revocable admin session', async t => {
 const password = randomBytes(24).toString('hex');
 const origin = 'https://portfolio.example';
 const server = createPortfolioServer({ env: { ADMIN_PASSWORD: password }, origin });
 server.listen(0, '127.0.0.1');
 await once(server, 'listening');
 t.after(() => server.close());
 const request = (path, options) => fetch('http://127.0.0.1:' + server.address().port + path, {
  redirect: 'manual', ...options
 });
 const post = (path, body, headers) => request(path, { method: 'POST', body, headers: { origin, ...headers } });
 const api = '/api/admin/overview';
 const login = password => new URLSearchParams({ username: 'admin', password });

 const page = await request('/admin');
 assert.match(await page.text(), /name="password"/);
 assert.equal((await request('/admin.js')).status, 401);
 assert.equal((await request(api, { headers: { cookie: 'pb_account=' + 'a'.repeat(64) } })).status, 401);
 assert.equal((await post('/admin/login', login('wrong'))).status, 401);
 assert.equal((await post('/admin/login', login(password), { origin: 'https://untrusted.example' })).status, 403);
 const accepted = await post('/admin/login', login(password));
 assert.equal(accepted.status, 303);
 const session = accepted.headers.get('set-cookie');
 assert.match(session, /HttpOnly; SameSite=Lax; Max-Age=28800; Secure/);
 const headers = { cookie: session.split(';')[0] };
 const dashboard = await request('/admin', { headers });
 assert.equal(dashboard.headers.get('cache-control'), 'no-store');
 assert.match(await dashboard.text(), /خروج از پنل/);
 assert.equal((await request('/admin.js', { headers })).status, 200);
 assert.equal((await request(api, { headers })).status, 200);
 assert.equal((await post('/admin/logout', null, headers)).status, 303);
 assert.equal((await request(api, { headers })).status, 401);
});

test('admin routes fail closed when credentials are missing', async t => {
 const server = createPortfolioServer({ env: {}, origin: 'http://localhost' });
 server.listen(0, '127.0.0.1');
 await once(server, 'listening');
 t.after(() => server.close());
 const base = 'http://127.0.0.1:' + server.address().port;
 for (const path of ['/admin', '/admin.js', '/api/admin/overview']) {
  assert.equal((await fetch(base + path)).status, 503);
 }
});
