import { randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { httpServerHandler } from 'cloudflare:node';
import { DurableObject } from 'cloudflare:workers';
import { passwordHash } from './accounts.mjs';
import { createPortfolioServer } from './portfolio-server.mjs';

export class PortfolioAuth extends DurableObject {
 constructor(ctx, env) {
  super(ctx, env);
  this.storage = ctx.storage;
  this.sql = ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS auth (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires INTEGER NOT NULL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, revision TEXT NOT NULL, summary TEXT)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS record_chunks (key TEXT NOT NULL, part INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY (key, part))');
 }
 async hashPassword(password, salt) {
  return new Uint8Array(await passwordHash(password, salt));
 }
 allowAttempt(key) {
  const count = (this.get(key)?.count || 0) + 1;
  if (count > 20) return false;
  this.put(key, { count, expires: Date.now() + 300000 });
  return true;
 }
 readRecord(key) {
  const row = this.sql.exec('SELECT revision, summary FROM records WHERE key = ?', key).toArray()[0];
  if (!row) return null;
  const parts = this.sql.exec('SELECT value FROM record_chunks WHERE key = ? ORDER BY part', key).toArray();
  return { revision: row.revision, summary: JSON.parse(row.summary), value: JSON.parse(parts.map(part => part.value).join('')) };
 }
 writeRecord(key, value, expected, summary) {
  return this.storage.transactionSync(() => {
   const row = this.sql.exec('SELECT revision FROM records WHERE key = ?', key).toArray()[0];
   if ((row?.revision ?? null) !== expected) return null;
   const revision = randomBytes(16).toString('hex');
   const payload = JSON.stringify(value);
   this.sql.exec('INSERT OR REPLACE INTO records VALUES (?, ?, ?)', key, revision, JSON.stringify(summary));
   this.sql.exec('DELETE FROM record_chunks WHERE key = ?', key);
   const parts = Array.from(payload.matchAll(/[\s\S]{1,400000}/gu), match => match[0]);
   parts.forEach((part, i) => this.sql.exec('INSERT INTO record_chunks VALUES (?, ?, ?)', key, i, part));
   return revision;
  });
 }
 listRecords(prefix) {
  return this.sql.exec('SELECT summary FROM records WHERE key >= ? AND key < ? AND summary != ?', prefix, prefix + '~', 'null').toArray().map(row => JSON.parse(row.summary));
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
   const recordStore = key => env.PORTFOLIO_AUTH.get(env.PORTFOLIO_AUTH.idFromName(key.split(':').slice(0, 2).join(':')));
   const server = createPortfolioServer({
    records: {
     hashPassword: (password, salt) => recordStore('password:' + salt).hashPassword(password, salt),
     read: key => recordStore(key).readRecord(key),
     write: (key, value, revision, summary = null) => recordStore(key).writeRecord(key, value, revision, summary),
     list: prefix => recordStore(prefix).listRecords(prefix)
    },
    env, origin,
    authStore: {
     allowAttempt: key => recordStore(key).allowAttempt(key),
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
