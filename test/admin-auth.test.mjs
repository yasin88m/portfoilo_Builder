import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import { createPortfolioServer } from '../portfolio-server.mjs';

test('only the administrator signing in through the regular account flow can see the dashboard', async t => {
 const password = randomBytes(24).toString('hex');
 const origin = 'https://portfolio.example';
 const server = createPortfolioServer({ env: { ADMIN_PASSWORD: password }, origin });
 server.listen(0, '127.0.0.1');
 await once(server, 'listening');
 t.after(() => server.close());
 const request = (path, options) => fetch('http://127.0.0.1:' + server.address().port + path, {
  redirect: 'manual', ...options
 });
 const post = (path, input, headers) => request(path, {
  method: 'POST', body: JSON.stringify(input), headers: { origin, ...headers }
 });
 const api = '/api/admin/overview';
 const login = (name, pass) => post('/api/account/login', { login: name, password: pass });
 const register = name => post('/api/account/register', { login: name, password });
 const sessionHeaders = res => ({ cookie: res.headers.get('set-cookie').split(';')[0] });

 const page = await request('/admin');
 assert.equal(page.status, 403);
 const html = await page.text();
 assert.match(html, /دسترسی شما به این صفحه مجاز نمی‌باشد/);
 assert.doesNotMatch(html, /admin\.js|name="password"|id="refresh"/);
 assert.equal((await request('/admin.js')).status, 403);
 assert.equal((await request('/admin/')).status, 403);
 assert.equal((await register('admin')).status, 409);
 const visitor = await register('visitor');
 assert.equal(visitor.status, 200);
 assert.equal((await request('/admin', { headers: sessionHeaders(visitor) })).status, 403);
 assert.equal((await request(api, { headers: sessionHeaders(visitor) })).status, 403);
 assert.equal((await login('admin', 'incorrect-password')).status, 401);
 const accepted = await login('admin', password);
 assert.equal(accepted.status, 200);
 assert.equal((await accepted.json()).admin, true);
 assert.match(accepted.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=28800; Secure/);
 const headers = sessionHeaders(accepted);
 const dashboard = await request('/admin', { headers });
 assert.equal(dashboard.headers.get('cache-control'), 'no-store');
 assert.match(await dashboard.text(), /خروج از پنل/);
 assert.equal((await request('/admin.js', { headers })).status, 200);
 assert.equal((await request(api, { headers })).status, 200);
 assert.equal((await post('/api/account/logout', {}, headers)).status, 200);
 assert.equal((await request(api, { headers })).status, 403);
});

test('admin routes fail closed when credentials are missing', async t => {
 const server = createPortfolioServer({ env: {}, origin: 'http://localhost' });
 server.listen(0, '127.0.0.1');
 await once(server, 'listening');
 t.after(() => server.close());
 const base = 'http://127.0.0.1:' + server.address().port;
 for (const path of ['/admin', '/admin.js', '/api/admin/overview']) {
  assert.equal((await fetch(base + path)).status, 403);
 }
});
