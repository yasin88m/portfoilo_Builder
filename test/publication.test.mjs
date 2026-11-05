import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

test('publishing creates a stable public snapshot independent of drafts', async t => {
 const origin = 'https://portfolio.example';
 Object.assign(process.env, {
  APP_ORIGIN: origin,
  GITHUB_CLIENT_ID: 'test-client',
  GITHUB_CLIENT_SECRET: 'test-secret',
  SESSION_SECRET: 'test-session-secret-with-more-than-32-characters',
  GITHUB_DATA_REPO: 'test/private',
  GITHUB_DATA_TOKEN: 'test-token'
 });
 const files = new Map();
 const realFetch = globalThis.fetch;
 t.mock.method(globalThis,'fetch',async (url, options = {}) => {
  const target = new URL(url);
  const reply = (data, status = 200) => Response.json(data,{status});
  if (target.hostname === 'github.com' && target.pathname === '/login/oauth/access_token') return reply({access_token:'oauth-token'});
  assert.equal(target.hostname,'api.github.com');
  const path = target.pathname;
  if (path === '/user') return reply({id:42,login:'designer'});
  if (path === '/repos/test/private') return reply({private:true});
  assert.match(path,/^\/repos\/test\/private\/contents\/(published\/42\.json|portfolios\/42\/profile\.json)$/);
  const current = files.get(path);
  if (options.method !== 'PUT') return current ? reply(current) : reply({},404);
  const input = JSON.parse(options.body);
  if ((current?.sha ?? null) !== (input.sha ?? null)) return reply({},409);
  const sha = createHash('sha1').update(input.content).digest('hex');
  files.set(path,{sha,content:input.content});
  return reply({content:{sha}});
 });

 const {server} = await import('../server.mjs');
 await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
 t.after(() => new Promise(resolve => server.close(resolve)));
 const base = 'http://127.0.0.1:' + server.address().port;
 const login = await realFetch(base + '/auth/login',{redirect:'manual'});
 const state = new URL(login.headers.get('location')).searchParams.get('state');
 const callback = await realFetch(base + '/auth/callback?code=test&state=' + state,{
  redirect:'manual',headers:{cookie:'pb_state=' + state}
 });
 const cookie = callback.headers.getSetCookie().find(value => value.startsWith('pb_session=')).split(';')[0];
 const request = (path, method, payload) => realFetch(base + path,{
  method,headers:{cookie,origin,'Content-Type':'application/json'},body:JSON.stringify(payload)
 });
 const portfolio = {name:'سارا',title:'طراح',field:'طراحی',bio:'نسخه نخست'};
 assert.equal((await realFetch(base + '/api/publication')).status,401);
 assert.equal((await realFetch(base + '/p/42')).status,404);
 assert.equal((await realFetch(base + '/api/publication',{method:'PUT',headers:{cookie},body:'{}'})).status,403);

 const first = await request('/api/publication','PUT',{portfolio,sha:null});
 assert.equal(first.status,200);
 const published = await first.json();
 assert.equal(published.url,origin + '/p/42');
 assert.match(await (await realFetch(base + '/p/42')).text(),/نسخه نخست/);

 const draft = {...portfolio,bio:'پیش‌نویس تازه'};
 assert.equal((await request('/api/portfolio','PUT',{portfolio:draft,sha:null})).status,200);
 assert.doesNotMatch(await (await realFetch(base + '/p/42')).text(),/پیش‌نویس تازه/);
 assert.equal((await request('/api/publication','PUT',{portfolio:draft,sha:null})).status,409);
 const update = await request('/api/publication','PUT',{portfolio:draft,sha:published.sha});
 assert.equal(update.status,200);
 const next = await update.json();
 assert.equal(next.url,published.url);
 assert.match(await (await realFetch(base + '/p/42')).text(),/پیش‌نویس تازه/);
 assert.equal((await realFetch(base + '/p/42',{method:'HEAD'})).status,200);

 const removal = await request('/api/publication','DELETE',{sha:next.sha});
 assert.equal(removal.status,200);
 assert.equal((await realFetch(base + '/p/42')).status,404);
 const restored = await request('/api/publication','PUT',{portfolio,sha:(await removal.json()).sha});
 assert.equal(restored.status,200);
 assert.equal((await restored.json()).url,published.url);
});
