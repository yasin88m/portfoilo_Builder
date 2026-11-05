import { Buffer } from 'node:buffer';
import { httpServerHandler } from 'cloudflare:node';
import { DurableObject } from 'cloudflare:workers';
import { createPortfolioServer } from './portfolio-server.mjs';

export class PortfolioAuth extends DurableObject {
 constructor(ctx, env) {
  super(ctx, env);
  this.sql = ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS auth (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires INTEGER NOT NULL)');
 }
 get(key) {
  const row = this.sql.exec('SELECT value FROM auth WHERE key = ? AND expires > ?', key, Date.now()).toArray()[0];
  return row ? JSON.parse(row.value) : null;
 }
 put(key, value) {
  this.sql.exec('DELETE FROM auth WHERE expires <= ?', Date.now());
  this.sql.exec('INSERT OR REPLACE INTO auth VALUES (?, ?, ?)', key, JSON.stringify(value), value.expires);
 }
 remove(key) {
  this.sql.exec('DELETE FROM auth WHERE key = ?', key);
 }
 take(key) {
  const value = this.get(key);
  this.remove(key);
  return value;
 }
}

const port = 8080;
let handler;
export default {
 fetch(request, env, ctx) {
  if (!handler) {
   const origin = env.APP_ORIGIN || new URL(request.url).origin;
   const auth = () => env.PORTFOLIO_AUTH.get(env.PORTFOLIO_AUTH.idFromName('auth'));
   const server = createPortfolioServer({
    env, origin,
    authStore: {
     get: key => auth().get(key),
     put: (key, value) => auth().put(key, value),
     remove: key => auth().remove(key),
     take: key => auth().take(key)
    },
    async loadAsset(file) {
     const response = await env.ASSETS.fetch(new URL('/' + file, origin));
     if (!response.ok) throw Error('فایل برنامه در دسترس نیست.');
     return Buffer.from(await response.arrayBuffer());
    }
   });
   server.listen(port);
   handler = httpServerHandler({port});
  }
  return handler.fetch(request, env, ctx);
 }
};
